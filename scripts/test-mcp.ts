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

import { findAbuttingExerciseTimelineError } from "../src/features/workouts/schemas";
import {
  IMPORT_VIDEO_ELIGIBILITY_MCP,
  VIDEO_PLAYBACK_REJECT_REASON,
} from "../src/features/workouts/import-eligibility";
import {
  extractYoutubeWatchUrls,
  fetchYoutubeOembed,
  type YoutubeOembed,
} from "../src/shared/youtube";

const DEFAULT_MCP_URL = "http://localhost:3000/api/mcp";
const DEFAULT_MODEL = "gemini-3.7-flash";
const DEFAULT_YOUTUBE_URL = "https://www.youtube.com/watch?v=38z61KcalV4";

type TaskId =
  | "create_workout"
  | "get_import_prompt"
  | "check_performance"
  | "check_friends";

const TASK_IDS: TaskId[] = [
  "create_workout",
  "get_import_prompt",
  "check_performance",
  "check_friends",
];

function printHelp() {
  console.log(`Usage: pnpm ai:test-mcp -- [options]

Options:
  --url <url>              MCP server URL (env MCP_URL)
  --api-key <key>          MCP API key (env MCP_API_KEY)
  --model <id>             Gemini model (env GEMINI_MODEL)
  --task <id>              create_workout | get_import_prompt | check_performance | check_friends
  --youtube-url <url>      YouTube watch URL for create_workout / get_import_prompt (env YOUTUBE_URL)
  --username <name>        Friend username for check_friends
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
      "youtube-url": { type: "string" },
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
  create_workout: ["import_full_workout"],
  get_import_prompt: ["get_youtube_import_prompt"],
  check_performance: ["performance_metrics", "list_workouts"],
  check_friends: ["get_social_profile", "performance_metrics"],
};

function createWorkoutSystem(): string {
  return [
    "Epic Gains MCP creates follow-along workouts with import_full_workout.",
    "Call only that tool when the video is eligible. The attached video is the source of truth for moves and times.",
    IMPORT_VIDEO_ELIGIBILITY_MCP,
    "Do not search the web for timestamps, chapters, or transcripts.",
  ].join("\n");
}

function createWorkoutPrompt(
  youtubeUrl: string,
  oembed?: YoutubeOembed,
): string {
  const meta = [
    `Canonical URL: ${youtubeUrl}`,
    oembed?.title ? `Title: ${oembed.title}` : null,
    oembed?.authorName ? `Author: ${oembed.authorName}` : null,
    oembed?.channelUrl ? `Channel: ${oembed.channelUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `A YouTube follow-along workout video is attached.

${meta}

Watch the video. If it is eligible, call import_full_workout once with sourceVideoUrl=${youtubeUrl}.
If it is not eligible, do not call any tool. Explain using the refusal reasons.

Use the title, author, and channelUrl above when provided. Read duration from the video; last move ends there.

Eligibility:
${IMPORT_VIDEO_ELIGIBILITY_MCP}

Rules:
- List only real exercises/stretches. Skip rest, water breaks, intro, and preview.
- Use canonical exercise names (no incline degrees or grip notes).
- Detect the interval grid (60s blocks, 45/15, 40/20, or 30s). Lock every start to that grid (timer reset, beep, or overlay — not a mid-set "let's begin").
- One grid slot = one exercise. Do not merge two intervals into a single move.
- Skip rest slots. Still emit a continuous timeline: each videoEndTime equals the next videoStartTime (stretch the prior work end to the next work start, or drop rest from the list and keep work blocks back-to-back on the grid).
- Times must be seconds (not MM:SS).
- For every exercise set:
  - metric_profile: BODYWEIGHT_REPS (unweighted reps), TIMED_HOLD (isometric/stretch), WEIGHT_REPS, WEIGHTED_REPS, CARDIO_DISTANCE, LOADED_CARRY, or CUSTOM.
  - muscle_group: chest | back | shoulders | arms | legs | core.
  - key_muscles: 1–6 anatomical names, primary first.
  - suggested_sets: typically 1 for follow-along circuits/HIIT/mobility.
  - suggested_time: work interval in seconds (e.g. 45 or 60), not rest.
  - tags: section labels such as warmup, hiit, cooldown.
- Do not invent moves you cannot see. After the tool returns, summarize the created workout from tool output only.`;
}

function getImportPromptPrompt(youtubeUrl: string): string {
  return `Use Epic Gains MCP to fetch the official YouTube exercise-extraction prompt.

1. Call get_youtube_import_prompt with youtubeUrl="${youtubeUrl}".
2. From the tool output only, confirm that (a) instructions say you must apply the prompt to the video to extract real values, (b) the prompt includes the watch URL, eligibility/refusal rules, and the JSON schema. Quote the first line of the prompt field. Do not invent a prompt if the tool fails.`;
}

function performancePrompt(): string {
  return `Use Epic Gains MCP to summarize my training progress.

1. Call performance_metrics with no extra filters (authenticated user).
2. Optionally call list_workouts if you need names for context.
3. Write a short progress summary from tool output only: recent volume, week-over-week change, streak, PRs, and notable session notes. Do not invent metrics.`;
}

function friendsPrompt(username: string): string {
  return `Use Epic Gains MCP to summarize this user: ${username}

1. Call get_social_profile with username="${username}".
2. If workouts are visible, call performance_metrics with the same username (no extra filters).
3. Summarize profile, follow relationship, visibility, and (if available) training highlights from tool output only. Do not invent details. If the account is private or not found, say so from the tool error.`;
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

function assertYoutubeUrl(value: string): string {
  const urls = extractYoutubeWatchUrls(value);
  if (urls.length === 0) {
    throw new Error("Enter a YouTube watch URL (youtube.com/watch or youtu.be).");
  }
  return urls[0]!;
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

function formatImportTimeline(input: unknown): string {
  if (typeof input !== "object" || input === null) {
    return "(no input)";
  }
  const record = input as {
    workoutName?: unknown;
    exercises?: Array<{
      name?: unknown;
      videoStartTime?: unknown;
      videoEndTime?: unknown;
    }>;
  };
  const exercises = Array.isArray(record.exercises) ? record.exercises : [];
  const times = exercises.map((exercise) => ({
    videoStartTime: Number(exercise.videoStartTime),
    videoEndTime:
      typeof exercise.videoEndTime === "number"
        ? exercise.videoEndTime
        : undefined,
  }));
  const gaps = times
    .map((time, index) => {
      const next = times[index + 1];
      if (!next || time.videoEndTime === undefined) return undefined;
      const delta = next.videoStartTime - time.videoEndTime;
      return delta === 0 ? undefined : `#${index}→${index + 1} gap=${delta}s`;
    })
    .filter((part): part is string => Boolean(part));
  const abut = findAbuttingExerciseTimelineError(times);
  const starts = times
    .map((time) => time.videoStartTime)
    .filter((value) => Number.isFinite(value));
  return [
    `name=${typeof record.workoutName === "string" ? record.workoutName : "?"}`,
    `moves=${exercises.length}`,
    `starts=[${starts.join(", ")}]`,
    abut ? `timeline=${abut}` : "timeline=abut",
    gaps.length > 0 ? gaps.join("; ") : null,
  ]
    .filter(Boolean)
    .join("  ");
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
      if (call.toolName === "import_full_workout") {
        console.log(
          `  step ${stepIndex + 1}  ${call.toolName}  ${formatImportTimeline(input)}`,
        );
        continue;
      }
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
  youtubeUrl?: string;
  maxSteps: number;
}) {
  const google = createGoogle({ apiKey: geminiApiKey() });
  const started = performance.now();
  const result = await generateText({
    model: google(input.model),
    system:
      input.task === "create_workout"
        ? createWorkoutSystem()
        : input.client.instructions,
    tools: pickTools(input.tools, TASK_TOOL_NAMES[input.task]),
    stopWhen: stepCountIs(input.maxSteps),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: input.prompt },
          ...(input.youtubeUrl
            ? [
                {
                  type: "file" as const,
                  data: input.youtubeUrl,
                  mediaType: "video/mp4",
                },
              ]
            : []),
        ],
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
    youtubeUrl:
      cli["youtube-url"]?.trim() || process.env.YOUTUBE_URL?.trim(),
    username: cli.username?.trim(),
  };

  const prompted = await inquirer.prompt<{
    url?: string;
    apiKey?: string;
    model?: string;
    task?: TaskId;
    youtubeUrl?: string;
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
      default: "create_workout",
      choices: [
        {
          name: "Create a workout (YouTube URL → import_full_workout)",
          value: "create_workout",
        },
        {
          name: "Get YouTube import prompt (URL → get_youtube_import_prompt)",
          value: "get_import_prompt",
        },
        {
          name: "Check performance (progress summary)",
          value: "check_performance",
        },
        {
          name: "Check friends (username → profile summary)",
          value: "check_friends",
        },
      ],
    },
    {
      type: "input",
      name: "youtubeUrl",
      message: "YouTube workout URL",
      when: (answers) => {
        const task = fromCli.task ?? answers.task;
        return (
          (task === "create_workout" || task === "get_import_prompt") &&
          !fromCli.youtubeUrl
        );
      },
      default: DEFAULT_YOUTUBE_URL,
      validate: (value: string) => {
        try {
          assertYoutubeUrl(value);
          return true;
        } catch (error) {
          return formatError(error);
        }
      },
    },
    {
      type: "input",
      name: "username",
      message: "Friend username",
      when: (answers) => {
        const task = fromCli.task ?? answers.task;
        return task === "check_friends" && !fromCli.username;
      },
      validate: (value: string) =>
        value.trim().length > 0 || "username is required",
    },
  ]);

  const url = fromCli.url ?? prompted.url!;
  const apiKey = fromCli.apiKey ?? prompted.apiKey!;
  const model = fromCli.model ?? prompted.model ?? DEFAULT_MODEL;
  const task = fromCli.task ?? prompted.task!;
  const extras = {
    youtubeUrl: fromCli.youtubeUrl ?? prompted.youtubeUrl,
    username: fromCli.username ?? prompted.username,
  };

  const youtubeUrl =
    (task === "create_workout" || task === "get_import_prompt") &&
    extras.youtubeUrl
      ? assertYoutubeUrl(extras.youtubeUrl)
      : undefined;
  const oembed =
    task === "create_workout" && youtubeUrl
      ? await fetchYoutubeOembed(youtubeUrl)
      : undefined;
  const prompt =
    task === "create_workout" && youtubeUrl
      ? createWorkoutPrompt(youtubeUrl, oembed)
      : task === "get_import_prompt" && youtubeUrl
        ? getImportPromptPrompt(youtubeUrl)
        : task === "check_friends"
          ? friendsPrompt(extras.username!.trim())
          : performancePrompt();
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

    if (task === "create_workout" && youtubeUrl) {
      console.log("Attaching video:", youtubeUrl);
      if (oembed) {
        console.log(
          `oembed  title=${oembed.title}  author=${oembed.authorName}`,
        );
      } else {
        console.log("oembed  unavailable (playback likely disabled)");
      }
    }

    if (task === "get_import_prompt" && youtubeUrl) {
      const started = performance.now();
      const promptResult = await client.callTool({
        name: "get_youtube_import_prompt",
        arguments: { youtubeUrl },
      });
      const ms = Math.round(performance.now() - started);
      const summary = summarizeCallToolResult(promptResult);
      console.log(
        `get_youtube_import_prompt ${ms}ms  ${summary.ok ? "ok" : "error"}  ${summary.preview}`,
      );
    }

    if (task === "create_workout" && youtubeUrl && !oembed) {
      console.log("\n--- response ---\n");
      console.log(VIDEO_PLAYBACK_REJECT_REASON);
      return;
    }

    const llm = await runLlmTrial({
      client,
      tools: probes.tools,
      model: model.trim() || DEFAULT_MODEL,
      task,
      prompt,
      youtubeUrl: oembed ? youtubeUrl : undefined,
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
