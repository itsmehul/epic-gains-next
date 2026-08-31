import "dotenv/config";

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

import inquirer from "inquirer";
import { Client } from "langsmith";
import { evaluate } from "langsmith/evaluation";

import {
  AGENT_EVAL_DATASET,
  AGENT_EVAL_PROJECT,
  LANGSMITH_API_URL,
  loadAgentEvalCases,
  langsmithExamples,
  type AgentEvalCase,
} from "../evals/agent/cases";
import {
  scoreEscalation,
  scoreGroundedness,
  scoreSafety,
  type AgentEvalOutputs,
  type AgentEvalReference,
} from "../evals/agent/score-agent";
import { runAgentEvalTrial } from "../evals/agent/trial";
import { DEFAULT_MODEL } from "../evals/mcp/trial";

const API_URL = process.env.LANGSMITH_ENDPOINT?.trim() || LANGSMITH_API_URL;
const PROJECT =
  process.env.LANGSMITH_PROJECT?.trim() || AGENT_EVAL_PROJECT;

if (!process.env.LANGSMITH_PROJECT?.trim()) {
  process.env.LANGSMITH_PROJECT = PROJECT;
}
const EVALUATOR_TS = path.join(process.cwd(), "evals/langsmith/evaluators.ts");
const DATASET_FILE = path.join(process.cwd(), "evals/langsmith/dataset.json");

function printHelp() {
  console.log(`Usage: pnpm ai:eval:langsmith -- [options]

Options:
  --setup              Upload dataset + evaluators via LangSmith CLI
  --run                Run the 10-comment experiment
  --api-url <url>      Default ${LANGSMITH_API_URL}
  --project <name>     Tracing project (default ${AGENT_EVAL_PROJECT})
  --model <id>         OpenRouter model
  --task <id>          Single case id
  -h, --help
`);
}

function cli() {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== "--"),
    options: {
      setup: { type: "boolean" },
      run: { type: "boolean" },
      "api-url": { type: "string" },
      project: { type: "string" },
      model: { type: "string" },
      task: { type: "string" },
      case: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    strict: true,
    allowPositionals: false,
  });
  return values;
}

function langsmith(args: string[], apiUrl: string) {
  const result = spawnSync(
    "langsmith",
    ["--api-url", apiUrl, "--format", "json", ...args],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        LANGSMITH_PROJECT: process.env.LANGSMITH_PROJECT?.trim() || PROJECT,
      },
    },
  );
  if (result.status !== 0) {
    throw new Error(
      result.stderr?.trim() ||
        result.stdout?.trim() ||
        `langsmith ${args.join(" ")} failed`,
    );
  }
  return result.stdout.trim();
}

function compileEvaluatorsForUpload() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "langsmith-eval-"));
  const compiled = spawnSync(
    "pnpm",
    [
      "exec",
      "tsc",
      "--pretty",
      "false",
      EVALUATOR_TS,
      "--outDir",
      dir,
      "--module",
      "commonjs",
      "--target",
      "ES2020",
      "--skipLibCheck",
      "--esModuleInterop",
    ],
    { encoding: "utf8" },
  );
  if (compiled.status !== 0) {
    throw new Error(compiled.stderr.trim() || compiled.stdout.trim() || "tsc failed");
  }
  const js = readFileSync(path.join(dir, "evaluators.js"), "utf8");
  const upload = path.join(dir, "evaluators.upload.js");
  writeFileSync(
    upload,
    `var exports = {};\nvar module = { exports: exports };\n${js}`,
  );
  return upload;
}

function writeDatasetFile() {
  const rows = langsmithExamples(loadAgentEvalCases());
  writeFileSync(DATASET_FILE, `${JSON.stringify(rows, null, 2)}\n`);
}

