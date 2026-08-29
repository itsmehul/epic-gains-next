import "dotenv/config";

import {
  createGoogle,
  type GoogleProviderMetadata,
} from "@ai-sdk/google";
import { generateText } from "ai";
import inquirer from "inquirer";

import { generateYoutubeImportPrompt } from "../src/features/workouts/import-prompt";
import { extractYoutubeWatchUrls } from "../src/shared/youtube";

const DEFAULT_MODEL = "gemini-3.7-flash";

const generationConfig = {
  maxOutputTokens: 65536,
  topP: 0.95,
  thinkingLevel: "medium" as const,
};

const DEFAULT_PROMPT = generateYoutubeImportPrompt(
  "https://www.youtube.com/watch?v=FYl9d5U8QDY",
);

async function main() {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env and retry.",
    );
  }

  const { prompt, model } = await inquirer.prompt<{
    prompt: string;
    model: string;
  }>([
    {
      type: "input",
      name: "model",
      message: "Gemini model",
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

  const google = createGoogle({ apiKey });
  const { text: output, sources, usage, providerMetadata } =
    await generateText({
      model: google(model.trim()),
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
        google_search: google.tools.googleSearch({}),
      },
      maxOutputTokens: generationConfig.maxOutputTokens,
      topP: generationConfig.topP,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: generationConfig.thinkingLevel,
          },
        },
      },
    });

  console.log("\n--- response ---\n");
  console.log(output);

  const metadata = providerMetadata?.google as
    | GoogleProviderMetadata
    | undefined;
  if (sources?.length) {
    console.log("\n--- sources ---");
    console.log(sources);
  }
  if (metadata?.groundingMetadata) {
    console.log("\n--- grounding ---");
    console.log(metadata.groundingMetadata);
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
