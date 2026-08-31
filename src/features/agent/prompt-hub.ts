import { Client } from "langsmith";

import { extractPrimaryTemplate } from "@/features/agent/langsmith-prompt";
import { TRAINER_SYSTEM_PROMPT } from "@/features/agent/prompt";

export const TRAINER_PROMPT_HUB_NAME = "trainer-agent";
export const YOUTUBE_IMPORT_PROMPT_HUB_NAME = "youtube-import";
export const LANGSMITH_API_URL = "https://apac.api.smith.langchain.com";

export type TrainerPromptLoad = {
  system: string;
  metadata: Record<string, string>;
};

let cached: TrainerPromptLoad | null = null;

function langsmithClient() {
  const apiKey = process.env.LANGSMITH_API_KEY?.trim();
  if (!apiKey) return null;
  return new Client({
    apiKey,
    apiUrl: process.env.LANGSMITH_ENDPOINT?.trim() || LANGSMITH_API_URL,
  });
}

function fallbackPrompt(): TrainerPromptLoad {
  return {
    system: TRAINER_SYSTEM_PROMPT,
    metadata: {
      ls_prompt_name: TRAINER_PROMPT_HUB_NAME,
      ls_prompt_source: "bundled",
    },
  };
}

export async function getTrainerSystemPrompt(): Promise<TrainerPromptLoad> {
  if (cached) return cached;

  const client = langsmithClient();
  if (!client) return fallbackPrompt();

  try {
    const [prompt, commit] = await Promise.all([
      client.getPrompt(TRAINER_PROMPT_HUB_NAME),
      client.pullPromptCommit(TRAINER_PROMPT_HUB_NAME),
    ]);
    const pulled = extractPrimaryTemplate(commit.manifest)?.trim();
    if (!pulled) return fallbackPrompt();

    const metadata: Record<string, string> = {
      ls_prompt_name: TRAINER_PROMPT_HUB_NAME,
      ls_prompt_commit_hash: commit.commit_hash,
      ls_prompt_source: "hub",
    };
    if (prompt?.id) metadata.ls_prompt_id = prompt.id;

    cached = { system: pulled, metadata };
    return cached;
  } catch {
    return fallbackPrompt();
  }
}
