import "server-only";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

import { getEnv } from "@/shared/env";

export function getOpenRouterProvider() {
  const env = getEnv();
  if (!env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  return createOpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
  });
}

/** Thin AI SDK example — call from API routes, not server actions. */
export async function generateGreeting(name: string) {
  const openrouter = getOpenRouterProvider();
  const { text } = await generateText({
    model: openrouter("openai/gpt-4o-mini"),
    prompt: `Write a one-sentence friendly greeting for ${name}.`,
  });
  return text;
}
