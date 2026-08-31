import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, isStepCount, tool, type ModelMessage } from "ai";
import { LangSmithTelemetry } from "langsmith/experimental/vercel";
import { z } from "zod";

import {
  escalationAskText,
  loopInTrainerApprovalRequest,
} from "@/features/agent/escalation";
import {
  FIND_DEMOS_SYSTEM_PROMPT,
  LIFT_RESEARCH_SYSTEM_PROMPT,
  TRAINER_SYSTEM_PROMPT,
} from "@/features/agent/prompt";
import {
  getFindDemosSystemPrompt,
  getLiftResearchSystemPrompt,
  getTrainerSystemPrompt,
} from "@/features/agent/prompt-hub";

import type { AgentEvalCase } from "./cases";
import type { AgentEvalOutputs } from "./score-agent";
import {
  caseMessages,
  extractTrajectory,
  toolNamesFromSteps,
} from "./shared";

const SQUAT_LIFT = {
  available: true as const,
  exercise: {
    id: "ex_squat",
    name: "Back Squat",
    muscleGroup: "legs",
    keyMuscles: ["quads", "glutes"],
    tags: ["barbell"],
    chapter: "lower",
    targets: [{ sets: 5, reps: 5, weight: 100 }],
    videoUrl: "https://www.youtube.com/watch?v=ultWZbUMPL8",
  },
  recentSets: [
    { reps: 5, weight: 100, time: null, distance: null, updatedAt: "2026-08-28T10:00:00.000Z" },
  ],
  recentNotes: [{ text: "hips felt tight", createdAt: "2026-08-28T10:05:00.000Z" }],
};

const MUSCLE_LOGGED = {
  available: true as const,
  windowDays: 28,
  resolved: {
    muscleGroups: ["legs"],
    keyMusclePatterns: ["quad"],
    matchedExerciseNames: ["Back Squat"],
  },
  logged: [
    {
      exerciseId: "ex_leg_press",
      name: "Leg Press",
      muscleGroup: "legs",
      keyMuscles: ["quads"],
      setCount: 8,
      lastLoggedAt: "2026-08-20T10:00:00.000Z",
      recentSets: [{ day: "2026-08-20", reps: 10, weight: 140, time: null, distance: null }],
    },
  ],
  relatedCatalog: [
    {
      exerciseId: "ex_leg_ext",
      name: "Leg Extension",
      muscleGroup: "legs",
      keyMuscles: ["quads"],
    },
  ],
  hint: "Use logged work the athlete already does. Encourage pushing intensity there when it is strengthening, not when pain is a red flag.",
};

const MUSCLE_CATALOG_ONLY = {
  ...MUSCLE_LOGGED,
  logged: [] as typeof MUSCLE_LOGGED.logged,
  hint: "No matching sets in this window. relatedCatalog are catalog moves that hit the same muscles.",
};

