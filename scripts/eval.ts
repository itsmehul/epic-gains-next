import "dotenv/config";

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import inquirer from "inquirer";

import { loadExerciseEvalCases } from "../evals/load-exercise-cases";
import {
  assertMcpUrl,
  connectClient,
  DEFAULT_MCP_URL,
  DEFAULT_MODEL,
  formatError,
  openRouterApiKey,
  logToolCalls,
  promptForTask,
  runDirectProbes,
  runLlmTrial,
  TASK_EVAL_SPEC,
  TASK_IDS,
  type TaskId,
} from "../evals/mcp/trial";
import { extractJsonValue } from "../evals/parse-model-json";
import { scoreImportOutput } from "../evals/score-import";
import { scoreMcpTrial } from "../evals/score-mcp";
import { generateYoutubeImportPrompt } from "../src/features/workouts/import-prompt";

type Suite = "mcp" | "import" | "all";

const SUITES: Suite[] = ["mcp", "import", "all"];

function printHelp() {
  console.log(`Usage: pnpm ai:eval -- [options]

Options:
  --suite <id>             mcp | import | all
  --url <url>              MCP server URL (env MCP_URL)
  --api-key <key>          MCP API key (env MCP_API_KEY)
  --model <id>             OpenRouter Gemini model (env GEMINI_MODEL)
  --username <name>        Friend username for compare_1v1 (default nitin)
  --task <id>              MCP task or import case id (alias: --case)
  --case <id>              Same as --task
  --save-actual            Write model JSON under evals/ground-truths/exercises/actual/
  -h, --help               Show this help

Missing values are prompted interactively.
`);
}

function parseCli() {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== "--"),
    options: {
      suite: { type: "string" },
      url: { type: "string" },
      "api-key": { type: "string" },
      model: { type: "string" },
      username: { type: "string" },
      task: { type: "string" },
      case: { type: "string" },
      "save-actual": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    strict: true,
    allowPositionals: false,
  });
  return values;
}

function parseSuite(value: string | undefined): Suite | undefined {
  if (!value) return undefined;
  if (!SUITES.includes(value as Suite)) {
    throw new Error(`Invalid --suite ${value}. Expected ${SUITES.join(" | ")}`);
  }
  return value as Suite;
}

const generationConfig = {
  maxOutputTokens: 65536,
  topP: 0.95,
  thinkingEffort: "medium" as const,
};

async function runImportSuite(input: {
  model: string;
  caseId?: string;
  saveActual: boolean;
}): Promise<boolean> {
  const cases = loadExerciseEvalCases().filter(
    (item) => !input.caseId || item.id === input.caseId,
  );
  if (cases.length === 0) {
    if (input.caseId) {
      console.log(`skip import (no case ${input.caseId})`);
      return true;
    }
    throw new Error(
      "No import cases in evals/ground-truths/exercises/cases.json",
    );
  }

  const openrouter = createOpenRouter({ apiKey: openRouterApiKey() });
  let passed = 0;

  for (const item of cases) {
    console.log(`\n== import ${item.id} ==`);
    if (item.notes) console.log(item.notes);
    console.log(item.url);

    const prompt = generateYoutubeImportPrompt(item.url);
    const started = performance.now();
    const result = await generateText({
      model: openrouter(input.model),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "file", data: item.url, mediaType: "video/mp4" },
          ],
        },
      ],
      maxOutputTokens: generationConfig.maxOutputTokens,
      topP: generationConfig.topP,
      providerOptions: {
        openrouter: {
          reasoning: {
            effort: generationConfig.thinkingEffort,
          },
        },
      },
    });
    const ms = Math.round(performance.now() - started);
    const score = scoreImportOutput({
      text: result.text,
      expected: item.expected,
    });

    if (input.saveActual) {
      const dir = path.join(
        process.cwd(),
        "evals/ground-truths/exercises/actual",
      );
      mkdirSync(dir, { recursive: true });
      try {
        const json = extractJsonValue(result.text);
        writeFileSync(
          path.join(dir, `${item.id}.json`),
          `${JSON.stringify(json, null, 2)}\n`,
        );
      } catch {
        writeFileSync(path.join(dir, `${item.id}.txt`), result.text);
      }
    }

    console.log(
      `${score.pass ? "PASS" : "FAIL"}  ${ms}ms  ${score.checks.map((check) => `${check.id}:${check.pass ? "ok" : "fail"}`).join("  ")}`,
    );
    for (const check of score.checks.filter((row) => !row.pass)) {
      console.log(`  - ${check.id}: ${check.detail}`);
    }
    if (score.pass) passed += 1;
  }

  console.log(`\nimport ${passed}/${cases.length} passed`);
  return passed === cases.length;
}

