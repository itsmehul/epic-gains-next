"use client";

import { IconChevronRight, IconCircleCheckFilled } from "@/components/ui/icons";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  AppShellBody,
  AppShellHeader,
  AppShellLoading,
  AppShellScroll,
} from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { WorkoutChannelLink } from "@/components/workouts/workout-channel-link";
import { WorkoutExerciseTabs } from "@/components/workouts/workout-exercise-tabs";
import {
  WorkoutVideoPreview,
  type WorkoutVideoPreviewHandle,
} from "@/components/workouts/workout-video-preview";
import {
  useSets,
  useWorkout,
  useWorkoutExercises,
} from "@/features/workouts/hooks";
import { muscleGroupLabel } from "@/features/workouts/muscle-group";
import { dayKey, localDateString } from "@/features/workouts/set-day";
import type { Set, WorkoutExercise } from "@/features/workouts/types";
import { isRestWorkoutItem } from "@/features/workouts/workout-item";
import { getYouTubeVideoId } from "@/features/workouts/youtube";
import { useSession } from "@/infrastructure/auth/client";
import { cn } from "@/shared/utils";

function googleImagesSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`;
}

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

type ExerciseSetProgress =
  | { kind: "partial"; logged: number; target: number; fraction: number }
  | { kind: "complete"; logged: number; target: number };

function exerciseSetProgress(
  item: WorkoutExercise,
  loggedCount: number,
): ExerciseSetProgress | null {
  if (loggedCount <= 0) return null;

  const targetCount = item.metaData?.targets?.length ?? 0;
  if (targetCount <= 0) {
    return { kind: "complete", logged: loggedCount, target: loggedCount };
  }

  if (loggedCount >= targetCount) {
    return { kind: "complete", logged: loggedCount, target: targetCount };
  }

  return {
    kind: "partial",
    logged: loggedCount,
    target: targetCount,
    fraction: loggedCount / targetCount,
  };
}

function TinySetPieProgress({
  fraction,
  className,
}: {
  fraction: number;
  className?: string;
}) {
  const t = Math.min(Math.max(fraction, 0), 1);
  const radius = 7;
  const center = 8;
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + t * 2 * Math.PI;
  const x1 = center + radius * Math.cos(startAngle);
  const y1 = center + radius * Math.sin(startAngle);
  const x2 = center + radius * Math.cos(endAngle);
  const y2 = center + radius * Math.sin(endAngle);
  const largeArc = t > 0.5 ? 1 : 0;
  const wedge = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("size-4 shrink-0", className)}
      aria-hidden
    >
      <circle cx={center} cy={center} r={radius} className="fill-muted" />
      {t > 0 ? <path d={wedge} className="fill-primary" /> : null}
    </svg>
  );
}

function ExerciseSetProgressIndicator({
  progress,
  isActive,
}: {
  progress: ExerciseSetProgress;
  isActive: boolean;
}) {
  const ariaLabel =
    progress.kind === "complete"
      ? progress.logged === progress.target
        ? `${progress.target} ${progress.target === 1 ? "set" : "sets"} complete`
        : `${progress.logged} ${progress.logged === 1 ? "set" : "sets"} logged`
      : `${progress.logged} of ${progress.target} sets logged`;

  if (progress.kind === "complete") {
    return (
      <IconCircleCheckFilled
        aria-label={ariaLabel}
        className={cn(
          "size-4 shrink-0",
          isActive ? "text-primary" : "text-primary/80",
        )}
      />
    );
  }

  return (
    <span aria-label={ariaLabel} className="inline-flex shrink-0">
      <TinySetPieProgress
        fraction={progress.fraction}
        className={isActive ? undefined : "opacity-80"}
      />
    </span>
  );
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
  const { data: session } = useSession();

  const workoutQuery = useWorkout(workoutId);
  const workoutExercisesQuery = useWorkoutExercises({ workoutId });
  const setsQuery = useSets({ workoutId });

  const isLoading =
    workoutQuery.isLoading ||
    workoutExercisesQuery.isLoading ||
    setsQuery.isLoading;

  const exerciseById = new Map(
    (workoutQuery.data?.exercises ?? []).map((exercise) => [
      exercise.id,
      exercise,
    ]),
  );

  const canResolve =
    Boolean(workoutQuery.data) &&
    !workoutQuery.data?.frozen &&
    workoutQuery.data?.userId === session?.user?.id;

  const workoutExercises = sortWorkoutExercisesByTimestamp(
    (workoutExercisesQuery.data?.items ?? []).filter(
      (item) => !isRestWorkoutItem(item),
    ),
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

  function itemLabel(item: WorkoutExercise) {
    return (
      item.name ||
      exerciseById.get(item.exerciseId)?.name ||
      "Unknown exercise"
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
  const selectedKeyMuscles = selectedItem
    ? (exerciseById.get(selectedItem.exerciseId)?.keyMuscles ?? [])
    : [];

  return (
    <AppShellScroll>
      <AppShellHeader
        backHref="/workouts"
        title={workoutQuery.data?.name ?? "Workout"}
      />
      <AppShellBody>
        <div
          className={cn(
            "flex flex-col gap-3 pb-10 md:gap-6 md:p-6 md:pb-14",
            !showVideo && "gap-6 py-4 pb-10",
          )}
        >
          {showVideo ? (
            <div className="px-4 md:px-0">
              <WorkoutVideoPreview
                ref={videoRef}
                videoUrl={videoUrl!}
                author={workoutQuery.data?.author}
                channelUrl={workoutQuery.data?.channelUrl}
                onTimeUpdate={handleVideoTimeUpdate}
              />
            </div>
          ) : null}

          {showExercises && selectedItem ? (
            <div className="flex flex-col gap-1">
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
                      const loggedSetCount =
                        setsByExerciseId
                          .get(item.exerciseId)
                          ?.filter(
                            (set) =>
                              dayKey(set.updatedAt) === localDateString(),
                          ).length ?? 0;
                      const setProgress = exerciseSetProgress(
                        item,
                        loggedSetCount,
                      );
                      const hasNext = index < workoutExercises.length - 1;
                      const label = itemLabel(item);

                      const muscleLabel = muscleGroupLabel(
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
                          {setProgress ? (
                            <ExerciseSetProgressIndicator
                              progress={setProgress}
                              isActive={isActive}
                            />
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

              {selectedKeyMuscles.length > 0 ? (
                <div className="overflow-x-auto overscroll-x-contain px-4 scrollbar-none md:px-0">
                  <ul
                    className="flex w-max items-center gap-2"
                    aria-label="Key muscles"
                  >
                    {selectedKeyMuscles.map((muscle) => (
                      <li key={muscle}>
                        <a
                          href={googleImagesSearchUrl(muscle)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground/70 hover:text-foreground text-sm font-normal tracking-wide whitespace-nowrap underline-offset-2 hover:underline"
                        >
                          {muscle}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div key={selectedItem.id} className="mt-1">
                <WorkoutExerciseTabs
                  workoutId={workoutId}
                  exerciseId={selectedItem.exerciseId}
                  workoutExerciseId={selectedItem.id}
                  metricProfile={
                    exerciseById.get(selectedItem.exerciseId)?.metricProfile
                  }
                  targetSets={selectedItem.metaData?.targets}
                  sets={selectedSets}
                  setsReady={setsQuery.isSuccess}
                  readOnly={false}
                  canResolve={canResolve}
                  onExerciseResolved={(id) => {
                    setActiveWorkoutExerciseId(id);
                  }}
                />
              </div>
            </div>
          ) : null}

          {!showVideo &&
            (workoutQuery.data?.author || workoutQuery.data?.channelUrl) ? (
            <p className="text-muted-foreground px-4 text-sm md:px-0">
              <WorkoutChannelLink
                author={workoutQuery.data.author}
                channelUrl={workoutQuery.data.channelUrl}
              />
            </p>
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
                  <AppShellLoading />
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