function setupLangsmith(apiUrl: string) {
  if (!process.env.LANGSMITH_API_KEY?.trim()) {
    throw new Error("LANGSMITH_API_KEY is required");
  }

  writeDatasetFile();

  const listed = langsmith(
    ["dataset", "list", "--name-contains", AGENT_EVAL_DATASET],
    apiUrl,
  );
  if (!listed.includes(AGENT_EVAL_DATASET)) {
    langsmith(
      [
        "dataset",
        "upload",
        DATASET_FILE,
        "--name",
        AGENT_EVAL_DATASET,
        "--description",
        "10 trainer-agent comments: form, load, joint, red-flag, coach, video, no lift, deny ping, no trainer, catalog-only muscle",
      ],
      apiUrl,
    );
  }

  const evaluatorFile = compileEvaluatorsForUpload();

  const evaluators = [
    ["groundedness", "score_groundedness"],
    ["safety", "score_safety"],
    ["escalation_correctness", "score_escalation"],
  ] as const;

  for (const [name, fn] of evaluators) {
    langsmith(
      [
        "evaluator",
        "upload",
        evaluatorFile,
        "--name",
        name,
        "--function",
        fn,
        "--dataset",
        AGENT_EVAL_DATASET,
        "--replace",
        "--yes",
      ],
      apiUrl,
    );
    langsmith(
      [
        "evaluator",
        "upload",
        evaluatorFile,
        "--name",
        `${name}-online`,
        "--function",
        `${fn}_online`,
        "--project",
        process.env.LANGSMITH_PROJECT?.trim() || PROJECT,
        "--replace",
        "--yes",
      ],
      apiUrl,
    );
  }

  console.log(
    `Uploaded ${AGENT_EVAL_DATASET} + evaluators on dataset and project "${process.env.LANGSMITH_PROJECT?.trim() || PROJECT}" (${apiUrl})`,
  );
}

function commentForChecks(
  checks: Array<{ id: string; pass: boolean; detail: string }>,
) {
  const failed = checks.filter((row) => !row.pass).map((row) => row.detail);
  return failed.length ? failed.join("; ") : "ok";
}

async function runExperiment(input: { apiUrl: string; model: string; caseId?: string }) {
  if (!process.env.LANGSMITH_API_KEY?.trim()) {
    throw new Error("LANGSMITH_API_KEY is required");
  }

  const cases = loadAgentEvalCases().filter(
    (item) => !input.caseId || item.id === input.caseId,
  );
  if (cases.length === 0) {
    throw new Error(`No agent cases${input.caseId ? ` matching ${input.caseId}` : ""}`);
  }

  const byId = new Map(loadAgentEvalCases().map((item) => [item.id, item]));
  const client = new Client({
    apiUrl: input.apiUrl,
    apiKey: process.env.LANGSMITH_API_KEY,
  });

  const examples = [];
  for await (const example of client.listExamples({
    datasetName: AGENT_EVAL_DATASET,
  })) {
    const id = String(example.inputs?.id ?? "");
    if (!input.caseId || id === input.caseId) examples.push(example);
  }
  if (examples.length === 0) {
    throw new Error(
      `No LangSmith examples in ${AGENT_EVAL_DATASET}${input.caseId ? ` for ${input.caseId}` : ""}. Run with --setup first.`,
    );
  }

  const results = await evaluate(
    async (inputs: AgentEvalCase["inputs"] & { id?: string }) => {
      const item =
        (inputs.id ? byId.get(inputs.id) : undefined) ??
        cases.find((row) => row.inputs.comment === inputs.comment);
      if (!item) throw new Error(`Unknown eval case ${inputs.id ?? inputs.comment}`);
      return runAgentEvalTrial(item, input.model);
    },
    {
      client,
      data: examples,
      experimentPrefix: "trainer-agent-comments",
      maxConcurrency: 2,
      evaluators: [
        async ({
          outputs,
          referenceOutputs,
        }: {
          outputs: AgentEvalOutputs;
          referenceOutputs?: AgentEvalReference;
        }) => {
          const scored = scoreGroundedness({
            outputs,
            reference: referenceOutputs ?? { expectLoopInTrainer: false },
          });
          return {
            key: "groundedness",
            score: scored.score,
            comment: commentForChecks(scored.checks),
          };
        },
        async ({
          outputs,
          referenceOutputs,
        }: {
          outputs: AgentEvalOutputs;
          referenceOutputs?: AgentEvalReference;
        }) => {
          const scored = scoreSafety({
            outputs,
            reference: referenceOutputs ?? { expectLoopInTrainer: false },
          });
          return {
            key: "safety",
            score: scored.score,
            comment: commentForChecks(scored.checks),
          };
        },
        async ({
          outputs,
          referenceOutputs,
        }: {
          outputs: AgentEvalOutputs;
          referenceOutputs?: AgentEvalReference;
        }) => {
          const scored = scoreEscalation({
            outputs,
            reference: referenceOutputs ?? { expectLoopInTrainer: false },
          });
          return {
            key: "escalation_correctness",
            score: scored.score,
            comment: commentForChecks(scored.checks),
          };
        },
      ],
    },
  );

  let collected = results.results ?? [];
  if (collected.length === 0) {
    for await (const row of results) collected.push(row);
  }

  let passed = 0;
  for (const row of collected) {
    const feedback = row.evaluationResults?.results ?? [];
    const keys = feedback.map(
      (item) => `${item.key}:${item.score === 1 ? "ok" : "fail"}`,
    );
    const ok = feedback.length > 0 && feedback.every((item) => item.score === 1);
    if (ok) passed += 1;
    const label = String(row.example.inputs?.id ?? row.run.name ?? "");
    console.log(`${ok ? "PASS" : "FAIL"}  ${label}  ${keys.join("  ")}`);
    if (!ok) {
      for (const item of feedback.filter((row) => row.score !== 1)) {
        if (item.comment) console.log(`  - ${item.key}: ${item.comment}`);
      }
    }
  }
  console.log(`\nagent ${passed}/${collected.length} passed`);
  return collected.length > 0 && passed === collected.length;
}

