import "dotenv/config";

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

import inquirer from "inquirer";

import { LANGSMITH_API_URL } from "../evals/agent/cases";
import {
  FIND_DEMOS_SYSTEM_PROMPT,
  LIFT_RESEARCH_SYSTEM_PROMPT,
  TRAINER_SYSTEM_PROMPT,
} from "../src/features/agent/prompt";
import {
  chatPromptManifest,
  type PromptHubEntry,
} from "../src/features/agent/langsmith-prompt";
import {
  FIND_DEMOS_PROMPT_HUB_NAME,
  LIFT_RESEARCH_PROMPT_HUB_NAME,
  TRAINER_PROMPT_HUB_NAME,
  YOUTUBE_IMPORT_PROMPT_HUB_NAME,
} from "../src/features/agent/prompt-hub";
import {
  YOUTUBE_IMPORT_PROMPT_TEMPLATE,
} from "../src/features/workouts/import-prompt";

const API_URL = process.env.LANGSMITH_ENDPOINT?.trim() || LANGSMITH_API_URL;

const HUB_PROMPTS: PromptHubEntry[] = [
  {
    name: TRAINER_PROMPT_HUB_NAME,
    description: "Epic Gains fitness trainer agent system prompt",
    tags: ["agent", "trainer"],
    role: "system",
    template: TRAINER_SYSTEM_PROMPT,
    inputVariables: [],
  },
  {
    name: LIFT_RESEARCH_PROMPT_HUB_NAME,
    description: "Lift research subagent system prompt",
    tags: ["agent", "research"],
    role: "system",
    template: LIFT_RESEARCH_SYSTEM_PROMPT,
    inputVariables: [],
  },
  {
    name: FIND_DEMOS_PROMPT_HUB_NAME,
    description: "Demo and alternative-move finder (catalog first, then web)",
    tags: ["agent", "demos"],
    role: "system",
    template: FIND_DEMOS_SYSTEM_PROMPT,
    inputVariables: [],
  },
  {
    name: YOUTUBE_IMPORT_PROMPT_HUB_NAME,
    description: "YouTube workout import extraction prompt",
    tags: ["import", "youtube"],
    role: "human",
    template: YOUTUBE_IMPORT_PROMPT_TEMPLATE,
    inputVariables: ["YOUTUBE_URL"],
  },
];

function printHelp() {
  console.log(`Usage: pnpm ai:prompts:langsmith -- [options]

Pushes local prompts to the LangSmith Prompt Hub via the langsmith CLI.

Options:
  --push               Skip the interactive picker and push every prompt
  --name <handle>      Only push this repo handle (trainer-agent, lift-research-agent, find-demos-agent, youtube-import)
  --api-url <url>      Default ${LANGSMITH_API_URL}
  -h, --help
`);
}

function cli() {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== "--"),
    options: {
      push: { type: "boolean" },
      name: { type: "string" },
      "api-url": { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    strict: true,
    allowPositionals: false,
  });
  return values;
}

function langsmith(args: string[], apiUrl: string) {
  const result = runLangsmith(args, apiUrl);
  if (result.status !== 0) {
    throw new Error(result.output || `langsmith ${args.join(" ")} failed`);
  }
  return result.output;
}

function runLangsmith(args: string[], apiUrl: string) {
  const result = spawnSync(
    "langsmith",
    ["--api-url", apiUrl, "--format", "json", ...args],
    {
      encoding: "utf8",
      env: process.env,
    },
  );
  return {
    status: result.status ?? 1,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim(),
  };
}

function parseJson(stdout: string) {
  const objectStart = stdout.indexOf("{");
  const arrayStart = stdout.indexOf("[");
  const start =
    objectStart === -1
      ? arrayStart
      : arrayStart === -1
        ? objectStart
        : Math.min(objectStart, arrayStart);
  if (start === -1) {
    throw new Error(`Expected JSON from langsmith CLI:\n${stdout}`);
  }
  return JSON.parse(stdout.slice(start)) as unknown;
}

type ListedPrompt = {
  repo_handle?: string;
  full_name?: string;
  owner?: string | null;
  repos?: ListedPrompt[];
};

