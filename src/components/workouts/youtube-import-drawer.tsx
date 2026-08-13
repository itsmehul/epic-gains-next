"use client";

import {
  IconCheck,
  IconCopy,
  IconSparkles,
  IconVideo,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useId,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { Button } from "@/components/ui/button";
import {
  FamilyDrawerAnimatedContent,
  FamilyDrawerAnimatedWrapper,
  FamilyDrawerBody,
  FamilyDrawerClose,
  FamilyDrawerContent,
  FamilyDrawerFooter,
  FamilyDrawerHeader,
  FamilyDrawerOverlay,
  FamilyDrawerPortal,
  FamilyDrawerRoot,
  FamilyDrawerSecondaryButton,
  useFamilyDrawer,
  type ViewsRegistry,
} from "@/components/ui/family-drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useImportFullWorkout } from "@/features/workouts/hooks";
import { importWorkoutStructureSchema } from "@/features/workouts/schemas";

function generateAiPrompt(url: string) {
  const cleanUrl = url.trim();
  return `You are a fitness expert and exercise analyst. I will provide you with a YouTube workout video (either by pasting the video link, uploading the transcript, or attaching a video/audio clip).

Your task is to analyze the video and return a structured, exercise-by-exercise breakdown with accurate timestamps strictly as valid JSON. Do not include any introductory or concluding text, Markdown formatting around the JSON, or explanations outside the JSON structure.

### Timestamps & Interval Instructions:
1. **Timestamp Meaning**: Each exercise's \`timestamp\` MUST be the EXACT start time in the video when THAT specific exercise actually begins (e.g. when Arm Circles starts in the video, NOT when the overall warm-up section or intro starts).
2. **Sequential Accuracy**: Timestamps across all sections must be strictly increasing chronological start markers.
3. **Format**: Use clean clock format \`MM:SS\` or \`HH:MM:SS\` (e.g. \`01:21\` or \`01:05:30\`, do NOT include square brackets).

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

### JSON Structure Requirements:
Return a JSON object matching this schema inside a markdown code block. Do not include any extra text:

{
  "workoutName": "string (optional exact video title if known)",
  "author": "string (optional creator/channel name)",
  "overview": {
    "workout_length": "string (e.g., '20 minutes' or '40 minutes')",
    "structure": "string (e.g., 'Full Body Circuit')",
    "interval_pattern": "string (e.g., '40s work / 20s rest')",
    "equipment_needed": ["string"]
  },
  "sections": [
    {
      "section_name": "string (e.g., 'Warm-Up', 'Upper Body', 'Core', 'HIIT', 'Cool Down')",
      "exercises": [
        {
          "name": "string (clear, standard exercise name for this move)",
          "timestamp": "string (EXACT start time of THIS exercise move in MM:SS or HH:MM:SS format, e.g. '01:21')",
          "metric_profile": "string (ONE of: 'WEIGHT_REPS', 'BODYWEIGHT_REPS', 'WEIGHTED_REPS', 'TIMED_HOLD', 'CARDIO_DISTANCE', 'LOADED_CARRY', 'CUSTOM')",
          "muscle_group": "string (ONE of: 'chest', 'back', 'shoulders', 'arms', 'legs', 'core')"
        }
      ]
    }
  ]
}

Here is the video link / transcript / information:
${cleanUrl}`;
}

const YoutubeImportContext = createContext<{
  videoUrl: string;
  setVideoUrl: (url: string) => void;
} | null>(null);

function useYoutubeImportDrawer() {
  const context = useContext(YoutubeImportContext);
  if (!context) {
    throw new Error(
      "YoutubeImportDrawer view must be used within YoutubeImportDrawer",
    );
  }
  return context;
}

function InputUrlView() {
  const { setView } = useFamilyDrawer();
  const { videoUrl, setVideoUrl } = useYoutubeImportDrawer();
  const urlId = useId();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!videoUrl.trim()) return;
    setView("prompt");
  }

  return (
    <form onSubmit={handleSubmit}>
      <FamilyDrawerHeader icon={<IconVideo />} title="Import YouTube Workout" />
      <FamilyDrawerBody className="space-y-3 pt-1">
        <p className="text-sm text-muted-foreground">
          Enter the link to a follow-along YouTube workout video to generate an
          extraction prompt.
        </p>
        <div className="flex flex-col gap-2">
          <Label
            className="text-sm font-medium text-muted-foreground"
            htmlFor={urlId}
          >
            YouTube Video URL
          </Label>
          <Input
            id={urlId}
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            autoFocus
            required
          />
        </div>
      </FamilyDrawerBody>
      <FamilyDrawerFooter>
        <FamilyDrawerSecondaryButton
          type="submit"
          disabled={!videoUrl.trim()}
          className="bg-primary text-primary-foreground"
        >
          Next: Copy Prompt
        </FamilyDrawerSecondaryButton>
      </FamilyDrawerFooter>
    </form>
  );
}

