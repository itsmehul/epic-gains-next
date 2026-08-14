"use client";

import {
  IconBarbell,
  IconBrandYoutube,
  IconDotsVertical,
  IconPlayerPlayFilled,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconTrendingDown,
  IconTrendingUp,
  IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";

import {
  AppShellBody,
  AppShellHeader,
  AppShellScroll,
} from "@/components/layout/app-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import type { MuscleGroup } from "@/db/schema/workout-schema";
import { useDeleteWorkout, useWorkouts } from "@/features/workouts/hooks";
import { MUSCLE_GROUP_OPTIONS } from "@/features/workouts/muscle-group";
import type { WorkoutListStats, WorkoutWithStats } from "@/features/workouts/types";
import { getYouTubeThumbnailUrl } from "@/features/workouts/youtube";
import { cn } from "@/shared/utils";

const springSoft = { type: "spring" as const, stiffness: 420, damping: 32 };
const easeOut = [0.25, 1, 0.5, 1] as const;
const SEARCH_DEBOUNCE_MS = 300;

function formatWorkoutDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfThatDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfThatDay.getTime()) / 86_400_000,
  );

  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff > 1 && dayDiff < 7) {
    return date.toLocaleDateString(undefined, { weekday: "long" });
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function formatVolume(volume: number) {
  if (volume <= 0) return null;
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}k`;
  return volume % 1 === 0 ? String(volume) : volume.toFixed(1);
}

function formatVolumeChange(pct: number) {
  const rounded = Math.round(Math.abs(pct));
  if (rounded === 0) return "Flat";
  return `${pct > 0 ? "+" : "−"}${rounded}%`;
}

function MuscleGroupChips({
  selected,
  onChange,
}: {
  selected: MuscleGroup[];
  onChange: (next: MuscleGroup[]) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      <button
        type="button"
        onClick={() => onChange([])}
        className={cn(
          "h-8 shrink-0 rounded-lg px-3 text-sm font-medium transition-colors",
          selected.length === 0
            ? "bg-foreground text-background"
            : "bg-muted text-foreground hover:bg-muted/80",
        )}
      >
        All
      </button>
      {MUSCLE_GROUP_OPTIONS.map((option) => {
        const active = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onChange(
                active
                  ? selected.filter((value) => value !== option.value)
                  : [...selected, option.value],
              );
            }}
            className={cn(
              "h-8 shrink-0 rounded-lg px-3 text-sm font-medium transition-colors",
              active
                ? "bg-foreground text-background"
                : "bg-muted text-foreground hover:bg-muted/80",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function WorkoutMetaLine({ stats }: { stats: WorkoutListStats }) {
  const lastLogged = stats.lastLoggedAt
    ? formatWorkoutDate(stats.lastLoggedAt)
    : null;
  const volumeLabel = formatVolume(stats.volume);
  const volumeChange = stats.volumeChangePct;

  const parts: { key: string; node: ReactNode }[] = [];

  if (stats.exerciseCount > 0) {
    parts.push({
      key: "exercises",
      node:
        stats.loggedExerciseCount > 0
          ? `${stats.loggedExerciseCount}/${stats.exerciseCount} exercises`
          : `${stats.exerciseCount} ${stats.exerciseCount === 1 ? "exercise" : "exercises"}`,
    });
  }
  if (stats.setCount > 0) {
    parts.push({
      key: "sets",
      node: `${stats.setCount} ${stats.setCount === 1 ? "set" : "sets"}`,
    });
  }
  if (volumeLabel) {
    parts.push({ key: "volume", node: `${volumeLabel} vol` });
  }
  if (lastLogged) {
    parts.push({ key: "logged", node: lastLogged });
  }
  if (volumeChange != null) {
    const tone =
      Math.round(volumeChange) === 0
        ? "flat"
        : volumeChange > 0
          ? "up"
          : "down";
    parts.push({
      key: "trend",
      node: (
        <span
          className={cn(
            "inline-flex items-center gap-0.5",
            tone === "up" && "text-emerald-600 dark:text-emerald-400",
            tone === "down" && "text-rose-600 dark:text-rose-400",
          )}
        >
          {tone === "up" ? (
            <IconTrendingUp className="size-3" aria-hidden />
          ) : null}
          {tone === "down" ? (
            <IconTrendingDown className="size-3" aria-hidden />
          ) : null}
          {formatVolumeChange(volumeChange)}
        </span>
      ),
    });
  }

  if (parts.length === 0) {
    return <p className="text-muted-foreground text-xs">No sets logged yet</p>;
  }

  return (
    <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
      {parts.map((part, index) => (
        <span key={part.key}>
          {index > 0 ? <span className="text-muted-foreground/40"> · </span> : null}
          {part.node}
        </span>
      ))}
    </p>
  );
}

function WorkoutFeedCard({
  workout,
  onDelete,
}: {
  workout: WorkoutWithStats;
  onDelete: () => void;
}) {
  const thumbnail = workout.videoUrl
    ? getYouTubeThumbnailUrl(workout.videoUrl)
    : null;
  const channel = workout.author?.trim() || "Imported workout";
  const createdLabel = formatWorkoutDate(workout.createdAt);
  const progressPct =
    workout.stats.exerciseCount > 0
      ? Math.round(
        (workout.stats.loggedExerciseCount / workout.stats.exerciseCount) *
        100,
      )
      : null;

  return (
    <article className="group flex flex-col gap-3">
      <Link
        href={`/workouts/${workout.id}`}
        className="relative block overflow-hidden rounded-xl bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <div className="relative aspect-video overflow-hidden bg-zinc-900">
          {thumbnail ? (
            // External YouTube CDN; next/image domain config not required.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnail}
              alt=""
              className="size-full object-cover transition duration-300 group-hover:scale-[1.03] group-hover:brightness-90"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-linear-to-br from-zinc-800 to-zinc-950 text-zinc-500">
              <IconBarbell className="size-12" stroke={1.25} />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="flex size-12 items-center justify-center rounded-full bg-black/70 text-white shadow-lg">
              <IconPlayerPlayFilled className="size-6 translate-x-px" />
            </span>
          </div>
          {progressPct != null && workout.stats.setCount > 0 ? (
            <span className="absolute right-1.5 bottom-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
              {progressPct}% logged
            </span>
          ) : workout.stats.exerciseCount > 0 ? (
            <span className="absolute right-1.5 bottom-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
              {workout.stats.exerciseCount}{" "}
              {workout.stats.exerciseCount === 1 ? "exercise" : "exercises"}
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <Link href={`/workouts/${workout.id}`} className="min-w-0 flex-1">
              <h2 className="line-clamp-2 text-sm leading-snug font-semibold tracking-tight">
                {workout.name}
              </h2>
            </Link>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    className="mt-0.5 shrink-0 opacity-70 hover:opacity-100"
                    aria-label={`More actions for ${workout.name}`}
                  />
                }
              >
                <IconDotsVertical className="size-4" />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-40 gap-1 p-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 w-full justify-start"
                  onClick={onDelete}
                >
                  <IconTrash className="size-3.5" data-icon="inline-start" />
                  Delete
                </Button>
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {channel}
            {createdLabel ? ` · ${createdLabel}` : null}
          </p>
          <div className="mt-1">
            <WorkoutMetaLine stats={workout.stats} />
          </div>
        </div>
      </div>
    </article>
  );
}

function WorkoutFeedSkeleton({ index }: { index: number }) {
  return (
    <div className="flex flex-col gap-3" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="bg-muted aspect-video animate-pulse rounded-xl" />
      <div className="flex min-w-0 flex-col gap-2">
        <div
          className="bg-muted h-4 animate-pulse rounded-md"
          style={{ width: `${62 + ((index * 13) % 28)}%` }}
        />
        <div className="bg-muted/70 h-3 w-28 animate-pulse rounded-md" />
        <div className="bg-muted/50 h-3 w-40 animate-pulse rounded-md" />
      </div>
    </div>
  );
}

function DeleteWorkoutDialog({
  workout,
  open,
  onOpenChange,
}: {
  workout: WorkoutWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const deleteWorkout = useDeleteWorkout();

  async function onConfirm() {
    if (!workout || deleteWorkout.isPending) return;
    try {
      await deleteWorkout.mutateAsync(workout.id);
      onOpenChange(false);
    } catch {
      // Error surfaced via mutation state below.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) deleteWorkout.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete workout?</DialogTitle>
          <DialogDescription>
            {workout
              ? `“${workout.name}” and its sets will be permanently removed.`
              : "This workout and its sets will be permanently removed."}
          </DialogDescription>
        </DialogHeader>
        {deleteWorkout.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {deleteWorkout.error instanceof Error
              ? deleteWorkout.error.message
              : "Could not delete workout"}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={deleteWorkout.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleteWorkout.isPending}
            onClick={() => void onConfirm()}
          >
            {deleteWorkout.isPending ? (
              <>
                <Spinner className="size-4" />
                Deleting…
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WorkoutsPageClient() {
  const searchId = useId();
  const [deleteTarget, setDeleteTarget] = useState<WorkoutWithStats | null>(
    null,
  );
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const workoutsQuery = useWorkouts({
    q: debouncedSearch,
    muscleGroups,
  });
  const items = workoutsQuery.data?.items ?? [];
  const hasSearch = debouncedSearch.length > 0;
  const hasFilters = hasSearch || muscleGroups.length > 0;
  const showList =
    !workoutsQuery.isLoading && !workoutsQuery.isError && items.length > 0;
  const showEmpty =
    !workoutsQuery.isLoading && !workoutsQuery.isError && items.length === 0;

  return (
    <AppShellScroll>
      <AppShellHeader
        title="Workouts"
        actions={
          <div className="flex items-center gap-1.5 md:gap-2">
            <Link
              href="/workouts/import"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <IconBrandYoutube className="size-4 text-red-500" data-icon="inline-start" />
              Import YouTube
            </Link>
          </div>
        }
      />
      <AppShellBody className="max-w-screen-2xl">
        <div className="flex flex-col gap-4 px-4 py-4 md:gap-5 md:px-6 md:py-6">
          <div className="flex flex-col gap-3">
            <div className="relative mx-auto w-full max-w-xl">
              <IconSearch
                aria-hidden
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
              />
              <Input
                id={searchId}
                type="search"
                value={searchInput}
                maxLength={200}
                placeholder="Search workouts or creators"
                aria-label="Search workouts by name or author"
                className="bg-muted/50 h-10 rounded-full pr-10 pl-10"
                onChange={(event) => setSearchInput(event.target.value)}
              />
              {searchInput ? (
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2 -translate-y-1/2"
                  onClick={() => setSearchInput("")}
                >
                  <IconX className="size-3.5" />
                </Button>
              ) : null}
            </div>
            <MuscleGroupChips
              selected={muscleGroups}
              onChange={setMuscleGroups}
            />
          </div>

          {workoutsQuery.isLoading ? (
            <div
              className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3"
              aria-busy="true"
              aria-label="Loading workouts"
            >
              {Array.from({ length: 6 }, (_, index) => (
                <WorkoutFeedSkeleton key={index} index={index} />
              ))}
            </div>
          ) : null}

          {workoutsQuery.isError ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: easeOut }}
              className="flex flex-col items-start gap-4 rounded-3xl border border-destructive/20 bg-destructive/5 px-5 py-6"
              role="alert"
            >
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-medium text-destructive">
                  Couldn’t load workouts
                </p>
                <p className="text-muted-foreground text-sm">
                  {workoutsQuery.error instanceof Error
                    ? workoutsQuery.error.message
                    : "Something went wrong. Try again."}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void workoutsQuery.refetch()}
              >
                <IconRefresh className="size-3.5" data-icon="inline-start" />
                Retry
              </Button>
            </motion.div>
          ) : null}

          {showEmpty ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: easeOut }}
              className="relative flex flex-col items-center gap-5 overflow-hidden rounded-3xl border border-dashed border-primary/25 bg-linear-to-b from-primary/8 to-transparent px-6 py-16 text-center"
            >
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(color-mix(in_oklch,var(--foreground)_12%,transparent)_1px,transparent_1px)] bg-size-[14px_14px] opacity-[0.35]"
              />
              <div className="relative flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
                <IconBrandYoutube className="size-7 text-red-500" stroke={1.5} />
              </div>
              <div className="relative flex max-w-xs flex-col gap-2">
                <p className="text-base font-semibold tracking-tight">
                  {hasFilters ? "No matches" : "Your feed is empty"}
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {hasFilters
                    ? "Nothing matched those filters. Try a different name, creator, or muscle group."
                    : "Import a YouTube workout and it will show up here like a video in your feed."}
                </p>
              </div>
              {hasFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  className="relative"
                  onClick={() => {
                    setSearchInput("");
                    setMuscleGroups([]);
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Link href="/workouts/import" className={cn(buttonVariants(), "relative")}>
                  <IconBrandYoutube className="size-4 text-red-500" data-icon="inline-start" />
                  Import
                </Link>
              )}
            </motion.div>
          ) : null}

          {showList ? (
            <ul
              className={cn(
                "grid grid-cols-1 gap-x-4 gap-y-8 transition-opacity duration-200 sm:grid-cols-2 xl:grid-cols-3",
                workoutsQuery.isFetching && "opacity-70",
              )}
            >
              <AnimatePresence initial={false}>
                {items.map((workout, index) => (
                  <motion.li
                    key={workout.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      ...springSoft,
                      delay: Math.min(index * 0.035, 0.28),
                    }}
                  >
                    <WorkoutFeedCard
                      workout={workout}
                      onDelete={() => setDeleteTarget(workout)}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          ) : null}
        </div>
      </AppShellBody>

      <DeleteWorkoutDialog
        workout={deleteTarget}
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      />
    </AppShellScroll>
  );
}
