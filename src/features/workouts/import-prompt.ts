import { IMPORT_VIDEO_ELIGIBILITY_RULES } from "@/features/workouts/import-eligibility";

export const YOUTUBE_IMPORT_URL_PLACEHOLDER = "{{YOUTUBE_URL}}";

export function generateYoutubeImportPrompt(url: string) {
  const cleanUrl = url.trim();
  return `You are an expert fitness analyst, exercise physiologist, and workout video parser.

Analyze the following YouTube workout video:
${cleanUrl}

Your task is to analyze the video and return a structured, exercise-by-exercise breakdown with pinpoint accurate timestamps strictly as valid JSON. Do not include any conversational intro/outro text, Markdown formatting outside the code block, or commentary.

---

${IMPORT_VIDEO_ELIGIBILITY_RULES}

---

### Core Extraction Rules

1. **Only Real Exercise Moves**: List only actual exercises/stretches performed.
2. **Filter Out Gaps**: Never include rest periods, water breaks, transitions, or "catch your breath" buffers as exercise entries.
3. **Ignore Non-Exercise Chapters**: If a video chapter or overlay is titled "Rest", "Break", "Intro", or "Preview", skip it.
4. **Extract Workout Chapters**: When the video has real chapters/blocks — YouTube chapters, on-screen section titles, or spoken labels such as \`Warm Up\`, \`Cooldown\`, \`Day 1\`, \`Day 2\`, \`Circuit 1\`, \`Upper Body\` — put that label on each move as optional \`chapter\`. Omit \`chapter\` entirely if there are no chapters. Do not invent chapters.

---

### Exercise Naming & Normalization Rules (CRITICAL)

1. **Standard Canonical Names**: Use standard, generic exercise names (e.g., \`Incline Dumbbell Press\`, \`Barbell Bench Press\`, \`Lat Pulldown\`).
2. **Strip Incline Degrees & Angles**: Actively omit specific angle measurements, incline heights, or bench notch settings (e.g., strictly use \`Incline Dumbbell Press\` instead of \`Incline Dumbbell Press (25° Low Incline)\`, \`25° Incline Dumbbell Press\`, or \`Low Incline Dumbbell Press\`).
3. **Omit Form & Grip Modifiers**: Drop parenthetical notes, grip widths, or descriptive execution cues (e.g., \`Pec Deck Fly\` instead of \`Bent Arm Pec Deck Fly\`; \`Upright Row\` instead of \`Close-Grip Barbell Upright Row\`) unless it defines an entirely separate canonical movement.

---

### Timestamp Accuracy & Synchronization Rules (CRITICAL)

Record the **exact video clock** when each move starts. Write the second you see (\`00:50\`, \`01:25\`, \`01:58\`). Never round to the nearest \`:00\` or \`:30\`.

1. **Interval pattern is metadata, not a timestamp source**:
   - Detect cadence (e.g. 30s work / 30s rest) for \`overview.interval_pattern\` and \`suggested_time\` only.
   - Do **not** invent a synthetic grid — including a constant offset of a grid (\`06:53\`, \`07:53\`, \`08:53\` is the same failure as \`07:00\`, \`08:00\`, \`09:00\`).
   - In a 30s work / 30s rest block, consecutive **work** starts are usually 58–62s apart and the seconds-of-minute **change** (\`07:00\`, \`07:57\`, \`08:58\`). If every start shares the same \`:SS\`, you guessed.
   - Skip rest / water / "catch your breath" entirely. The next row is the next **work** start. The server fills clip ends from the next start.

   Wrong: \`07:00, 08:00, 09:00, 10:00\` or \`06:53, 07:53, 08:53, 09:53\`
   Right: \`07:00, 07:57, 08:58, 09:58\`

2. **Visual & Audio Start Triggers (Prioritize Over Speech)**:
   - **On-Screen Timer / Progress Bar**: The exact second the round countdown appears or resets.
   - **Audio Chimes / Beeps**: The exact moment the transition sound plays (3-2-1 beep, whistle, ding).
   - **Title Overlay**: The moment the on-screen banner announcing the current exercise appears.
   - **First Rep / Movement**: If no timer/beeps exist, the second the instructor initiates the first rep or hold.

3. **One labelled move = one row**:
   - If the same move runs across two consecutive work slots (e.g. hamstring sweeps for 60s on a 30s grid), emit **one** exercise at the first start with \`suggested_time\` equal to total work seconds. Do not duplicate the name.

4. **Beware the "Mid-Set Verbal Cue" Trap**:
   - Instructors often talk through form for 10–15 seconds before saying *"let's begin"*. Timestamp the timer/beep/overlay, not the spoken "start".

5. **Timestamp Format & Bounds**:
   - Use \`MM:SS\` (e.g., \`05:15\`). Use \`HH:MM:SS\` only if the video is 1 hour or longer.
   - Do NOT prepend \`00:\` or \`01:\` (write \`11:18\`, not \`00:11:18\`).
   - Timestamps must be strictly ascending and never exceed the video length.

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

If the video is eligible, return ONLY the JSON object inside a single markdown code block:

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
  "exercises": [
    {
      "name": "string (Canonical name without angles, degrees, or parenthetical form cues)",
      "timestamp": "string (exact MM:SS on the video clock — not rounded)",
      "chapter": "string (optional: 'Warm Up', 'Cooldown', 'Day 1' — omit if none)",
      "metric_profile": "string",
      "muscle_group": "string",
      "key_muscles": ["string"],
      "suggested_sets": 1,
      "suggested_time": 60
    }
  ]
}
\`\`\``;
}
