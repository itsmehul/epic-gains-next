"use client";

import { IconChevronRight } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  AppShellBody,
  AppShellHeader,
  AppShellLoading,
  AppShellScroll,
} from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { ExerciseSetsPanel } from "@/components/workouts/exercise-sets-panel";
import { WorkoutChannelLink } from "@/components/workouts/workout-channel-link";
import { RestDetailsPanel } from "@/components/workouts/rest-details-panel";
import {
  WorkoutVideoPreview,
  type WorkoutVideoPreviewHandle,
} from "@/components/workouts/workout-video-preview";
import {
  useExercises,
  useSets,
  useWorkout,
  useWorkoutExercises,
} from "@/features/workouts/hooks";
import { muscleGroupLabel } from "@/features/workouts/muscle-group";
import type { Set, WorkoutExercise } from "@/features/workouts/types";
import {
  getItemDurationSeconds,
  isRestWorkoutItem,
} from "@/features/workouts/workout-item";
import { getYouTubeVideoId } from "@/features/workouts/youtube";
import { cn } from "@/shared/utils";

function resolveWorkoutVideoUrl(items: WorkoutExercise[]): string | null {
  for (const item of items) {
    if (item.videoUrl && getYouTubeVideoId(item.videoUrl)) {
      return item.videoUrl;
    }
  }
  return null;
}

function getItemStartTime(item: WorkoutExercise | undefined): number | null {
  const start = item?.metaData?.videoStartTime;
  return typeof start === "number" ? start : null;
}

function sortWorkoutExercisesByTimestamp(
  items: WorkoutExercise[],
): WorkoutExercise[] {
  return [...items].sort((a, b) => {
    const aTime = getItemStartTime(a);
    const bTime = getItemStartTime(b);

    if (aTime == null && bTime == null) return 0;
    if (aTime == null) return 1;
    if (bTime == null) return -1;
    return aTime - bTime;
  });
}

function findWorkoutExerciseIdAtTime(
  items: WorkoutExercise[],
  seconds: number,
): string | null {
  let matchId: string | null = null;

  for (const item of items) {
    const start = getItemStartTime(item);
    if (start == null) continue;
    if (start > seconds) break;
    matchId = item.id;
  }

  return matchId;
}

