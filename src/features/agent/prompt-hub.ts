import { Client } from "langsmith";

import { extractPrimaryTemplate } from "@/features/agent/langsmith-prompt";
import {
  FIND_DEMOS_SYSTEM_PROMPT,
  LIFT_RESEARCH_SYSTEM_PROMPT,
  TRAINER_SYSTEM_PROMPT,
} from "@/features/agent/prompt";

export const TRAINER_PROMPT_HUB_NAME = "trainer-agent";
export const LIFT_RESEARCH_PROMPT_HUB_NAME = "lift-research-agent";
export const FIND_DEMOS_PROMPT_HUB_NAME = "find-demos-agent";
export const YOUTUBE_IMPORT_PROMPT_HUB_NAME = "youtube-import";
export const LANGSMITH_API_URL = "https://apac.api.smith.langchain.com";

export type TrainerPromptLoad = {
  system: string;
  metadata: Record<string, string>;
};

const cached = new Map<string, TrainerPromptLoad>();

function langsmithClient() {
  const apiKey = process.env.LANGSMITH_API_KEY?.trim();
  if (!apiKey) return null;
  return new Client({
    apiKey,
    apiUrl: process.env.LANGSMITH_ENDPOINT?.trim() || LANGSMITH_API_URL,
  });
}

function fallbackPrompt(name: string, system: string): TrainerPromptLoad {
  return {
    system,
    metadata: {
      ls_prompt_name: name,
      ls_prompt_source: "bundled",
    },
  };
}

async function getHubSystemPrompt(
  name: string,
  bundled: string,
): Promise<TrainerPromptLoad> {
  const hit = cached.get(name);
  if (hit) return hit;

  const fallback = fallbackPrompt(name, bundled);
  const client = langsmithClient();
  if (!client) return fallback;

  try {
    const [prompt, commit] = await Promise.all([
      client.getPrompt(name),
      client.pullPromptCommit(name),
    ]);
    const pulled = extractPrimaryTemplate(commit.manifest)?.trim();
    if (!pulled) return fallback;

    const metadata: Record<string, string> = {
      ls_prompt_name: name,
      ls_prompt_commit_hash: commit.commit_hash,
      ls_prompt_source: "hub",
    };
    if (prompt?.id) metadata.ls_prompt_id = prompt.id;

    const loaded = { system: pulled, metadata };
    cached.set(name, loaded);
    return loaded;
  } catch {
    return fallback;
  }
}

export function getTrainerSystemPrompt() {
  return getHubSystemPrompt(TRAINER_PROMPT_HUB_NAME, TRAINER_SYSTEM_PROMPT);
}

export function getLiftResearchSystemPrompt() {
  return getHubSystemPrompt(
    LIFT_RESEARCH_PROMPT_HUB_NAME,
    LIFT_RESEARCH_SYSTEM_PROMPT,
  );
}

export function getFindDemosSystemPrompt() {
  return getHubSystemPrompt(
    FIND_DEMOS_PROMPT_HUB_NAME,
    FIND_DEMOS_SYSTEM_PROMPT,
  );
}