export async function runAgentEvalTrial(
  item: AgentEvalCase,
  model: string,
): Promise<AgentEvalOutputs> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is required");

  const openrouter = createOpenRouter({ apiKey });
  const lift = item.inputs.exerciseSelected
    ? SQUAT_LIFT
    : {
        available: false as const,
        reason: "No lift is selected. The athlete is not asking from an exercise thread.",
      };
  const muscle = item.inputs.catalogOnlyMuscle ? MUSCLE_CATALOG_ONLY : MUSCLE_LOGGED;
  const trainers = item.inputs.trainers;

  const get_current_lift = tool({
    description:
      "Fetch the athlete's current lift: exercise details, targets, video, recent logged sets, and recent notes.",
    inputSchema: z.object({}),
    execute: async () => lift,
  });

  const search_catalog = tool({
    description:
      "Search the Epic Gains exercise catalog by name or alias.",
    inputSchema: z.object({
      q: z.string(),
      limit: z.number().optional(),
    }),
    execute: async () => ({
      available: true as const,
      query: "goblet squat",
      matches: [
        {
          exerciseId: "ex_goblet",
          name: "Goblet Squat",
          score: 0.9,
          matchedAlias: null,
          muscleGroup: "legs",
          keyMuscles: ["quads", "glutes"],
          videoUrl: "https://www.youtube.com/watch?v=MeIiIdhvXT4",
        },
      ],
      hint: "Prefer these catalog/logged-program moves and their videoUrl over a web search.",
    }),
  });

  const search_muscle_work = tool({
    description:
      "Search the athlete's recent logged sets for muscles related to a complaint or lift.",
    inputSchema: z.object({
      query: z.string(),
      muscleGroups: z.array(z.string()).optional(),
      keyMuscles: z.array(z.string()).optional(),
      days: z.number().optional(),
    }),
    execute: async () => muscle,
  });

  const loop_in_trainer = tool({
    description:
      "Loop a human trainer into the current comment thread. The athlete must approve before anyone is notified.",
    inputSchema: z.object({
      message: z.string(),
      threadCommentId: z.string().optional(),
    }),
    execute: async ({ message }) => {
      if (trainers.length === 0) {
        return {
          ok: false,
          reason: "No trainer assigned.",
          message,
        };
      }
      return { ok: true, trainers, message };
    },
  });

  const [prompt, researchPrompt, demosPrompt] = await Promise.all([
    getTrainerSystemPrompt(),
    getLiftResearchSystemPrompt(),
    getFindDemosSystemPrompt(),
  ]);

  const research_lift = tool({
    description:
      "Research the athlete's current lift, logged sets, notes, and related muscle work.",
    inputSchema: z.object({
      task: z.string(),
    }),
    execute: async ({ task }, { abortSignal }) => {
      const generated = await generateText({
        model: openrouter(model),
        system: LIFT_RESEARCH_SYSTEM_PROMPT,
        prompt: task,
        abortSignal,
        telemetry: {
          functionId: "lift-research-agent",
          integrations: [
            LangSmithTelemetry({
              metadata: researchPrompt.metadata,
            }),
          ],
        },
        tools: { get_current_lift, search_muscle_work },
        stopWhen: isStepCount(4),
        maxOutputTokens: 2048,
        topP: 0.95,
        providerOptions: {
          openrouter: { reasoning: { effort: "minimal" } },
        },
      });
      return generated.text.trim() || "No lift research available.";
    },
  });

  const find_demos = tool({
    description:
      "Find a catalog variant, a different database move, or a demo video.",
    inputSchema: z.object({
      task: z.string(),
    }),
    execute: async ({ task }, { abortSignal }) => {
      const generated = await generateText({
        model: openrouter(model),
        system: FIND_DEMOS_SYSTEM_PROMPT,
        prompt: task,
        abortSignal,
        telemetry: {
          functionId: "find-demos-agent",
          integrations: [
            LangSmithTelemetry({
              metadata: demosPrompt.metadata,
            }),
          ],
        },
        tools: {
          get_current_lift,
          search_catalog,
          search_muscle_work,
          web_search: openrouter.tools.webSearch({ engine: "native" }),
        },
        stopWhen: isStepCount(5),
        maxOutputTokens: 2048,
        topP: 0.95,
        providerOptions: {
          openrouter: { reasoning: { effort: "minimal" } },
        },
      });
      return generated.text.trim() || "No demo links found.";
    },
  });

  const messages: ModelMessage[] = caseMessages(item.inputs);

  const generated = await generateText({
    model: openrouter(model),
    system: TRAINER_SYSTEM_PROMPT,
    telemetry: {
      functionId: "trainer-agent",
      integrations: [
        LangSmithTelemetry({
          metadata: prompt.metadata,
        }),
      ],
    },
    messages,
    tools: {
      research_lift,
      find_demos,
      loop_in_trainer,
    },
    stopWhen: isStepCount(6),
    toolApproval: {
      loop_in_trainer: {
        type: "user-approval",
        reason: "Your trainer will be mentioned in this thread and notified.",
      },
    },
    experimental_toolApprovalSecret:
      process.env.BETTER_AUTH_SECRET?.trim() || "eval-tool-approval-secret",
    maxOutputTokens: 2048,
    topP: 0.95,
    providerOptions: {
      openrouter: { reasoning: { effort: "minimal" } },
    },
  });

  const toolsCalled = toolNamesFromSteps(generated.steps);
  const approval = loopInTrainerApprovalRequest(generated.content);
  const loopInTrainerCalls = toolsCalled.filter((name) => name === "loop_in_trainer").length;
  const text = approval
    ? escalationAskText({
        modelText: generated.text,
        preview: approval.preview,
        trainers,
      })
    : generated.text;

  return {
    text,
    toolsCalled,
    requestedLoopInTrainer: Boolean(approval) || loopInTrainerCalls > 0,
    loopInTrainerCalls,
    steps: extractTrajectory(generated.steps),
    approvalRequested: Boolean(approval),
  };
}