function listedPrompts(apiUrl: string): ListedPrompt[] {
  const raw = parseJson(langsmith(["prompt", "list", "--limit", "100"], apiUrl));
  if (Array.isArray(raw)) return raw as ListedPrompt[];
  if (raw && typeof raw === "object" && Array.isArray((raw as ListedPrompt).repos)) {
    return (raw as ListedPrompt).repos ?? [];
  }
  return [];
}

function findListed(apiUrl: string, name: string) {
  return listedPrompts(apiUrl).find(
    (item) => item.repo_handle === name || item.full_name?.endsWith(`/${name}`),
  );
}

function promptIdentifier(entry: PromptHubEntry, listed?: ListedPrompt) {
  const owner = listed?.owner?.trim();
  if (owner) return `${owner}/${entry.name}`;
  // Private workspace prompts often have a null owner; "-" is the current tenant.
  return `-/${entry.name}`;
}

function ensureRepo(entry: PromptHubEntry, apiUrl: string) {
  const existing = findListed(apiUrl, entry.name);
  if (existing) return promptIdentifier(entry, existing);

  langsmith(
    [
      "prompt",
      "create",
      "--name",
      entry.name,
      "--description",
      entry.description,
      "--tags",
      entry.tags.join(","),
    ],
    apiUrl,
  );

  return promptIdentifier(entry, findListed(apiUrl, entry.name));
}

function latestCommitParent(identifier: string, apiUrl: string): string | undefined {
  const raw = parseJson(
    langsmith(["api", `commits/${identifier}`, "-X", "GET", "-F", "limit=1"], apiUrl),
  );
  const commits =
    raw && typeof raw === "object" && Array.isArray((raw as { commits?: unknown[] }).commits)
      ? (raw as { commits: Array<{ id?: string; commit_hash?: string }> }).commits
      : [];
  return commits[0]?.commit_hash ?? commits[0]?.id;
}

function pushPrompt(entry: PromptHubEntry, apiUrl: string) {
  const identifier = ensureRepo(entry, apiUrl);
  const parentCommit = latestCommitParent(identifier, apiUrl);
  const dir = mkdtempSync(path.join(os.tmpdir(), "langsmith-prompt-"));
  const file = path.join(dir, `${entry.name}.json`);
  writeFileSync(
    file,
    `${JSON.stringify(
      {
        description: `Sync ${entry.name} from epic-gains-next`,
        manifest: chatPromptManifest(entry),
        ...(parentCommit ? { parent_commit: parentCommit } : {}),
      },
      null,
      2,
    )}\n`,
  );
  const pushed = runLangsmith(
    ["api", `commits/${identifier}`, "--input", file],
    apiUrl,
  );
  if (pushed.status !== 0) {
    if (pushed.output.includes("Nothing to commit")) {
      return { identifier, pushed: "unchanged (already matches latest commit)" };
    }
    throw new Error(pushed.output || `Failed to push ${identifier}`);
  }
  return { identifier, pushed: pushed.output };
}

async function main() {
  const parsed = cli();
  if (parsed.help) {
    printHelp();
    return;
  }

  const apiUrl = parsed["api-url"]?.trim() || API_URL;

  let selected = HUB_PROMPTS;
  if (parsed.name?.trim()) {
    selected = HUB_PROMPTS.filter((entry) => entry.name === parsed.name?.trim());
    if (selected.length === 0) {
      throw new Error(`Unknown prompt handle: ${parsed.name ?? ""}`);
    }
  } else if (!parsed.push) {
    const prompted = await inquirer.prompt<{ names: string[] }>([
      {
        type: "checkbox",
        name: "names",
        message: "Prompts to push to LangSmith",
        choices: HUB_PROMPTS.map((entry) => ({
          name: `${entry.name} — ${entry.description}`,
          value: entry.name,
          checked: true,
        })),
      },
    ]);
    selected = HUB_PROMPTS.filter((entry) => prompted.names.includes(entry.name));
  }

  if (selected.length === 0) {
    console.log("Nothing to push.");
    return;
  }

  for (const entry of selected) {
    const { identifier, pushed } = pushPrompt(entry, apiUrl);
    console.log(`Pushed ${identifier}`);
    if (pushed) console.log(pushed);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
