import "server-only";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

import { getEnv } from "@/shared/env";

export const GEMINI_MODEL = "google/gemini-3.1-flash-lite" as const;

export function createOpenRouterFromKey(apiKey: string) {
  return createOpenRouter({ apiKey });
}

export function getOpenRouterProvider() {
  const env = getEnv();
  const apiKey = env.OPENROUTER_API_KEY.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  return createOpenRouterFromKey(apiKey);
}

/** Thin AI SDK example — call from API routes, not server actions. */
export async function generateGreeting(name: string) {
  const openrouter = getOpenRouterProvider();
  const { text } = await generateText({
    model: openrouter(GEMINI_MODEL),
    prompt: `Write a one-sentence friendly greeting for ${name}.`,
  });
  return text;
}