export async function runAgentLangsmithEval(options?: {
  setup?: boolean;
  run?: boolean;
  apiUrl?: string;
  project?: string;
  model?: string;
  caseId?: string;
}) {
  const parsed = options ?? {};
  if (parsed.project?.trim()) {
    process.env.LANGSMITH_PROJECT = parsed.project.trim();
  }
  const fromFlags = {
    setup: parsed.setup,
    run: parsed.run,
    apiUrl: parsed.apiUrl,
    model: parsed.model,
    caseId: parsed.caseId,
  };

  const prompted = await inquirer.prompt<{
    action?: "setup" | "run" | "both";
    model?: string;
  }>([
    {
      type: "select",
      name: "action",
      message: "LangSmith agent evals",
      when: () => fromFlags.setup == null && fromFlags.run == null,
      default: "both",
      choices: [
        { name: "Setup dataset + evaluators (CLI)", value: "setup" },
        { name: "Run 10-comment experiment", value: "run" },
        { name: "Setup then run", value: "both" },
      ],
    },
    {
      type: "input",
      name: "model",
      message: "OpenRouter model",
      when: (answers) => {
        if (fromFlags.model) return false;
        if (!process.stdin.isTTY) return false;
        const action = fromFlags.run
          ? "run"
          : fromFlags.setup && !fromFlags.run
            ? "setup"
            : answers.action;
        return action !== "setup";
      },
      default: DEFAULT_MODEL,
    },
  ]);

  const action =
    fromFlags.setup && fromFlags.run
      ? "both"
      : fromFlags.setup
        ? "setup"
        : fromFlags.run
          ? "run"
          : prompted.action ?? "both";
  const apiUrl = (fromFlags.apiUrl ?? API_URL).replace(/\/$/, "");
  const model = (fromFlags.model ?? prompted.model ?? DEFAULT_MODEL).trim();

  if (action === "setup" || action === "both") {
    setupLangsmith(apiUrl);
  }
  if (action === "run" || action === "both") {
    const ok = await runExperiment({
      apiUrl,
      model,
      caseId: fromFlags.caseId,
    });
    if (!ok) process.exitCode = 1;
    return ok;
  }
  return true;
}

async function main() {
  const values = cli();
  if (values.help) {
    printHelp();
    return;
  }
  await runAgentLangsmithEval({
    setup: values.setup,
    run: values.run,
    apiUrl: values["api-url"],
    project: values.project,
    model: values.model,
    caseId: values.task ?? values.case,
  });
}

const isCli =
  process.argv[1]?.includes("langsmith-agent-eval") === true;

if (isCli) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
