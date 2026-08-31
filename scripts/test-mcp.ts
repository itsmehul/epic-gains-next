import "dotenv/config";

import { parseArgs } from "node:util";

import inquirer from "inquirer";

import {
  assertMcpUrl,
  connectClient,
  DEFAULT_MCP_URL,
  DEFAULT_MODEL,
  formatError,
  logToolCalls,
  parseTaskId,
  promptForTask,
  runDirectProbes,
  runLlmTrial,
  TASK_EVAL_SPEC,
  type TaskId,
} from "../evals/mcp/trial";
import { scoreMcpTrial } from "../evals/score-mcp";

function printHelp() {
  console.log(`Usage: pnpm ai:test-mcp -- [options]

Options:
  --url <url>              MCP server URL (env MCP_URL)
  --api-key <key>          MCP API key (env MCP_API_KEY)
  --model <id>             OpenRouter Gemini model (env GEMINI_MODEL)
  --task <id>              check_performance | check_friends | compare_1v1 | compare_1v_all | friends_progress | trainer
  --username <name>        Friend username for compare_1v1 (default nitin)
  -h, --help               Show this help

Missing values are prompted interactively.
`);
}

function parseCli() {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== "--"),
    options: {
      url: { type: "string" },
      "api-key": { type: "string" },
      model: { type: "string" },
      task: { type: "string" },
      username: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    strict: true,
    allowPositionals: false,
  });
  return values;
}

async function main() {
  const cli = parseCli();
  if (cli.help) {
    printHelp();
    return;
  }

  const fromCli = {
    url: cli.url?.trim() || process.env.MCP_URL?.trim(),
    apiKey: cli["api-key"]?.trim() || process.env.MCP_API_KEY?.trim(),
    model: cli.model?.trim() || process.env.GEMINI_MODEL?.trim(),
    task: parseTaskId(cli.task?.trim()),
    username: cli.username?.trim(),
  };

  const prompted = await inquirer.prompt<{
    url?: string;
    apiKey?: string;
    model?: string;
    task?: TaskId;
    username?: string;
  }>([
    {
      type: "input",
      name: "url",
      message: "MCP URL",
      when: () => !fromCli.url,
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
      when: () => !fromCli.apiKey,
      validate: (value: string) =>
        value.trim().length > 0 || "MCP API key is required",
    },
    {
      type: "input",
      name: "model",
      message: "OpenRouter Gemini model",
      when: () => !fromCli.model,
      default: DEFAULT_MODEL,
    },
    {
      type: "select",
      name: "task",
      message: "What should the model do?",
      when: () => !fromCli.task,
      default: "check_performance",
      choices: [
        {
          name: "Check performance (progress summary)",
          value: "check_performance",
        },
        {
          name: "Check friends (following recap)",
          value: "check_friends",
        },
        {
          name: "1v1 comparison (me vs friend)",
          value: "compare_1v1",
        },
        {
          name: "1v all comparison",
          value: "compare_1v_all",
        },
        {
          name: "Friends progress report",
          value: "friends_progress",
        },
        {
          name: "Trainer report (athletes recap)",
          value: "trainer",
        },
      ],
    },
    {
      type: "input",
      name: "username",
      message: "Friend username",
      when: (answers) => {
        const task = fromCli.task ?? answers.task;
        return task === "compare_1v1" && !fromCli.username;
      },
      default: "nitin",
    },
  ]);

  const url = fromCli.url ?? prompted.url!;
  const apiKey = fromCli.apiKey ?? prompted.apiKey!;
  const model = fromCli.model ?? prompted.model ?? DEFAULT_MODEL;
  const task = fromCli.task ?? prompted.task!;
  const username = (fromCli.username ?? prompted.username ?? "nitin").trim();
  const prompt = promptForTask(task, username);
  const maxSteps = 8;

  let client: Awaited<ReturnType<typeof connectClient>> | undefined;
  try {
    const connectStarted = performance.now();
    client = await connectClient({
      url: assertMcpUrl(url),
      apiKey: apiKey.trim(),
    });
    const connectMs = Math.round(performance.now() - connectStarted);
    console.log(
      `connected in ${connectMs}ms  server=${client.serverInfo.name}@${client.serverInfo.version}`,
    );

    const probes = await runDirectProbes(client);
    console.log(
      `listTools ${probes.listMs}ms  tools=${probes.toolCount} (model=${probes.modelVisibleCount} app=${probes.appVisibleCount})`,
    );
    console.log(
      `list_workouts ${probes.callMs}ms  ${probes.listWorkoutsOk ? "ok" : "error"}  ${probes.listWorkoutsPreview}`,
    );

    const llm = await runLlmTrial({
      client,
      tools: probes.tools,
      model: model.trim() || DEFAULT_MODEL,
      task,
      prompt,
      maxSteps,
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
      `${score.pass ? "PASS" : "FAIL"}  generateText ${llm.ms}ms  steps=${llm.steps}  tools=[${llm.toolCalls.join(", ")}]  toolErrors=${llm.toolErrorCount}`,
    );
    for (const check of score.checks.filter((row) => !row.pass)) {
      console.log(`  - ${check.id}: ${check.detail}`);
    }
    console.log("\n--- response ---\n");
    console.log(llm.text);
    if (llm.usage) {
      console.log("\n--- usage ---");
      console.log(llm.usage);
    }
    if (!score.pass) process.exitCode = 1;
  } finally {
    await client?.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
