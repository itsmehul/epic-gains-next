"use client";

import {
  IconBrandYoutube,
  IconCheck,
  IconCopy,
  IconExternalLink,
} from "@/components/ui/icons";
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
import { importRejectionSchema, importWorkoutStructureSchema } from "@/features/workouts/schemas";
import { generateYoutubeImportPrompt } from "@/features/workouts/import-prompt";
import { VIDEO_PLAYBACK_REJECT_REASON } from "@/features/workouts/import-eligibility";
import { getYouTubeVideoId } from "@/features/workouts/youtube";
import { ApiError, apiFetch } from "@/shared/api";
import { cn } from "@/shared/utils";

const YOUTUBE_WORKOUT_SEARCH_URL =
  "https://www.youtube.com/results?search_query=Workout+routine";

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
  const [checkingPlayback, setCheckingPlayback] = useState(false);
  const importWorkout = useImportFullWorkout();

  const youtubeValid = Boolean(getYouTubeVideoId(videoUrl.trim()));
  const promptText = useMemo(
    () => generateYoutubeImportPrompt(videoUrl),
    [videoUrl],
  );

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

  async function handleCheckPlayback() {
    if (!youtubeValid) return;
    setError(null);
    setCheckingPlayback(true);
    try {
      const params = new URLSearchParams({ url: videoUrl.trim() });
      const result = await apiFetch<{
        playable: boolean;
        reason?: string;
      }>(`/api/workouts/import/youtube?${params}`);
      if (!result.playable) {
        setError(result.reason ?? VIDEO_PLAYBACK_REJECT_REASON);
        return;
      }
      advanceTo(2);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : VIDEO_PLAYBACK_REJECT_REASON,
      );
    } finally {
      setCheckingPlayback(false);
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

    const rejection = importRejectionSchema.safeParse(parsedJson);
    if (rejection.success) {
      setError(rejection.data.reason);
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
                        void handleCheckPlayback();
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
                          onChange={(e) => {
                            setVideoUrl(e.target.value);
                            setError(null);
                          }}
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
                        {error && step === 1 ? (
                          <p className="text-destructive text-xs" role="alert">
                            {error}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        nativeButton={false}
                        render={
                          <a
                            href={YOUTUBE_WORKOUT_SEARCH_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        }
                      >
                        <IconBrandYoutube
                          className="size-4 text-red-500"
                          data-icon="inline-start"
                        />
                        Search YouTube
                        <IconExternalLink
                          className="size-4"
                          data-icon="inline-end"
                        />
                      </Button>
                      <Button
                        type="submit"
                        disabled={!youtubeValid || checkingPlayback}
                      >
                        {checkingPlayback ? (
                          <>
                            <Spinner className="size-4" />
                            Checking video…
                          </>
                        ) : (
                          "Next: Copy Prompt"
                        )}
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
