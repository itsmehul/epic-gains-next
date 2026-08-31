import "server-only";

import {
  generateText,
  isStepCount,
  tool,
  type LanguageModel,
} from "ai";
import { LangSmithTelemetry } from "langsmith/experimental/vercel";
import { z } from "zod";

import {
  subagentTaskPrompt,
  type AthleteLiftContext,
} from "@/features/agent/lift-context";
import {
  getCurrentLiftTool,
  searchCatalogTool,
  searchMuscleWorkTool,
} from "@/features/agent/tools";
import { createOpenRouterFromKey } from "@/infrastructure/ai/openrouter";

const liftContextSchema = z.object({
  userId: z.string(),
  exerciseId: z.string().optional(),
  workoutId: z.string().nullable().optional(),
  commentId: z.string().optional(),
});

export type TrainerLiftContext = z.infer<typeof liftContextSchema>;

const geminiProviderOptions = {
  openrouter: {
    reasoning: {
      effort: "minimal",
    },
  },
} as const;

type OpenRouter = ReturnType<typeof createOpenRouterFromKey>;

function liftToolsContext(lift: TrainerLiftContext) {
  return {
    userId: lift.userId,
    exerciseId: lift.exerciseId,
    workoutId: lift.workoutId,
    commentId: lift.commentId,
  };
}

export function createResearchLiftTool(options: {
  model: LanguageModel;
  system: string;
  promptMetadata?: Record<string, string>;
  lift: TrainerLiftContext;
  liftContext: AthleteLiftContext;
}) {
  return tool({
    description:
      "Research the athlete's current lift, logged sets, notes, and related muscle work. Use before coaching a specific exercise, load, or lift/joint complaint. Do not pass a guessed exercise name; current lift is already in context.",
    inputSchema: z.object({
      task: z
        .string()
        .trim()
        .min(1)
        .max(500)
        .describe(
          "What to look up (sets, notes, a joint complaint). Do not invent or rename the current lift.",
        ),
    }),
    execute: async ({ task }, { abortSignal }) => {
      const generated = await generateText({
        model: options.model,
        system: options.system,
        prompt: subagentTaskPrompt(task, options.liftContext),
        abortSignal,
        tools: {
          get_current_lift: getCurrentLiftTool,
          search_muscle_work: searchMuscleWorkTool,
        },
        toolsContext: {
          get_current_lift: liftToolsContext(options.lift),
          search_muscle_work: liftToolsContext(options.lift),
        },
        stopWhen: isStepCount(4),
        telemetry: {
          functionId: "lift-research-agent",
          integrations: [
            LangSmithTelemetry({
              metadata: options.promptMetadata,
            }),
          ],
        },
        maxOutputTokens: 2048,
        topP: 0.95,
        providerOptions: geminiProviderOptions,
      });
      return generated.text.trim() || "No lift research available.";
    },
  });
}

export function createFindDemosTool(options: {
  model: LanguageModel;
  openrouter: OpenRouter;
  system: string;
  promptMetadata?: Record<string, string>;
  lift: TrainerLiftContext;
  liftContext: AthleteLiftContext;
}) {
  return tool({
    description:
      "Find a catalog variant, a different database move, or a demo video for the current lift. Prefers Epic Gains exercises and stored videos before web search. Does not recommend the current lift's attached video. Do not pass a guessed exercise name.",
    inputSchema: z.object({
      task: z
        .string()
        .trim()
        .min(1)
        .max(500)
        .describe(
          "What to find: a demo, a variant, or a different move. Do not invent or rename the current lift.",
        ),
    }),
    execute: async ({ task }, { abortSignal }) => {
      const generated = await generateText({
        model: options.model,
        system: options.system,
        prompt: subagentTaskPrompt(task, options.liftContext),
        abortSignal,
        tools: {
          get_current_lift: getCurrentLiftTool,
          search_catalog: searchCatalogTool,
          search_muscle_work: searchMuscleWorkTool,
          web_search: options.openrouter.tools.webSearch({ engine: "native" }),
        },
        toolsContext: {
          get_current_lift: liftToolsContext(options.lift),
          search_catalog: liftToolsContext(options.lift),
          search_muscle_work: liftToolsContext(options.lift),
        },
        stopWhen: isStepCount(5),
        telemetry: {
          functionId: "find-demos-agent",
          integrations: [
            LangSmithTelemetry({
              metadata: options.promptMetadata,
            }),
          ],
        },
        maxOutputTokens: 2048,
        topP: 0.95,
        providerOptions: geminiProviderOptions,
      });
      return generated.text.trim() || "No demo links found.";
    },
  });
}
