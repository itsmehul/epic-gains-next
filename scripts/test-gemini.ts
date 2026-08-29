import "dotenv/config";

import {
  createGoogle,
  type GoogleProviderMetadata,
} from "@ai-sdk/google";
import { generateText } from "ai";
import inquirer from "inquirer";

import { extractYoutubeWatchUrls } from "../src/shared/youtube";

const DEFAULT_MODEL = "gemini-3.7-flash";

const generationConfig = {
  maxOutputTokens: 65536,
  topP: 0.95,
  thinkingLevel: "medium" as const,
};

const DEFAULT_PROMPT = `You are an expert fitness analyst, exercise physiologist, and workout video parser.

Analyze the following YouTube workout video:
https://www.youtube.com/watch?v=FYl9d5U8QDY

Your task is to analyze the video and return a structured, exercise-by-exercise breakdown with pinpoint accurate timestamps strictly as valid JSON. Do not include any conversational intro/outro text, Markdown formatting outside the code block, or commentary.

---

### Core Extraction Rules

1. **Only Real Exercise Moves**: List only actual exercises/stretches performed.
2. **Filter Out Gaps**: Never include rest periods, water breaks, transitions, or "catch your breath" buffers as exercise entries.
3. **Ignore Non-Exercise Chapters**: If a video chapter or overlay is titled "Rest", "Break", "Intro", or "Preview", skip it.

---

### Exercise Naming & Normalization Rules (CRITICAL)

1. **Standard Canonical Names**: Use standard, generic exercise names (e.g., \`Incline Dumbbell Press\`, \`Barbell Bench Press\`, \`Lat Pulldown\`).
2. **Strip Incline Degrees & Angles**: Actively omit specific angle measurements, incline heights, or bench notch settings (e.g., strictly use \`Incline Dumbbell Press\` instead of \`Incline Dumbbell Press (25° Low Incline)\`, \`25° Incline Dumbbell Press\`, or \`Low Incline Dumbbell Press\`).
3. **Omit Form & Grip Modifiers**: Drop parenthetical notes, grip widths, or descriptive execution cues (e.g., \`Pec Deck Fly\` instead of \`Bent Arm Pec Deck Fly\`; \`Upright Row\` instead of \`Close-Grip Barbell Upright Row\`) unless it defines an entirely separate canonical movement.

---

### Timestamp Accuracy & Synchronization Rules (CRITICAL)

To achieve second-level accuracy on follow-along workouts, follow these synchronization heuristics:

1. **Detect the Workout Cadence / Interval Grid**:
   - Most follow-along workouts run on a strict mathematical interval grid (e.g., exactly 60s per block, 45s work / 15s rest, 40s work / 20s rest, or 30s intervals).
   - Identify the repeating time grid (e.g., starting at \`:15\` or \`:00\` of every minute). All exercise starts should lock to this underlying interval grid.

2. **Visual & Audio Start Triggers (Prioritize Over Speech)**:
   - **On-Screen Timer / Progress Bar**: The timestamp is the exact second the round countdown timer appears or resets (e.g., when a 60s or 45s clock begins).
   - **Audio Chimes / Beeps**: The timestamp is the exact moment the transition sound effect plays (e.g., 3-2-1 beep, whistle, or bell ding).
   - **Title Overlay**: The moment the on-screen banner/text announcing the current exercise appears.
   - **First Rep / Movement**: If no timer/beeps exist, use the exact second the instructor enters position and initiates the first repetition or static hold.

3. **Beware the "Mid-Set Verbal Cue" Trap**:
   - In coached workouts, instructors often talk through form during the first 10–15 seconds of an interval before saying *"let's begin"*, *"start"*, or *"here we go"*.
   - **DO NOT** timestamp when the coach says *"let's begin"* mid-round. Timestamp the start of the round/timer itself.

4. **Timestamp Format & Bounds**:
   - Use \`MM:SS\` format (e.g., \`05:15\`). Use \`HH:MM:SS\` ONLY if total duration is 1 hour or longer.
   - Do NOT prepend \`00:\` or \`01:\` to standard minute timestamps (e.g., write \`11:18\`, not \`00:11:18\` or \`01:11:18\`).
   - Timestamps must be strictly ascending and never exceed the total video length.

---

### Classification & Metadata Rules

#### 1. \`metric_profile\` (Choose exactly one):
- \`BODYWEIGHT_REPS\`: Unweighted bodyweight movements with repetitions (e.g., Push-ups, Squats, Mobility Rocks).
- \`WEIGHT_REPS\`: Exercises with external resistance (e.g., Dumbbell Press, Barbell Deadlift).
- \`WEIGHTED_REPS\`: Bodyweight exercises with added load (e.g., Weighted Pull-ups).
- \`TIMED_HOLD\`: Static isometric holds or timed stretch positions (e.g., Plank, Deep Squat Hold, Happy Baby).
- \`CARDIO_DISTANCE\`: Locomotion/distance-based cardio (e.g., Running, Rowing).
- \`LOADED_CARRY\`: Moving while holding weight (e.g., Farmer's Walk).
- \`CUSTOM\`: Special tracking parameters.

#### 2. \`muscle_group\` (Choose primary target):
- \`chest\` | \`back\` | \`shoulders\` | \`arms\` | \`legs\` | \`core\`

#### 3. \`key_muscles\`:
- 1–6 specific anatomical muscle names (e.g., \`["Gluteus Medius", "Tensor Fasciae Latae", "Piriformis"]\`). Primary muscles first.

#### 4. Prescribed Target Metrics (Extract if present/implied):
- \`suggested_sets\`: Number of sets (typically \`1\` for follow-along circuits/mobility flows).
- \`suggested_reps\`: Target repetitions if specified.
- \`suggested_time\`: Target duration in seconds per round/interval (e.g., \`45\` or \`60\`).
- \`suggested_weight\`: Prescribed load in kg if applicable.

---

### Output JSON Schema

Return ONLY the JSON object inside a single markdown code block:

\`\`\`json
{
  "workoutName": "string (Exact video title)",
  "author": "string (Channel/Creator name)",
  "channelUrl": "string (YouTube channel URL)",
  "overview": {
    "workout_length": "string (e.g., '30 minutes')",
    "structure": "string (e.g., 'Full Body Mobility Flow')",
    "interval_pattern": "string (e.g., '60s intervals per exercise')",
    "equipment_needed": ["string"]
  },
  "sections": [
    {
      "section_name": "string (e.g., 'Full Body Mobility')",
      "exercises": [
        {
          "name": "string (Canonical name without angles, degrees, or parenthetical form cues)",
          "timestamp": "string (MM:SS start aligned to timer/beep/movement)",
          "metric_profile": "string",
          "muscle_group": "string",
          "key_muscles": ["string"],
          "suggested_sets": 1,
          "suggested_time": 60
        }
      ]
    }
  ]
}
\`\`\``;

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
