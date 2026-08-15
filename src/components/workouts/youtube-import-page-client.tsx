"use client";

import { IconCheck, IconCopy, IconExternalLink } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type FormEvent } from "react";

import {
  AppShellBody,
  AppShellHeader,
  AppShellScroll,
} from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useImportFullWorkout } from "@/features/workouts/hooks";
import { importWorkoutStructureSchema } from "@/features/workouts/schemas";
import { getYouTubeVideoId } from "@/features/workouts/youtube";
import { cn } from "@/shared/utils";

function generateAiPrompt(url: string) {
  const cleanUrl = url.trim();
  return `You are a fitness expert and exercise analyst. I will provide you with a YouTube workout video (either by pasting the video link, uploading the transcript, or attaching a video/audio clip).

Your task is to analyze the video and return a structured, exercise-by-exercise breakdown with accurate timestamps strictly as valid JSON. Do not include any introductory or concluding text, Markdown formatting around the JSON, or explanations outside the JSON structure.

### What to include:
- List **only actual exercise moves** performed in the video.
- Do **not** return rest, recovery, rest periods, breaks, transitions, or "catch your breath" gaps as exercises. Skip them entirely — they are not items in \`exercises\`.
- If a chapter, overlay, or caption is named Rest / Recovery / Break, ignore it. Use the next real move instead.

### Timestamps & Interval Instructions:
1. **Timestamp Meaning**: Each exercise's \`timestamp\` MUST be the EXACT start time in the video when THAT specific exercise actually begins — the first rep, the first hold, or the first movement of that move.
2. **Do not use**: section/chapter titles, intro talk, countdowns, rest after the previous move, "next up" previews, or the start of a warm-up/HIIT block. If the trainer talks or rests and then starts the move, timestamp the move, not the talk/rest.
3. **Example**: If Arm Circles begin at 01:21 after a rest or intro, use \`01:21\` — not the rest start, not the Warm-Up chapter start.
4. **Sequential Accuracy**: Timestamps across all sections must be strictly increasing chronological start markers of real exercises only.
5. **Format**: Use clean clock format \`MM:SS\` or \`HH:MM:SS\` (e.g. \`01:21\` or \`01:05:30\`, do NOT include square brackets).

### Timestamp Validation Rules:
1. Format: Use strict \`MM:SS\` format for videos under 1 hour, and \`HH:MM:SS\` ONLY if the video duration is 1 hour or longer.
2. Upper Bound Check: Every timestamp MUST be less than or equal to the total video runtime. If the video length is 13:13, no timestamp can exceed 13:13.
3. No Leading Hour Padding: Do NOT prepend \`01:\` or \`00:\` to standard minutes (e.g., write \`11:18\`, NOT \`01:11:18\` or \`00:11:18\`).

### Metric Profile Rules:
Assign a \`metric_profile\` enum to each exercise based on these rules:
- \`WEIGHT_REPS\`: External load exercises with reps (e.g., Bench Press, Squat, Dumbbell Curl)
- \`BODYWEIGHT_REPS\`: Unweighted bodyweight exercises with reps (e.g., Push-ups, Air Squats, Jumping Jacks)
- \`WEIGHTED_REPS\`: Bodyweight exercises with added external load (e.g., Weighted Pull-ups, Weighted Dips)
- \`TIMED_HOLD\`: Isometric holds, static tension, or duration-based holds (e.g., Plank, Wall Sit, Hollow Hold)
- \`CARDIO_DISTANCE\`: Locomotion or spatial movement cardio (e.g., Running, Cycling, Rowing)
- \`LOADED_CARRY\`: Spatial movement with load (e.g., Farmer's Walk, Sled Push)
- \`CUSTOM\`: User-defined or custom tracking parameters

### Muscle Group Rules:
Assign a \`muscle_group\` enum to each exercise based on the primary target:
- \`chest\`: Pushing horizontal/decline/incline chest work (e.g., Push-ups, Bench Press, Chest Fly)
- \`back\`: Pulling and posterior chain upper work (e.g., Rows, Pull-ups, Lat Pulldown)
- \`shoulders\`: Deltoid-dominant work (e.g., Overhead Press, Lateral Raise, Arm Circles)
- \`arms\`: Elbow-dominant isolation (e.g., Bicep Curl, Tricep Dip, Skull Crusher)
- \`legs\`: Lower body (e.g., Squat, Lunge, Glute Bridge, Calf Raise)
- \`core\`: Abdominals, obliques, and spinal stability (e.g., Plank, Crunch, Dead Bug)

If a move is truly full-body cardio with no primary muscle (e.g., Jumping Jacks, Running), pick the closest dominant group or omit \`muscle_group\`.

### Target/Suggested Performance Data Rules:
Extract any suggested or prescribed performance parameters mentioned or implied in the video (e.g., on-screen overlay text, trainer cues, description, or interval pattern):
- \`suggested_sets\`: Number of sets (e.g., 3 if 3 rounds/sets, or 1 for follow-along circuit).
- \`suggested_reps\`: Repetition count per set if specified (e.g., 10, 12, or 15).
- \`suggested_weight\`: Prescribed weight in kilograms if specified (e.g., 20 or 50.5; convert lbs to kg if needed).
- \`suggested_time\`: Target duration in seconds per set if timed/isometric (e.g., 40 for 40 seconds).
- \`suggested_distance\`: Target distance in meters if specified (e.g., 100 or 400).
Omit any metric field if not specified for that exercise.

### Key Muscles Rules:
Assign \`key_muscles\` as an array of specific anatomical muscle names that this move actually uses (not the broad group). Use standard Latin/anatomical names when they add precision (e.g. \`Tibialis Anterior\`, \`Peroneus Tertius\`, \`Rectus Abdominis\`, \`Gluteus Medius\`, \`Latissimus Dorsi\`). Include 1–6 muscles, primary first. Omit the field or use \`[]\` when the move is generic cardio with no clear targeted muscles.

### JSON Structure Requirements:
Return a JSON object matching this schema inside a markdown code block. Do not include any extra text:

{
  "workoutName": "string (optional exact video title if known)",
  "author": "string (optional creator/channel name)",
  "channelUrl": "string (optional YouTube channel URL, e.g. https://www.youtube.com/@handle)",
  "overview": {
    "workout_length": "string (e.g., '20 minutes' or '40 minutes')",
    "structure": "string (e.g., 'Full Body Circuit')",
    "interval_pattern": "string (e.g., '40 seconds per exercise')",
    "equipment_needed": ["string"]
  },
  "sections": [
    {
      "section_name": "string (e.g., 'Warm-Up', 'Upper Body', 'Core', 'HIIT', 'Cool Down')",
      "exercises": [
        {
          "name": "string (clear, standard exercise name for this move; never Rest, Recovery, or Break)",
          "timestamp": "string (EXACT start of THIS exercise's first movement in MM:SS or HH:MM:SS, e.g. '01:21' — not rest, intro, or section start)",
          "metric_profile": "string (ONE of: 'WEIGHT_REPS', 'BODYWEIGHT_REPS', 'WEIGHTED_REPS', 'TIMED_HOLD', 'CARDIO_DISTANCE', 'LOADED_CARRY', 'CUSTOM')",
          "muscle_group": "string (ONE of: 'chest', 'back', 'shoulders', 'arms', 'legs', 'core')",
          "key_muscles": ["string (anatomical names, e.g. 'Tibialis Anterior', 'Peroneus Tertius')"],
          "suggested_sets": "number (optional default number of sets to perform, e.g. 3)",
          "suggested_reps": "number (optional target repetitions per set, e.g. 10 or 12)",
          "suggested_weight": "number (optional recommended weight in kg, e.g. 20 or 50.5)",
          "suggested_time": "number (optional target duration per set in seconds, e.g. 40 or 60)",
          "suggested_distance": "number (optional target distance per set in meters, e.g. 100 or 400)"
        }
      ]
    }
  ]
}

Here is the video link / transcript / information:
${cleanUrl}`;
}