function PromptView() {
  const { setView } = useFamilyDrawer();
  const { videoUrl } = useYoutubeImportDrawer();
  const [copied, setCopied] = useState(false);
  const promptText = generateAiPrompt(videoUrl);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API fails
    }
  }

  return (
    <>
      <FamilyDrawerHeader icon={<IconSparkles />} title="Copy Extraction Prompt" />
      <FamilyDrawerBody className="space-y-3 pt-1">
        <p className="text-sm text-muted-foreground">
          Copy this prompt and run it with ChatGPT, Claude, or Gemini to extract
          the workout JSON, then proceed to the next step.
        </p>
        <pre className="bg-muted/60 max-h-48 overflow-y-auto rounded-xl p-3 font-mono text-xs whitespace-pre-wrap select-all">
          {promptText}
        </pre>
      </FamilyDrawerBody>
      <FamilyDrawerFooter className="flex-col gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full gap-2 rounded-full"
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
        <FamilyDrawerSecondaryButton
          type="button"
          onClick={() => setView("import")}
          className="bg-primary text-primary-foreground"
        >
          Next: Paste JSON Output
        </FamilyDrawerSecondaryButton>
      </FamilyDrawerFooter>
    </>
  );
}

function ImportJsonView() {
  const router = useRouter();
  const { videoUrl } = useYoutubeImportDrawer();
  const jsonId = useId();
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const importWorkout = useImportFullWorkout();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    let parsedJson: unknown;
    try {
      let cleaned = jsonInput.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
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

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      <FamilyDrawerHeader
        icon={<IconSparkles />}
        title="Paste JSON & Create Workout"
      />
      <FamilyDrawerBody className="space-y-3 pt-1">
        <div className="flex flex-col gap-2">
          <Label
            className="text-sm font-medium text-muted-foreground"
            htmlFor={jsonId}
          >
            AI Generated JSON Output
          </Label>
          <Textarea
            id={jsonId}
            rows={8}
            placeholder='{\n  "overview": { ... },\n  "sections": [ ... ]\n}'
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              setError(null);
            }}
            className="field-sizing-fixed max-h-48 min-h-32 overflow-y-auto font-mono text-xs"
            autoFocus
          />
          {error ? (
            <p className="text-destructive text-xs" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </FamilyDrawerBody>
      <FamilyDrawerFooter>
        <FamilyDrawerSecondaryButton
          type="submit"
          disabled={!jsonInput.trim() || importWorkout.isPending}
          className="bg-primary text-primary-foreground"
        >
          {importWorkout.isPending ? (
            <>
              <Spinner className="size-4" />
              Creating Workout…
            </>
          ) : (
            "Create Workout"
          )}
        </FamilyDrawerSecondaryButton>
      </FamilyDrawerFooter>
    </form>
  );
}

const views = {
  default: InputUrlView,
  prompt: PromptView,
  import: ImportJsonView,
} satisfies ViewsRegistry;

export function YoutubeImportDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [videoUrl, setVideoUrl] = useState("");
  const importContext = useMemo(
    () => ({ videoUrl, setVideoUrl }),
    [videoUrl],
  );

  return (
    <YoutubeImportContext.Provider value={importContext}>
      <FamilyDrawerRoot
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setVideoUrl("");
          }
          onOpenChange(next);
        }}
        views={views}
      >
        <FamilyDrawerPortal>
          <FamilyDrawerOverlay />
          <FamilyDrawerContent>
            <FamilyDrawerClose />
            <FamilyDrawerAnimatedWrapper>
              <FamilyDrawerAnimatedContent />
            </FamilyDrawerAnimatedWrapper>
          </FamilyDrawerContent>
        </FamilyDrawerPortal>
      </FamilyDrawerRoot>
    </YoutubeImportContext.Provider>
  );
}
