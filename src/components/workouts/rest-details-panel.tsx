"use client";

import { IconHourglass, IconLoader2, IconTrash } from "@tabler/icons-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDeleteWorkoutExercise } from "@/features/workouts/hooks";
import { formatDurationSeconds } from "@/features/workouts/workout-item";

type RestDetailsPanelProps = {
  workoutExerciseId: string;
  name: string;
  durationSeconds: number | null;
  nextExerciseName: string | null;
  onSkipToNext?: () => void;
};

export function RestDetailsPanel({
  workoutExerciseId,
  name,
  durationSeconds,
  nextExerciseName,
  onSkipToNext,
}: RestDetailsPanelProps) {
  const deleteWorkoutExercise = useDeleteWorkoutExercise();
  const [error, setError] = useState<string | null>(null);
  const durationLabel =
    durationSeconds != null ? formatDurationSeconds(durationSeconds) : null;

  async function handleRemove() {
    setError(null);
    try {
      await deleteWorkoutExercise.mutateAsync(workoutExerciseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove rest");
    }
  }

  return (
    <div className="mx-2 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate px-1 text-base font-medium">
          {name}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={deleteWorkoutExercise.isPending}
          className="text-muted-foreground hover:text-destructive size-8 shrink-0"
          onClick={() => {
            if (window.confirm("Remove this rest from the workout?")) {
              void handleRemove();
            }
          }}
          aria-label="Remove rest"
        >
          {deleteWorkoutExercise.isPending ? (
            <IconLoader2 className="size-4 animate-spin" />
          ) : (
            <IconTrash className="size-4" />
          )}
        </Button>
      </div>

      <Card size="sm">
        <CardHeader>
          <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-2xl">
            <IconHourglass className="size-5" aria-hidden />
          </div>
          <CardTitle className="mt-2">Recovery</CardTitle>
          <CardDescription>
            This pause is part of the follow-along timeline, not an exercise.
            Nothing is logged here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {durationLabel ? (
            <p className="text-foreground font-heading text-4xl font-medium tracking-tight tabular-nums">
              {durationLabel}
              <span className="text-muted-foreground ml-2 text-sm font-normal tracking-normal">
                rest
              </span>
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              Duration is not set for this rest.
            </p>
          )}

          {nextExerciseName ? (
            <p className="text-muted-foreground text-sm">
              Next up{" "}
              <span className="text-foreground font-medium">
                {nextExerciseName}
              </span>
            </p>
          ) : null}

          {onSkipToNext ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={onSkipToNext}
            >
              Skip to {nextExerciseName ?? "next"}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <p className="text-destructive px-1 text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