const STEPS = [
  { id: 1, label: "Video URL" },
  { id: 2, label: "Copy prompt" },
  { id: 3, label: "Paste JSON" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function YoutubeImportPageClient() {
  const router = useRouter();
  const urlId = useId();
  const jsonId = useId();
  const [step, setStep] = useState<StepId>(1);
  const [maxReached, setMaxReached] = useState<StepId>(1);
  const [videoUrl, setVideoUrl] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const importWorkout = useImportFullWorkout();

  const youtubeValid = Boolean(getYouTubeVideoId(videoUrl.trim()));
  const promptText = useMemo(() => generateAiPrompt(videoUrl), [videoUrl]);

  function goToStep(next: StepId) {
    if (next > maxReached) return;
    setError(null);
    setStep(next);
  }

  function advanceTo(next: StepId) {
    setMaxReached((current) => (next > current ? next : current));
    setError(null);
    setStep(next);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API fails
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);

    let parsedJson: unknown;
    try {
      let cleaned = jsonInput.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned
          .replace(/^```(?:json)?/i, "")
          .replace(/```$/, "")
          .trim();
      }
      parsedJson = JSON.parse(cleaned);
    } catch {
      setError(
        "Invalid JSON format. Please make sure you copied valid JSON output.",
      );
      return;
    }

    const payload =
      parsedJson && typeof parsedJson === "object"
        ? {
            sourceVideoUrl: videoUrl.trim() || undefined,
            ...(parsedJson as Record<string, unknown>),
          }
        : parsedJson;
    const validated = importWorkoutStructureSchema.safeParse(payload);
    if (!validated.success) {
      const issue =
        validated.error.issues[0]?.message ??
        "JSON structure does not match the required schema";
      setError(issue);
      return;
    }

    try {
      const workout = await importWorkout.mutateAsync(validated.data);
      router.push(`/workouts/${workout.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import workout");
    }
  }

  const urlTouched = videoUrl.trim().length > 0;
  const canCreate = jsonInput.trim().length > 0 && !importWorkout.isPending;

  return (
    <AppShellScroll>
      <AppShellHeader backHref="/workouts" title="Import from YouTube" />
      <AppShellBody className="p-4 md:p-6">
        <ol className="flex flex-col">
          {STEPS.map((item, index) => {
            const reachable = item.id <= maxReached;
            const active = item.id === step;
            const completed = item.id < maxReached;
            const last = index === STEPS.length - 1;

            return (
              <li key={item.id} className="flex gap-3">
                <div className="flex w-7 shrink-0 flex-col items-center self-stretch">
                  <button
                    type="button"
                    disabled={!reachable}
                    aria-current={active ? "step" : undefined}
                    aria-label={`Go to ${item.label}`}
                    onClick={() => goToStep(item.id)}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-xs font-medium",
                      active
                        ? "bg-primary text-primary-foreground"
                        : completed
                          ? "bg-primary/15 text-primary hover:bg-primary/25"
                          : reachable
                            ? "bg-muted text-muted-foreground hover:text-foreground"
                            : "cursor-not-allowed bg-muted text-muted-foreground",
                    )}
                  >
                    {completed && !active ? (
                      <IconCheck className="size-3.5" />
                    ) : (
                      item.id
                    )}
                  </button>
                  {last ? null : (
                    <span
                      aria-hidden
                      className={cn(
                        "my-1 w-px flex-1 min-h-6",
                        item.id < maxReached ? "bg-primary" : "bg-border",
                      )}
                    />
                  )}
                </div>

                <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-8")}>
                  <button
                    type="button"
                    disabled={!reachable}
                    onClick={() => goToStep(item.id)}
                    className={cn(
                      "flex min-h-7 items-center text-left text-sm font-medium tracking-tight",
                      active
                        ? "text-foreground"
                        : reachable
                          ? "text-muted-foreground hover:text-foreground"
                          : "cursor-not-allowed text-muted-foreground/60",
                    )}
                  >
                    {item.label}
                  </button>

                  {active && item.id === 1 ? (
                    <form
                      className="mt-3 flex flex-col gap-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!youtubeValid) return;
                        advanceTo(2);
                      }}
                    >
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={urlId} className="sr-only">
                          YouTube URL
                        </Label>
                        <Input
                          id={urlId}
                          type="url"
                          placeholder="https://www.youtube.com/watch?v=..."
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          autoFocus
                          required
                          aria-invalid={urlTouched && !youtubeValid}
                        />
                        {urlTouched && !youtubeValid ? (
                          <p className="text-destructive text-xs" role="alert">
                            Paste a YouTube video link (watch, youtu.be, Shorts,
                            or Live).
                          </p>
                        ) : null}
                      </div>
                      <Button type="submit" disabled={!youtubeValid}>
                        Next: Copy Prompt
                      </Button>
                    </form>
                  ) : null}

                  {active && item.id === 2 ? (
                    <div className="mt-3 flex flex-col gap-3">
                      <p className="text-sm text-muted-foreground">
                        Copy this prompt and paste it in Gemini, then copy the
                        result and paste it in the next step.
                      </p>
                      <pre className="bg-muted/60 max-h-[min(28rem,50dvh)] overflow-y-auto rounded-xl p-3 font-mono text-xs whitespace-pre-wrap select-all">
                        {promptText}
                      </pre>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => void handleCopy()}
                      >
                        {copied ? (
                          <>
                            <IconCheck className="size-4 text-emerald-500" />
                            Copied to Clipboard
                          </>
                        ) : (
                          <>
                            <IconCopy className="size-4" />
                            Copy Prompt
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => {
                          window.open(
                            "https://gemini.google.com/app",
                            "_blank",
                            "noopener,noreferrer",
                          );
                        }}
                      >
                        <IconExternalLink className="size-4" />
                        Open Gemini
                      </Button>
                      <Button type="button" onClick={() => advanceTo(3)}>
                        Next: Paste JSON Output
                      </Button>
                    </div>
                  ) : null}

                  {active && item.id === 3 ? (
                    <form
                      className="mt-3 flex flex-col gap-3"
                      onSubmit={(e) => void handleCreate(e)}
                    >
                      <div className="flex flex-col gap-2">
                        <Label
                          className="text-sm font-medium text-muted-foreground"
                          htmlFor={jsonId}
                        >
                          AI generated JSON output
                        </Label>
                        <Textarea
                          id={jsonId}
                          rows={16}
                          placeholder='{\n  "overview": { ... },\n  "sections": [ ... ]\n}'
                          value={jsonInput}
                          onChange={(e) => {
                            setJsonInput(e.target.value);
                            setError(null);
                          }}
                          className="field-sizing-fixed max-h-[min(28rem,50dvh)] min-h-48 overflow-y-auto font-mono text-xs"
                          autoFocus
                        />
                        {error ? (
                          <p className="text-destructive text-xs" role="alert">
                            {error}
                          </p>
                        ) : null}
                      </div>
                      <Button type="submit" disabled={!canCreate}>
                        {importWorkout.isPending ? (
                          <>
                            <Spinner className="size-4" />
                            Creating Workout…
                          </>
                        ) : (
                          "Create Workout"
                        )}
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </AppShellBody>
    </AppShellScroll>
  );
}
