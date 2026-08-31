import { Client } from "langsmith";

import { extractPrimaryTemplate } from "@/features/agent/langsmith-prompt";
import { TRAINER_SYSTEM_PROMPT } from "@/features/agent/prompt";

export const TRAINER_PROMPT_HUB_NAME = "trainer-agent";
export const YOUTUBE_IMPORT_PROMPT_HUB_NAME = "youtube-import";
export const LANGSMITH_API_URL = "https://apac.api.smith.langchain.com";

let cachedTrainerPrompt: string | null = null;

function langsmithClient() {
  const apiKey = process.env.LANGSMITH_API_KEY?.trim();
  if (!apiKey) return null;
  return new Client({
    apiKey,
    apiUrl: process.env.LANGSMITH_ENDPOINT?.trim() || LANGSMITH_API_URL,
  });
}

export async function getTrainerSystemPrompt(): Promise<string> {
  if (cachedTrainerPrompt) return cachedTrainerPrompt;

  const client = langsmithClient();
  if (!client) return TRAINER_SYSTEM_PROMPT;

  try {
    const commit = await client.pullPromptCommit(TRAINER_PROMPT_HUB_NAME);
    const pulled = extractPrimaryTemplate(commit.manifest)?.trim();
    if (pulled) {
      cachedTrainerPrompt = pulled;
      return pulled;
    }
  } catch {
    // Fall back to the bundled prompt if the hub is unreachable.
  }

  return TRAINER_SYSTEM_PROMPT;
}
