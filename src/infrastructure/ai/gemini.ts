import "server-only";

import {
  generateText,
  isStepCount,
  streamText,
  wrapLanguageModel,
  type ModelMessage,
} from "ai";
import { LangSmithTelemetry } from "langsmith/experimental/vercel";

import { getDecryptedUserGeminiKey } from "@/db/repositories/gemini-key.repository";
import { piiGuardMiddleware } from "@/features/agent/pii";
import {
  getFindDemosSystemPrompt,
  getLiftResearchSystemPrompt,
} from "@/features/agent/prompt-hub";
import {
  createFindDemosTool,
  createResearchLiftTool,
} from "@/features/agent/subagents";
import { loopInTrainerTool } from "@/features/agent/tools";
import { getEnv } from "@/shared/env";

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
  promptMetadata?: Record<string, string>;
  lift?: {
    exerciseId?: string;
    workoutId?: string | null;
    commentId?: string;
  };
};

async function trainerChatConfig(options: TrainerChatOptions) {
  const openrouter = await getUserGeminiProvider(options.userId);
  const model = wrapLanguageModel({
    model: openrouter(GEMINI_MODEL),
    middleware: piiGuardMiddleware(),
  });
  const lift = {
    userId: options.userId,
    exerciseId: options.lift?.exerciseId,
    workoutId: options.lift?.workoutId,
    commentId: options.lift?.commentId,
  };
  const [research, demos] = await Promise.all([
    getLiftResearchSystemPrompt(),
    getFindDemosSystemPrompt(),
  ]);

  return {
    model,
    system: options.system,
    messages: options.messages,
    tools: {
      research_lift: createResearchLiftTool({
        model,
        system: research.system,
        promptMetadata: research.metadata,
        lift,
      }),
      find_demos: createFindDemosTool({
        model,
        openrouter,
        system: demos.system,
        promptMetadata: demos.metadata,
        lift,
      }),
      loop_in_trainer: loopInTrainerTool,
    },
    toolsContext: {
      loop_in_trainer: lift,
    },
    stopWhen: isStepCount(6),
    toolApproval: {
      loop_in_trainer: {
        type: "user-approval" as const,
        reason:
          "Your trainer will be mentioned in this thread and notified.",
      },
    },
    experimental_toolApprovalSecret: getEnv().BETTER_AUTH_SECRET,
    telemetry: {
      functionId: "trainer-agent",
      integrations: [
        LangSmithTelemetry({
          metadata: options.promptMetadata,
        }),
      ],
    },
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
