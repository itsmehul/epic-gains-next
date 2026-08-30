import "server-only";

import { createGoogle } from "@ai-sdk/google";
import { generateText, streamText, type ModelMessage } from "ai";

import { getDecryptedUserGeminiKey } from "@/db/repositories/gemini-key.repository";
import { getEnv } from "@/shared/env";
import { extractYoutubeWatchUrls } from "@/shared/youtube";

export const GEMINI_MODEL = "gemini-3.7-flash" as const;

export function getGeminiProvider() {
  const env = getEnv();
  const apiKey =
    env.GOOGLE_GENERATIVE_AI_API_KEY.trim() || env.GEMINI_API_KEY.trim();
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  }

  return createGoogle({ apiKey });
}

/** Per-user Gemini provider — no fallback to server env. */
export async function getUserGeminiProvider(userId: string) {
  const apiKey = await getDecryptedUserGeminiKey(userId);
  if (!apiKey) {
    throw new Error("gemini_key_required");
  }
  return createGoogle({ apiKey });
}

/** Validate a raw Gemini API key with a cheap generate call. */
export async function validateGeminiApiKey(apiKey: string): Promise<boolean> {
  try {
    const google = createGoogle({ apiKey });
    await generateText({
      model: google(GEMINI_MODEL),
      prompt: "Reply with ok",
      maxOutputTokens: 8,
    });
    return true;
  } catch {
    return false;
  }
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

function withYoutubeFileParts(
  messages: ModelMessage[],
  youtubeUrls: string[],
): ModelMessage[] {
  if (youtubeUrls.length === 0) return messages;
  const fileParts = youtubeUrls.map((url) => ({
    type: "file" as const,
    data: url,
    mediaType: "video/mp4" as const,
  }));

  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    return [
      ...messages,
      { role: "user" as const, content: [...fileParts] },
    ];
  }

  const content =
    typeof last.content === "string"
      ? [{ type: "text" as const, text: last.content }, ...fileParts]
      : Array.isArray(last.content)
        ? [...last.content, ...fileParts]
        : [...fileParts];

  return [...messages.slice(0, -1), { ...last, content }];
}

export async function streamUserTrainerChat(options: {
  userId: string;
  system: string;
  messages: ModelMessage[];
  youtubeUrls?: string[];
}) {
  const google = await getUserGeminiProvider(options.userId);
  const messages = withYoutubeFileParts(
    options.messages,
    options.youtubeUrls ?? [],
  );

  return streamText({
    model: google(GEMINI_MODEL),
    system: options.system,
    messages,
    tools: {
      google_search: google.tools.googleSearch({}),
    },
    maxOutputTokens: 8192,
    topP: 0.95,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingLevel: "medium",
        },
      },
    },
  });
}
