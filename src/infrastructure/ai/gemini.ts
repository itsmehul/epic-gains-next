import "server-only";

import { generateText, isStepCount, streamText, type ModelMessage } from "ai";

import { getDecryptedUserGeminiKey } from "@/db/repositories/gemini-key.repository";
import {
  getCurrentLiftTool,
  loopInTrainerTool,
  searchMuscleWorkTool,
} from "@/features/agent/tools";

import { createOpenRouterFromKey, GEMINI_MODEL } from "./openrouter";

const geminiProviderOptions = {
  openrouter: {
    reasoning: {
      effort: "minimal",
    },
  },
} as const;

/** Per-user OpenRouter provider — no fallback to server env. */
async function getUserGeminiProvider(userId: string) {
  const apiKey = await getDecryptedUserGeminiKey(userId);
  if (!apiKey) {
    throw new Error("gemini_key_required");
  }
  return createOpenRouterFromKey(apiKey);
}

/** Validate a raw OpenRouter API key with a cheap generate call. */
export async function validateGeminiApiKey(apiKey: string): Promise<boolean> {
  try {
    const openrouter = createOpenRouterFromKey(apiKey);
    await generateText({
      model: openrouter(GEMINI_MODEL),
      prompt: "Reply with ok",
      maxOutputTokens: 8,
    });
    return true;
  } catch {
    return false;
  }
}

type TrainerChatOptions = {
  userId: string;
  system: string;
  messages: ModelMessage[];
  lift?: {
    exerciseId?: string;
    workoutId?: string | null;
    commentId?: string;
  };
};

async function trainerChatConfig(options: TrainerChatOptions) {
  const openrouter = await getUserGeminiProvider(options.userId);
  return {
    model: openrouter(GEMINI_MODEL),
    system: options.system,
    messages: options.messages,
    tools: {
      web_search: openrouter.tools.webSearch({ engine: "native" }),
      get_current_lift: getCurrentLiftTool,
      loop_in_trainer: loopInTrainerTool,
      search_muscle_work: searchMuscleWorkTool,
    },
    toolsContext: {
      get_current_lift: {
        userId: options.userId,
        exerciseId: options.lift?.exerciseId,
        workoutId: options.lift?.workoutId,
        commentId: options.lift?.commentId,
      },
      loop_in_trainer: {
        userId: options.userId,
        exerciseId: options.lift?.exerciseId,
        workoutId: options.lift?.workoutId,
        commentId: options.lift?.commentId,
      },
      search_muscle_work: {
        userId: options.userId,
        exerciseId: options.lift?.exerciseId,
        workoutId: options.lift?.workoutId,
        commentId: options.lift?.commentId,
      },
    },
    stopWhen: isStepCount(5),
    maxOutputTokens: 8192,
    topP: 0.95,
    providerOptions: geminiProviderOptions,
  };
}

export async function generateUserTrainerChat(options: TrainerChatOptions) {
  return generateText(await trainerChatConfig(options));
}

export async function streamUserTrainerChat(options: TrainerChatOptions) {
  return streamText(await trainerChatConfig(options));
}