export function WorkoutDetailPageClient() {
  const params = useParams<{ id: string }>();
  const workoutId = params.id;
  const videoRef = useRef<WorkoutVideoPreviewHandle>(null);
  const activeChipRef = useRef<HTMLButtonElement | null>(null);
  const [activeWorkoutExerciseId, setActiveWorkoutExerciseId] = useState<
    string | null
  >(null);

  const workoutQuery = useWorkout(workoutId);
  const workoutExercisesQuery = useWorkoutExercises({ workoutId });
  const exercisesQuery = useExercises();
  const setsQuery = useSets({ workoutId });

  const isLoading =
    workoutQuery.isLoading ||
    workoutExercisesQuery.isLoading ||
    exercisesQuery.isLoading ||
    setsQuery.isLoading;

  const exerciseById = new Map(
    (exercisesQuery.data?.items ?? []).map((exercise) => [
      exercise.id,
      exercise,
    ]),
  );

  const workoutExercises = sortWorkoutExercisesByTimestamp(
    workoutExercisesQuery.data?.items ?? [],
  );
  const sets = setsQuery.data?.items ?? [];

  const videoUrl = resolveWorkoutVideoUrl(workoutExercises);

  const setsByExerciseId = new Map<string, Set[]>();
  for (const set of sets) {
    const existing = setsByExerciseId.get(set.exerciseId) ?? [];
    existing.push(set);
    setsByExerciseId.set(set.exerciseId, existing);
  }

  const selectedItem =
    workoutExercises.find((item) => item.id === activeWorkoutExerciseId) ??
    workoutExercises[0] ??
    null;
  const selectedSets = selectedItem
    ? (setsByExerciseId.get(selectedItem.exerciseId) ?? [])
    : [];
  const selectedIndex = selectedItem
    ? workoutExercises.findIndex((item) => item.id === selectedItem.id)
    : -1;
  const nextTimelineItem =
    selectedIndex >= 0 ? (workoutExercises[selectedIndex + 1] ?? null) : null;
  const nextExerciseItem =
    selectedIndex >= 0
      ? (workoutExercises
          .slice(selectedIndex + 1)
          .find((item) => !isRestWorkoutItem(item)) ?? null)
      : null;

  function itemLabel(item: WorkoutExercise) {
    return (
      item.name ||
      exerciseById.get(item.exerciseId)?.name ||
      (isRestWorkoutItem(item) ? "Rest" : "Unknown exercise")
    );
  }

  function selectExercise(item: WorkoutExercise) {
    setActiveWorkoutExerciseId(item.id);

    const start = item.metaData?.videoStartTime;
    if (start != null && item.videoUrl) {
      videoRef.current?.seekTo(start);
    }
  }

  function handleVideoTimeUpdate(seconds: number) {
    const nextId = findWorkoutExerciseIdAtTime(workoutExercises, seconds);
    if (!nextId || nextId === activeWorkoutExerciseId) return;
    setActiveWorkoutExerciseId(nextId);
  }

  useEffect(() => {
    activeChipRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [selectedItem?.id]);

  const showVideo =
    !isLoading && !workoutQuery.isError && Boolean(workoutQuery.data && videoUrl);
  const showExercises =
    !isLoading &&
    !workoutQuery.isError &&
    Boolean(workoutQuery.data) &&
    workoutExercises.length > 0;

  return (
    <AppShellScroll>
      <AppShellHeader
        backHref="/workouts"
        title={workoutQuery.data?.name ?? "Workout"}
      />
      <AppShellBody>
        <div
          className={cn(
            "flex flex-col gap-3 md:gap-6 md:p-6",
            !showVideo && "gap-6 py-4",
          )}
        >
          {showVideo ? (
            <WorkoutVideoPreview
              ref={videoRef}
              className="rounded-none md:rounded-xl"
              videoUrl={videoUrl!}
              onTimeUpdate={handleVideoTimeUpdate}
            />
          ) : null}

          {workoutQuery.data?.author || workoutQuery.data?.channelUrl ? (
            <p
              className={cn(
                "text-muted-foreground px-4 text-sm md:px-0",
                showVideo && "-mt-1",
              )}
            >
              <WorkoutChannelLink
                author={workoutQuery.data.author}
                channelUrl={workoutQuery.data.channelUrl}
              />
            </p>
          ) : null}

          {showExercises && selectedItem ? (
            <div className="flex flex-col gap-3">
              <div
                className="relative"
                role="navigation"
                aria-label="Workout timeline"
              >
                <div
                  aria-hidden
                  className="from-content-panel pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-linear-to-r to-transparent md:hidden"
                />
                <div
                  aria-hidden
                  className="from-content-panel pointer-events-none absolute inset-y-0 right-0 z-10 w-4 bg-linear-to-l to-transparent md:hidden"
                />
                <div className="overflow-x-auto overscroll-x-contain px-4 scrollbar-none md:px-0">
                  <div className="flex w-max items-stretch gap-3">
                    {workoutExercises.map((item, index) => {
                      const isActive = selectedItem?.id === item.id;
                      const isRest = isRestWorkoutItem(item);
                      const setCount = isRest
                        ? 0
                        : (setsByExerciseId.get(item.exerciseId)?.length ?? 0);
                      const hasNext = index < workoutExercises.length - 1;
                      const label = itemLabel(item);

                      const muscleLabel = isRest
                        ? null
                        : muscleGroupLabel(
                            exerciseById.get(item.exerciseId)?.muscleGroup,
                          );

                      return (
                        <button
                          key={item.id}
                          ref={isActive ? activeChipRef : undefined}
                          type="button"
                          aria-current={isActive ? "true" : undefined}
                          className={cn(
                            "group relative flex w-max shrink-0 items-center gap-1.5 rounded-xl py-1 text-left transition-colors duration-200",
                            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-content-panel focus-visible:outline-none",
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                          onClick={() => {
                            selectExercise(item);
                          }}
                        >
                          <span className="flex h-5 items-center whitespace-nowrap text-sm font-medium leading-none">
                            {label}
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
                          {setCount > 0 ? (
                            <Badge
                              variant={isActive ? "default" : "secondary"}
                              aria-label={`${setCount} ${setCount === 1 ? "set" : "sets"}`}
                              className={cn(
                                "h-4 min-w-4 shrink-0 justify-center px-1.5 text-[10px] tabular-nums",
                                !isActive &&
                                  "bg-muted text-muted-foreground group-hover:bg-muted/80",
                              )}
                            >
                              {setCount}
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

              <div
                key={selectedItem.id}
                className="flex flex-col gap-2"
              >
                {isRestWorkoutItem(selectedItem) ? (
                  <RestDetailsPanel
                    workoutExerciseId={selectedItem.id}
                    name={itemLabel(selectedItem)}
                    durationSeconds={getItemDurationSeconds(selectedItem)}
                    nextExerciseName={
                      nextExerciseItem ? itemLabel(nextExerciseItem) : null
                    }
                    onSkipToNext={
                      nextTimelineItem
                        ? () => {
                            selectExercise(nextTimelineItem);
                          }
                        : undefined
                    }
                  />
                ) : (
                  <ExerciseSetsPanel
                    workoutId={workoutId}
                    exerciseId={selectedItem.exerciseId}
                    workoutExerciseId={selectedItem.id}
                    metricProfile={
                      exerciseById.get(selectedItem.exerciseId)?.metricProfile
                    }
                    muscleGroup={
                      exerciseById.get(selectedItem.exerciseId)?.muscleGroup
                    }
                    sets={selectedSets}
                    onExerciseResolved={(id) => {
                      setActiveWorkoutExerciseId(id);
                    }}
                  />
                )}
              </div>
            </div>
          ) : null}

          {(isLoading ||
            workoutQuery.isError ||
            (!showExercises && Boolean(workoutQuery.data))) && (
            <div
              className={cn(
                "flex flex-col gap-6 px-4 md:px-0",
                showVideo && "py-4 md:py-0",
              )}
            >
              {isLoading ? (
                <AppShellLoading label="Loading details…" />
              ) : null}

              {workoutQuery.isError ? (
                <p className="text-destructive text-sm" role="alert">
                  {workoutQuery.error instanceof Error
                    ? workoutQuery.error.message
                    : "Failed to load workout"}
                </p>
              ) : null}

              {!isLoading &&
              !workoutQuery.isError &&
              workoutQuery.data &&
              workoutExercises.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No exercises in this workout yet.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </AppShellBody>
    </AppShellScroll>
  );
}
