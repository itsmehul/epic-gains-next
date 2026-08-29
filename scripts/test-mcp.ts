import "dotenv/config";

import { parseArgs } from "node:util";

import { createGoogle } from "@ai-sdk/google";
import {
  createMCPClient,
  mcpAppClientCapabilities,
  splitMCPAppTools,
  type MCPClient,
} from "@ai-sdk/mcp";
import { generateText, stepCountIs } from "ai";
import inquirer from "inquirer";

const DEFAULT_MCP_URL = "http://localhost:3000/api/mcp";
const DEFAULT_MODEL = "gemini-3.7-flash";

type TaskId =
  | "check_performance"
  | "check_friends"
  | "compare_1v1"
  | "compare_1v_all"
  | "friends_progress";

const TASK_IDS: TaskId[] = [
  "check_performance",
  "check_friends",
  "compare_1v1",
  "compare_1v_all",
  "friends_progress",
];

function printHelp() {
  console.log(`Usage: pnpm ai:test-mcp -- [options]

Options:
  --url <url>              MCP server URL (env MCP_URL)
  --api-key <key>          MCP API key (env MCP_API_KEY)
  --model <id>             Gemini model (env GEMINI_MODEL)
  --task <id>              check_performance | check_friends | compare_1v1 | compare_1v_all | friends_progress
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

function parseTaskId(value: string | undefined): TaskId | undefined {
  if (!value) {
    return undefined;
  }
  if (!TASK_IDS.includes(value as TaskId)) {
    throw new Error(
      `Invalid --task ${value}. Expected ${TASK_IDS.join(" | ")}`,
    );
  }
  return value as TaskId;
}

const TASK_TOOL_NAMES: Record<TaskId, string[]> = {
  check_performance: ["performance_metrics", "list_workouts"],
  check_friends: ["following_performance_metrics"],
  compare_1v1: ["performance_metrics"],
  compare_1v_all: ["performance_metrics", "following_performance_metrics"],
  friends_progress: ["following_performance_metrics"],
};

function performancePrompt(): string {
  return `Use Epic Gains MCP to summarize my training progress.

1. Call performance_metrics with no extra filters (authenticated user).
2. Optionally call list_workouts if you need names for context.
3. Write a short progress summary from tool output only: recent volume, week-over-week change, streak, PRs, and notable session notes. Do not invent metrics.`;
}

function friendsPrompt(): string {
  return `Use Epic Gains MCP to summarize everyone I follow.

1. Call following_performance_metrics once with no extra filters.
2. Do not call list_following, get_social_profile, or performance_metrics.
3. Summarize each returned friend from tool output only: visibility, recent volume, week-over-week change, streak, PRs, and notable notes. Do not invent metrics. If the list is empty or a friend is not visible, say so from the tool output.`;
}

function yesterdayIso(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function compare1v1Prompt(username: string): string {
  const date = yesterdayIso();
  return `Compare my training to a friend 1v1, use Epic Gains.

Follow the 1v1 skill exactly.
1. Call performance_metrics twice in the same turn with date="${date}": once with no username (me), once with username="${username}".
2. Do not call get_social_profile, list_following, following_performance_metrics, or performance_data.
3. Write the 1v1 Comparison template from tool output only. Do not invent metrics.`;
}

function compare1vAllPrompt(): string {
  const date = yesterdayIso();
  return `Compare me against all my friends, use Epic Gains.

Follow the 1v all skill exactly.
1. In the same turn, call performance_metrics with date="${date}" and no username, and following_performance_metrics once with the same date.
2. Do not loop performance_metrics per friend. Do not call list_following or get_social_profile.
3. Write the 1v All Comparison template from tool output only. Do not invent metrics.`;
}

function friendsProgressPrompt(): string {
  const date = yesterdayIso();
  return `Give me a progress report of all my friends, use Epic Gains.

Follow the friends progress skill exactly.
1. Call following_performance_metrics once with date="${date}".
2. Do not call list_following, get_social_profile, or performance_metrics.
3. Write the Friends Progress Report template from tool output only. Do not invent metrics.`;
}

function promptForTask(task: TaskId, username: string): string {
  if (task === "check_friends") return friendsPrompt();
  if (task === "compare_1v1") return compare1v1Prompt(username);
  if (task === "compare_1v_all") return compare1vAllPrompt();
  if (task === "friends_progress") return friendsProgressPrompt();
  return performancePrompt();
}

function geminiApiKey(): string {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env and retry.",
    );
  }
  return apiKey;
}

function formatError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  const seen = new Set<unknown>();
  while (current && !seen.has(current)) {
    seen.add(current);
    if (current instanceof Error) {
      parts.push(current.message);
      current = current.cause;
      continue;
    }
    parts.push(String(current));
    break;
  }
  return parts.filter(Boolean).join(" — ");
}

function assertMcpUrl(url: string): string {
  const trimmed = url.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid MCP URL: ${trimmed}`);
  }
  if (
    parsed.protocol === "https:" &&
    (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
  ) {
    throw new Error(
      `MCP URL uses https on ${parsed.hostname}, but next dev serves http. Use ${trimmed.replace(/^https:/, "http:")}`,
    );
  }
  return trimmed;
}

