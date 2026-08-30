import { createGoogle } from "@ai-sdk/google";
import {
  createMCPClient,
  mcpAppClientCapabilities,
  splitMCPAppTools,
  type MCPClient,
} from "@ai-sdk/mcp";
import { generateText, stepCountIs } from "ai";

import type { McpEvalSpec } from "../score-mcp";

export const DEFAULT_MCP_URL = "http://localhost:3000/api/mcp";
export const DEFAULT_MODEL = "gemini-3.7-flash";

export type TaskId =
  | "check_performance"
  | "check_friends"
  | "compare_1v1"
  | "compare_1v_all"
  | "friends_progress";

export const TASK_IDS: TaskId[] = [
  "check_performance",
  "check_friends",
  "compare_1v1",
  "compare_1v_all",
  "friends_progress",
];

export const TASK_TOOL_NAMES: Record<TaskId, string[]> = {
  check_performance: ["performance_metrics", "list_workouts"],
  check_friends: ["following_performance_metrics"],
  compare_1v1: ["performance_metrics"],
  compare_1v_all: ["performance_metrics", "following_performance_metrics"],
  friends_progress: ["following_performance_metrics"],
};

export const TASK_EVAL_SPEC: Record<TaskId, McpEvalSpec> = {
  check_performance: {
    requiredTools: ["performance_metrics"],
    forbiddenTools: ["following_performance_metrics"],
  },
  check_friends: {
    requiredTools: ["following_performance_metrics"],
    forbiddenTools: [
      "list_following",
      "get_social_profile",
      "performance_metrics",
    ],
  },
  compare_1v1: {
    requiredTools: ["performance_metrics"],
    forbiddenTools: [
      "get_social_profile",
      "list_following",
      "following_performance_metrics",
      "performance_data",
    ],
    minCallsInOneStep: { performance_metrics: 2 },
  },
  compare_1v_all: {
    requiredTools: ["performance_metrics", "following_performance_metrics"],
    forbiddenTools: ["list_following", "get_social_profile"],
    requireSameTurn: ["performance_metrics", "following_performance_metrics"],
  },
  friends_progress: {
    requiredTools: ["following_performance_metrics"],
    forbiddenTools: [
      "list_following",
      "get_social_profile",
      "performance_metrics",
    ],
  },
};

export function parseTaskId(value: string | undefined): TaskId | undefined {
  if (!value) return undefined;
  if (!TASK_IDS.includes(value as TaskId)) {
    throw new Error(
      `Invalid --task ${value}. Expected ${TASK_IDS.join(" | ")}`,
    );
  }
  return value as TaskId;
}

export function performancePrompt(): string {
  return `Use Epic Gains MCP to summarize my training progress.

1. Call performance_metrics with no extra filters (authenticated user).
2. Optionally call list_workouts if you need names for context.
3. Write a short progress summary from tool output only: recent volume, week-over-week change, streak, PRs, and notable session notes. Do not invent metrics.`;
}

export function friendsPrompt(): string {
  return `Use Epic Gains MCP to summarize everyone I follow.

1. Call following_performance_metrics once with no extra filters.
2. Do not call list_following, get_social_profile, or performance_metrics.
3. Summarize each returned friend from tool output only: visibility, recent volume, week-over-week change, streak, PRs, and notable notes. Do not invent metrics. If the list is empty or a friend is not visible, say so from the tool output.`;
}

export function yesterdayIso(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function compare1v1Prompt(username: string): string {
  const date = yesterdayIso();
  return `Compare my training to a friend 1v1, use Epic Gains.

Follow the 1v1 skill exactly.
1. Call performance_metrics twice in the same turn with date="${date}": once with no username (me), once with username="${username}".
2. Do not call get_social_profile, list_following, following_performance_metrics, or performance_data.
3. Write the 1v1 Comparison template from tool output only. Do not invent metrics.`;
}

export function compare1vAllPrompt(): string {
  const date = yesterdayIso();
  return `Compare me against all my friends, use Epic Gains.

Follow the 1v all skill exactly.
1. In the same turn, call performance_metrics with date="${date}" and no username, and following_performance_metrics once with the same date.
2. Do not loop performance_metrics per friend. Do not call list_following or get_social_profile.
3. Write the 1v All Comparison template from tool output only. Do not invent metrics.`;
}

export function friendsProgressPrompt(): string {
  const date = yesterdayIso();
  return `Give me a progress report of all my friends, use Epic Gains.

Follow the friends progress skill exactly.
1. Call following_performance_metrics once with date="${date}".
2. Do not call list_following, get_social_profile, or performance_metrics.
3. Write the Friends Progress Report template from tool output only. Do not invent metrics.`;
}

export function promptForTask(task: TaskId, username: string): string {
  if (task === "check_friends") return friendsPrompt();
  if (task === "compare_1v1") return compare1v1Prompt(username);
  if (task === "compare_1v_all") return compare1vAllPrompt();
  if (task === "friends_progress") return friendsProgressPrompt();
  return performancePrompt();
}

export function geminiApiKey(): string {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it to .env and retry.");
  }
  return apiKey;
}

export function formatError(error: unknown): string {
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

export function assertMcpUrl(url: string): string {
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

export async function connectClient(input: {
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

export function summarizeCallToolResult(result: unknown): {
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

export async function runDirectProbes(client: MCPClient) {
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

export function pickTools<T extends Record<string, unknown>>(
  tools: T,
  names: string[],
): T {
  return Object.fromEntries(
    names
      .filter((name) => tools[name] !== undefined)
      .map((name) => [name, tools[name]]),
  ) as T;
}

export function logToolCalls(
  steps: Array<{
    toolCalls: Array<{ toolName: string; input?: unknown }>;
  }>,
) {
  for (const [stepIndex, step] of steps.entries()) {
    for (const call of step.toolCalls) {
      const preview = JSON.stringify(call.input ?? {}).slice(0, 160);
      console.log(`  step ${stepIndex + 1}  ${call.toolName}  ${preview}`);
    }
  }
}

export async function runLlmTrial(input: {
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

  const toolCalls = result.steps.flatMap((step) =>
    step.toolCalls.map((call) => call.toolName),
  );
  const toolCallsByStep = result.steps.map((step) =>
    step.toolCalls.map((call) => call.toolName),
  );
  const toolErrors = result.steps.flatMap((step) =>
    step.toolResults.filter((toolResult) => {
      const output = toolResult.output as { isError?: boolean } | undefined;
      return output?.isError === true;
    }),
  );

  return {
    ms,
    text: result.text,
    steps: result.steps.length,
    toolCalls,
    toolCallsByStep,
    toolErrorCount: toolErrors.length,
    usage: result.usage,
    rawSteps: result.steps,
  };
}
