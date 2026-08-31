import "dotenv/config";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import inquirer from "inquirer";

import { generateYoutubeImportPrompt } from "../src/features/workouts/import-prompt";
import { extractYoutubeWatchUrls } from "../src/shared/youtube";

const DEFAULT_MODEL = "google/gemini-3.6-flash";

const generationConfig = {
  maxOutputTokens: 65536,
  topP: 0.95,
  thinkingEffort: "medium" as const,
};

const DEFAULT_PROMPT = generateYoutubeImportPrompt(
  "https://www.youtube.com/watch?v=FYl9d5U8QDY",
);

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Add it to .env and retry.",
    );
  }

  const { prompt, model } = await inquirer.prompt<{
    prompt: string;
    model: string;
  }>([
    {
      type: "input",
      name: "model",
      message: "OpenRouter Gemini model",
      default: DEFAULT_MODEL,
    },
    {
      type: "editor",
      name: "prompt",
      message: "Prompt",
      default: DEFAULT_PROMPT,
      validate: (value: string) =>
        value.trim().length > 0 || "prompt is required",
    },
  ]);

  const text = prompt.trim();
  const youtubeUrls = extractYoutubeWatchUrls(text);
  if (youtubeUrls.length === 0) {
    throw new Error(
      "Prompt must include a YouTube URL so Gemini can watch the video (not guess from the link text).",
    );
  }

  console.log("Attaching video:", youtubeUrls.join(", "));

  const openrouter = createOpenRouter({ apiKey });
  const { text: output, sources, usage, providerMetadata } =
    await generateText({
      model: openrouter(model.trim()),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text },
            ...youtubeUrls.map((url) => ({
              type: "file" as const,
              data: url,
              mediaType: "video/mp4",
            })),
          ],
        },
      ],
      tools: {
        web_search: openrouter.tools.webSearch({ engine: "native" }),
      },
      maxOutputTokens: generationConfig.maxOutputTokens,
      topP: generationConfig.topP,
      providerOptions: {
        openrouter: {
          reasoning: {
            effort: generationConfig.thinkingEffort,
          },
        },
      },
    });

  console.log("\n--- response ---\n");
  console.log(output);

  if (sources?.length) {
    console.log("\n--- sources ---");
    console.log(sources);
  }
  if (providerMetadata?.openrouter) {
    console.log("\n--- openrouter ---");
    console.log(providerMetadata.openrouter);
  }
  if (usage) {
    console.log("\n--- usage ---");
    console.log(usage);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
