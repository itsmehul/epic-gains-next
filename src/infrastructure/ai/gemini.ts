import "server-only";

import { createGoogle } from "@ai-sdk/google";
import { generateText } from "ai";

import { getEnv } from "@/shared/env";
import { extractYoutubeWatchUrls } from "@/shared/youtube";

const GEMINI_MODEL = "gemini-3.7-flash" as const;

export function getGeminiProvider() {
  const env = getEnv();
  const apiKey =
    env.GOOGLE_GENERATIVE_AI_API_KEY.trim() || env.GEMINI_API_KEY.trim();
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  }

  return createGoogle({ apiKey });
}

/** Thin AI SDK example with Google Search and optional YouTube video input. */
export async function generateGeminiText(prompt: string) {
  const google = getGeminiProvider();
  const youtubeUrls = extractYoutubeWatchUrls(prompt);
  const { text } = await generateText({
    model: google(GEMINI_MODEL),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...youtubeUrls.map((url) => ({
            type: "file" as const,
            data: url,
            mediaType: "video/mp4",
          })),
        ],
      },
    ],
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    maxOutputTokens: 65536,
    topP: 0.95,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingLevel: "medium",
        },
      },
    },
  });
  return text;
}