async function connectClient(input: {
  url: string;
  apiKey: string;
}): Promise<MCPClient> {
  return createMCPClient({
    transport: {
      type: "http",
      url: input.url,
      headers: { Authorization: `Bearer ${input.apiKey}` },
    },
    clientName: "epic-gains-mcp-reliability",
    capabilities: mcpAppClientCapabilities,
  });
}

function summarizeCallToolResult(result: unknown): {
  ok: boolean;
  preview: string;
} {
  const record =
    typeof result === "object" && result !== null
      ? (result as Record<string, unknown>)
      : {};
  const parts = Array.isArray(record.content) ? record.content : [];
  const text = parts
    .filter(
      (part): part is { type: string; text: string } =>
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string",
    )
    .map((part) => part.text)
    .join("\n");
  const preview = text.slice(0, 180).replace(/\s+/g, " ");
  return {
    ok: record.isError !== true,
    preview: preview || "(empty)",
  };
}

async function runDirectProbes(client: MCPClient) {
  const listStarted = performance.now();
  const definitions = await client.listTools();
  const listMs = Math.round(performance.now() - listStarted);
  const { modelVisible, appVisible } = splitMCPAppTools(definitions);
  const tools = client.toolsFromDefinitions(modelVisible);

  const callStarted = performance.now();
  const listWorkouts = await client.callTool({
    name: "list_workouts",
    arguments: {},
  });
  const callMs = Math.round(performance.now() - callStarted);
  const summary = summarizeCallToolResult(listWorkouts);

  return {
    listMs,
    callMs,
    toolCount: definitions.tools.length,
    modelVisibleCount: modelVisible.tools.length,
    appVisibleCount: appVisible.tools.length,
    listWorkoutsOk: summary.ok,
    listWorkoutsPreview: summary.preview,
    tools,
  };
}

function pickTools<T extends Record<string, unknown>>(
  tools: T,
  names: string[],
): T {
  return Object.fromEntries(
    names
      .filter((name) => tools[name] !== undefined)
      .map((name) => [name, tools[name]]),
  ) as T;
}

function toolCallInput(call: { input?: unknown }): unknown {
  return call.input;
}

function logToolCalls(
  steps: Array<{
    toolCalls: Array<{ toolName: string; input?: unknown }>;
    toolResults: Array<{ output?: unknown }>;
  }>,
) {
  for (const [stepIndex, step] of steps.entries()) {
    for (const call of step.toolCalls) {
      const input = toolCallInput(call);
      const preview = JSON.stringify(input ?? {}).slice(0, 160);
      console.log(`  step ${stepIndex + 1}  ${call.toolName}  ${preview}`);
    }
  }
}

async function runLlmTrial(input: {
  client: MCPClient;
  tools: Awaited<ReturnType<MCPClient["tools"]>>;
  model: string;
  task: TaskId;
  prompt: string;
  maxSteps: number;
}) {
  const google = createGoogle({ apiKey: geminiApiKey() });
  const started = performance.now();
  const result = await generateText({
    model: google(input.model),
    system: input.client.instructions,
    tools: pickTools(input.tools, TASK_TOOL_NAMES[input.task]),
    stopWhen: stepCountIs(input.maxSteps),
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: input.prompt }],
      },
    ],
  });
  const ms = Math.round(performance.now() - started);

  logToolCalls(result.steps);

  const toolCalls = result.steps.flatMap((step) =>
    step.toolCalls.map((call) => call.toolName),
  );
  const toolErrors = result.steps.flatMap((step) =>
    step.toolResults.filter((toolResult) => {
      const output = toolResult.output as
        | { isError?: boolean }
        | undefined;
      return output?.isError === true;
    }),
  );

  return {
    ms,
    text: result.text,
    steps: result.steps.length,
    toolCalls,
    toolErrorCount: toolErrors.length,
    usage: result.usage,
  };
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
      message: "Gemini model",
      when: () => !fromCli.model,
      default: DEFAULT_MODEL,
    },
    {
      type: "select",
      name: "task",
      message: "What should Gemini do?",
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

  let client: MCPClient | undefined;
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
    console.log(
      `generateText ${llm.ms}ms  steps=${llm.steps}  tools=[${llm.toolCalls.join(", ")}]  toolErrors=${llm.toolErrorCount}`,
    );
    console.log("\n--- response ---\n");
    console.log(llm.text);
    if (llm.usage) {
      console.log("\n--- usage ---");
      console.log(llm.usage);
    }
  } finally {
    await client?.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
