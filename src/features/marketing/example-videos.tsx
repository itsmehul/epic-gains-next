"use client";

import { IconChevronRight } from "@/components/ui/icons";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  WorkoutVideoPreview,
  type WorkoutVideoPreviewHandle,
} from "@/components/workouts/workout-video-preview";
import { WorkoutExerciseTabs } from "@/components/workouts/workout-exercise-tabs";
import { muscleGroupLabel } from "@/features/workouts/muscle-group";
import { cn } from "@/shared/utils";

import {
  EXAMPLE_AUTHOR,
  EXAMPLE_CHANNEL_URL,
  EXAMPLE_EXERCISES,
  EXAMPLE_VIDEO_URL,
  EXAMPLE_WORKOUT_ID,
} from "./example-workout-data";

function findExerciseIdAtTime(seconds: number): string | null {
  let matchId: string | null = null;
  for (const item of EXAMPLE_EXERCISES) {
    if (item.start > seconds) break;
    matchId = item.id;
  }
  return matchId;
}

export function ExampleVideoShowcase() {
  const videoRef = useRef<WorkoutVideoPreviewHandle>(null);
  const activeChipRef = useRef<HTMLButtonElement | null>(null);
  const skipChipScrollRef = useRef(true);
  const [activeId, setActiveId] = useState(EXAMPLE_EXERCISES[0].id);

  const selected =
    EXAMPLE_EXERCISES.find((item) => item.id === activeId) ??
    EXAMPLE_EXERCISES[0];

  function selectExercise(item: (typeof EXAMPLE_EXERCISES)[number]) {
    setActiveId(item.id);
    videoRef.current?.seekTo(item.start);
  }

  function handleVideoTimeUpdate(seconds: number) {
    const nextId = findExerciseIdAtTime(seconds);
    if (!nextId || nextId === activeId) return;
    setActiveId(nextId);
  }

  useEffect(() => {
    if (skipChipScrollRef.current) {
      skipChipScrollRef.current = false;
      return;
    }
    const chip = activeChipRef.current;
    const strip = chip?.closest<HTMLElement>("[data-exercise-strip]");
    if (!chip || !strip) return;
    const chipRect = chip.getBoundingClientRect();
    const stripRect = strip.getBoundingClientRect();
    const nextLeft =
      strip.scrollLeft +
      (chipRect.left - stripRect.left) -
      (stripRect.width - chipRect.width) / 2;
    strip.scrollTo({ left: nextLeft, behavior: "smooth" });
  }, [selected.id]);

  return (
    <div className="flex flex-col gap-3 md:gap-6">
      <WorkoutVideoPreview
        ref={videoRef}
        videoUrl={EXAMPLE_VIDEO_URL}
        author={EXAMPLE_AUTHOR}
        channelUrl={EXAMPLE_CHANNEL_URL}
        onTimeUpdate={handleVideoTimeUpdate}
      />

      <div className="flex flex-col gap-1">
        <div
          className="relative"
          role="navigation"
          aria-label="Workout timeline"
        >
          <div
            aria-hidden
            className="from-background pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-linear-to-r to-transparent md:hidden"
          />
          <div
            aria-hidden
            className="from-background pointer-events-none absolute inset-y-0 right-0 z-10 w-4 bg-linear-to-l to-transparent md:hidden"
          />
          <div
            data-exercise-strip
            className="overflow-x-auto overscroll-x-contain scrollbar-none md:px-0"
          >
            <div className="flex w-max items-stretch gap-3">
              {EXAMPLE_EXERCISES.map((item, index) => {
                const isActive = selected.id === item.id;
                const hasNext = index < EXAMPLE_EXERCISES.length - 1;
                const muscleLabel = muscleGroupLabel(item.muscleGroup);

                return (
                  <button
                    key={item.id}
                    ref={isActive ? activeChipRef : undefined}
                    type="button"
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "group relative flex w-max shrink-0 items-center gap-1.5 rounded-xl py-1 text-left transition-colors duration-200",
                      "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => selectExercise(item)}
                  >
                    <span className="flex h-5 items-center whitespace-nowrap text-sm font-medium leading-none">
                      {item.name}
                    </span>
                    {muscleLabel ? (
                      <Badge
                        variant="secondary"
                        aria-label={`Muscle group ${muscleLabel}`}
                        className={cn(
                          "h-5 shrink-0 items-center justify-center rounded-md px-2 py-0 text-xs font-semibold leading-none",
                          isActive
                            ? "border-primary/25 bg-primary/20 text-primary"
                            : "border-transparent bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground",
                        )}
                      >
                        {muscleLabel}
                      </Badge>
                    ) : null}
                    {hasNext ? (
                      <IconChevronRight
                        aria-hidden
                        className={cn(
                          "size-3.5 shrink-0 opacity-50",
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-foreground",
                        )}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div key={selected.id} className="mt-1">
          <WorkoutExerciseTabs
            workoutId={EXAMPLE_WORKOUT_ID}
            exerciseId={selected.exerciseId}
            workoutExerciseId={selected.id}
            metricProfile={selected.metricProfile}
            targetSets={selected.targetSets}
            sets={selected.sets}
            setsReady
            readOnly
            canResolve={false}
            comments={selected.comments}
          />
        </div>
      </div>
    </div>
  );
}