async function runMcpSuite(input: {
  url: string;
  apiKey: string;
  model: string;
  username: string;
  caseId?: string;
}): Promise<boolean> {
  const tasks = TASK_IDS.filter(
    (task) => !input.caseId || task === input.caseId,
  ) as TaskId[];
  if (tasks.length === 0) {
    if (input.caseId) {
      console.log(`skip mcp (no case ${input.caseId})`);
      return true;
    }
    throw new Error("No MCP cases");
  }

  let client: Awaited<ReturnType<typeof connectClient>> | undefined;
  let passed = 0;
  try {
    client = await connectClient({
      url: assertMcpUrl(input.url),
      apiKey: input.apiKey,
    });
    const probes = await runDirectProbes(client);
    console.log(
      `MCP tools=${probes.toolCount}  list_workouts=${probes.listWorkoutsOk ? "ok" : "error"}`,
    );

    for (const task of tasks) {
      console.log(`\n== mcp ${task} ==`);
      const llm = await runLlmTrial({
        client,
        tools: probes.tools,
        model: input.model,
        task,
        prompt: promptForTask(task, input.username),
        maxSteps: 8,
      });
      logToolCalls(llm.rawSteps);
      const score = scoreMcpTrial({
        spec: TASK_EVAL_SPEC[task],
        toolCalls: llm.toolCalls,
        toolCallsByStep: llm.toolCallsByStep,
        toolErrorCount: llm.toolErrorCount,
        text: llm.text,
      });
      console.log(
        `${score.pass ? "PASS" : "FAIL"}  ${llm.ms}ms  tools=[${llm.toolCalls.join(", ")}]`,
      );
      for (const check of score.checks.filter((row) => !row.pass)) {
        console.log(`  - ${check.id}: ${check.detail}`);
      }
      if (score.pass) passed += 1;
    }
  } finally {
    await client?.close();
  }

  console.log(`\nmcp ${passed}/${tasks.length} passed`);
  return passed === tasks.length;
}

async function main() {
  const cli = parseCli();
  if (cli.help) {
    printHelp();
    return;
  }

  const fromCli = {
    suite: parseSuite(cli.suite?.trim()),
    url: cli.url?.trim() || process.env.MCP_URL?.trim(),
    apiKey: cli["api-key"]?.trim() || process.env.MCP_API_KEY?.trim(),
    model: cli.model?.trim() || process.env.GEMINI_MODEL?.trim(),
    username: cli.username?.trim(),
    caseId: cli.task?.trim() || cli.case?.trim(),
    saveActual: cli["save-actual"] === true,
  };

  const prompted = await inquirer.prompt<{
    suite?: Suite;
    url?: string;
    apiKey?: string;
    model?: string;
    username?: string;
  }>([
    {
      type: "select",
      name: "suite",
      message: "Eval suite",
      when: () => !fromCli.suite,
      default: "all",
      choices: [
        { name: "MCP tool-use (test-mcp tasks)", value: "mcp" },
        { name: "YouTube import vs exercise ground truths", value: "import" },
        { name: "Both", value: "all" },
      ],
    },
    {
      type: "input",
      name: "model",
      message: "OpenRouter Gemini model",
      when: () => !fromCli.model,
      default: DEFAULT_MODEL,
    },
    {
      type: "input",
      name: "url",
      message: "MCP URL",
      when: (answers) => {
        const suite = fromCli.suite ?? answers.suite;
        return (suite === "mcp" || suite === "all") && !fromCli.url;
      },
      default: DEFAULT_MCP_URL,
      validate: (value: string) => {
        try {
          assertMcpUrl(value);
          return true;
        } catch (error) {
          return formatError(error);
        }
      },
    },
    {
      type: "password",
      name: "apiKey",
      message: "MCP API key (epic_…)",
      mask: "*",
      when: (answers) => {
        const suite = fromCli.suite ?? answers.suite;
        return (suite === "mcp" || suite === "all") && !fromCli.apiKey;
      },
      validate: (value: string) =>
        value.trim().length > 0 || "MCP API key is required",
    },
    {
      type: "input",
      name: "username",
      message: "Friend username (1v1)",
      when: (answers) => {
        const suite = fromCli.suite ?? answers.suite;
        return (suite === "mcp" || suite === "all") && !fromCli.username;
      },
      default: "nitin",
    },
  ]);

  const suite = fromCli.suite ?? prompted.suite!;
  const model = (fromCli.model ?? prompted.model ?? DEFAULT_MODEL).trim();
  const results: boolean[] = [];

  if (suite === "import" || suite === "all") {
    results.push(
      await runImportSuite({
        model,
        caseId: fromCli.caseId,
        saveActual: fromCli.saveActual,
      }),
    );
  }

  if (suite === "mcp" || suite === "all") {
    results.push(
      await runMcpSuite({
        url: fromCli.url ?? prompted.url!,
        apiKey: (fromCli.apiKey ?? prompted.apiKey!).trim(),
        model,
        username: (fromCli.username ?? prompted.username ?? "nitin").trim(),
        caseId: fromCli.caseId,
      }),
    );
  }

  if (results.some((ok) => !ok)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
