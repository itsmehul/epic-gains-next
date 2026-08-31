import "server-only";

import { generateText, streamText, type ModelMessage } from "ai";

import { getDecryptedUserGeminiKey } from "@/db/repositories/gemini-key.repository";

import {
  createOpenRouterFromKey,
  GEMINI_MODEL,
  getOpenRouterProvider,
} from "./openrouter";

export { GEMINI_MODEL };

const geminiProviderOptions = {
  openrouter: {
    reasoning: {
      effort: "minimal",
    },
  },
} as const;

export function getGeminiProvider() {
  return getOpenRouterProvider();
}

/** Per-user OpenRouter provider — no fallback to server env. */
export async function getUserGeminiProvider(userId: string) {
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

/** Thin AI SDK example with web search. */
export async function generateGeminiText(prompt: string) {
  const openrouter = getGeminiProvider();
  const { text } = await generateText({
    model: openrouter(GEMINI_MODEL),
    prompt,
    tools: {
      web_search: openrouter.tools.webSearch({ engine: "native" }),
    },
    maxOutputTokens: 65536,
    providerOptions: geminiProviderOptions,
  });
  return text;
}

export async function streamUserTrainerChat(options: {
  userId: string;
  system: string;
  messages: ModelMessage[];
}) {
  const openrouter = await getUserGeminiProvider(options.userId);

  return streamText({
    model: openrouter(GEMINI_MODEL),
    system: options.system,
    messages: options.messages,
    tools: {
      web_search: openrouter.tools.webSearch({ engine: "native" }),
    },
    maxOutputTokens: 8192,
    topP: 0.95,
    providerOptions: geminiProviderOptions,
  });
}
