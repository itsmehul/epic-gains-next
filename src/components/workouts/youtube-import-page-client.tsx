"use client";

import { IconCheck, IconCopy, IconExternalLink } from "@/components/ui/icons";
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
import { ApiError } from "@/shared/api";
import { cn } from "@/shared/utils";

function generateAiPrompt(url: string) {
  const cleanUrl = url.trim();
  return `You are an expert fitness analyst, exercise physiologist, and workout video parser.

Analyze the following YouTube workout video:
${cleanUrl}

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
      if (err instanceof ApiError && err.status === 409) {
        const existingId =
          err.body &&
            typeof err.body === "object" &&
            "existingWorkoutId" in err.body
            ? String(
              (err.body as { existingWorkoutId?: string }).existingWorkoutId ??
              "",
            )
            : "";
        if (existingId) {
          router.push(`/workouts/${existingId}`);
          return;
        }
      }
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
