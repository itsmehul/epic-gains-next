"use client";

import {
  IconBarbell,
  IconEye,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconTrendingDown,
  IconTrendingUp,
  IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";

import {
  AppShellBody,
  AppShellHeader,
  AppShellScroll,
} from "@/components/layout/app-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  useCreateWorkout,
  useDeleteWorkout,
  useWorkouts,
} from "@/features/workouts/hooks";
import type { WorkoutListStats, WorkoutWithStats } from "@/features/workouts/types";
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

function WorkoutStatChips({ stats }: { stats: WorkoutListStats }) {
  const lastLogged = stats.lastLoggedAt
    ? formatWorkoutDate(stats.lastLoggedAt)
    : null;
  const volumeLabel = formatVolume(stats.volume);
  const progressPct =
    stats.exerciseCount > 0
      ? Math.round((stats.loggedExerciseCount / stats.exerciseCount) * 100)
      : null;
  const volumeChange = stats.volumeChangePct;

  const chips: { key: string; label: string; tone?: "up" | "down" | "flat" }[] =
    [];

  if (lastLogged) {
    chips.push({ key: "logged", label: `Last ${lastLogged}` });
  }
  if (stats.exerciseCount > 0) {
    chips.push({
      key: "exercises",
      label:
        stats.loggedExerciseCount > 0
          ? `${stats.loggedExerciseCount}/${stats.exerciseCount} exercises`
          : `${stats.exerciseCount} ${stats.exerciseCount === 1 ? "exercise" : "exercises"}`,
    });
  }
  if (stats.setCount > 0) {
    chips.push({
      key: "sets",
      label: `${stats.setCount} ${stats.setCount === 1 ? "set" : "sets"}`,
    });
  }
  if (volumeLabel) {
    chips.push({ key: "volume", label: `${volumeLabel} vol` });
  }
  if (progressPct != null && stats.setCount > 0) {
    chips.push({ key: "progress", label: `${progressPct}% logged` });
  }
  if (volumeChange != null) {
    const tone =
      Math.round(volumeChange) === 0
        ? "flat"
        : volumeChange > 0
          ? "up"
          : "down";
    chips.push({
      key: "trend",
      label: formatVolumeChange(volumeChange),
      tone,
    });
  }

  if (chips.length === 0) return null;

  return (
    <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
      {chips.map((chip, index) => (
        <span key={chip.key} className="inline-flex items-center gap-1.5">
          {index > 0 ? (
            <span className="text-muted-foreground/40" aria-hidden>
              ·
            </span>
          ) : null}
          <span
            className={cn(
              "inline-flex items-center gap-0.5",
              chip.tone === "up" && "text-emerald-600 dark:text-emerald-400",
              chip.tone === "down" && "text-rose-600 dark:text-rose-400",
            )}
          >
            {chip.tone === "up" ? (
              <IconTrendingUp className="size-3" aria-hidden />
            ) : null}
            {chip.tone === "down" ? (
              <IconTrendingDown className="size-3" aria-hidden />
            ) : null}
            {chip.label}
          </span>
        </span>
      ))}
    </p>
  );
}

function WorkoutRowSkeleton({ index }: { index: number }) {
  return (
    <div
      className="flex flex-col gap-4 rounded-4xl bg-card px-4 py-4 ring-1 ring-foreground/5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex flex-col gap-2">
        <div
          className="bg-muted/80 h-4 animate-pulse rounded-md"
          style={{ width: `${58 + ((index * 17) % 28)}%` }}
        />
        <div className="bg-muted/60 h-3 w-36 animate-pulse rounded-md" />
        <div className="bg-muted/50 h-2.5 w-48 animate-pulse rounded-md" />
      </div>
      <div className="flex gap-2 border-t border-border/60 pt-3">
        <div className="bg-muted/60 h-8 w-20 animate-pulse rounded-4xl" />
        <div className="bg-muted/50 h-8 w-20 animate-pulse rounded-4xl" />
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

function CreateWorkoutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const nameId = useId();
  const createWorkout = useCreateWorkout();
  const [name, setName] = useState("");

  function reset() {
    setName("");
    createWorkout.reset();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || createWorkout.isPending) return;

    try {
      const workout = await createWorkout.mutateAsync({ name: trimmed });
      reset();
      onOpenChange(false);
      router.push(`/workouts/${workout.id}`);
    } catch {
      // Error surfaced via mutation state below.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <form className="grid gap-6" onSubmit={(event) => void onSubmit(event)}>
          <DialogHeader>
            <DialogTitle>New workout</DialogTitle>
            <DialogDescription>
              Name the session, then add exercises on the next screen.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor={nameId}>Name</Label>
            <Input
              id={nameId}
              autoFocus
              maxLength={200}
              placeholder="Push day · Upper strength · Video title…"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {createWorkout.isError ? (
              <p className="text-destructive text-sm" role="alert">
                {createWorkout.error instanceof Error
                  ? createWorkout.error.message
                  : "Could not create workout"}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={createWorkout.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createWorkout.isPending}
            >
              {createWorkout.isPending ? (
                <>
                  <Spinner className="size-4" />
                  Creating…
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WorkoutsPageClient() {
  const searchId = useId();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkoutWithStats | null>(
    null,
  );
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const workoutsQuery = useWorkouts({ q: debouncedSearch });
  const items = workoutsQuery.data?.items ?? [];
  const hasSearch = debouncedSearch.length > 0;
  const showList =
    !workoutsQuery.isLoading && !workoutsQuery.isError && items.length > 0;
  const showEmpty =
    !workoutsQuery.isLoading && !workoutsQuery.isError && items.length === 0;

  return (
    <AppShellScroll>
      <AppShellHeader title="Workouts" />
      <AppShellBody>
        <div className="flex flex-col gap-3 md:gap-6 md:p-6">
          <div className="relative px-4 md:px-0">
            <IconSearch
              aria-hidden
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-7 size-4 -translate-y-1/2 md:left-3"
            />
            <Input
              id={searchId}
              type="search"
              value={searchInput}
              maxLength={200}
              placeholder="Search workouts…"
              aria-label="Search workouts"
              className="bg-muted/40 h-10 pr-10 pl-9"
              onChange={(event) => setSearchInput(event.target.value)}
            />
            {searchInput ? (
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label="Clear search"
                className="absolute top-1/2 right-6 -translate-y-1/2 md:right-2"
                onClick={() => setSearchInput("")}
              >
                <IconX className="size-3.5" />
              </Button>
            ) : null}
          </div>

          {workoutsQuery.isLoading ? (
            <div
              className="flex flex-col gap-3 px-4 md:gap-4 md:px-0"
              aria-busy="true"
              aria-label="Loading workouts"
            >
              {Array.from({ length: 5 }, (_, index) => (
                <WorkoutRowSkeleton key={index} index={index} />
              ))}
            </div>
          ) : null}

          {workoutsQuery.isError ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: easeOut }}
              className="mx-4 flex flex-col items-start gap-4 rounded-3xl border border-destructive/20 bg-destructive/5 px-5 py-6 md:mx-0"
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
              className="relative mx-4 flex flex-col items-center gap-5 overflow-hidden rounded-3xl border border-dashed border-primary/25 bg-linear-to-b from-primary/8 to-transparent px-6 py-14 text-center md:mx-0"
            >
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(color-mix(in_oklch,var(--foreground)_12%,transparent)_1px,transparent_1px)] bg-size-[14px_14px] opacity-[0.35]"
              />
              <div className="relative flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
                <IconBarbell className="size-7" stroke={1.5} />
              </div>
              <div className="relative flex max-w-xs flex-col gap-2">
                <p className="text-base font-semibold tracking-tight">
                  {hasSearch ? "No matches" : "No sessions yet"}
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {hasSearch
                    ? `Nothing matched “${debouncedSearch}”. Try a different name.`
                    : "Start a workout to log sets, follow video timestamps, and keep your training history in one place."}
                </p>
              </div>
              {hasSearch ? (
                <Button
                  type="button"
                  variant="outline"
                  className="relative"
                  onClick={() => setSearchInput("")}
                >
                  Clear search
                </Button>
              ) : (
                <Button
                  type="button"
                  className="relative"
                  onClick={() => setCreateOpen(true)}
                >
                  <IconPlus className="size-4" data-icon="inline-start" />
                  New workout
                </Button>
              )}
            </motion.div>
          ) : null}

          {showList ? (
            <ul
              className={cn(
                "flex flex-col gap-3 px-4 transition-opacity duration-200 md:gap-4 md:px-0",
                workoutsQuery.isFetching && "opacity-70",
              )}
            >
              <AnimatePresence initial={false}>
                {items.map((workout, index) => {
                  const createdLabel = formatWorkoutDate(workout.createdAt);
                  const hasStats =
                    workout.stats.exerciseCount > 0 ||
                    workout.stats.setCount > 0;

                  return (
                    <motion.li
                      key={workout.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        ...springSoft,
                        delay: Math.min(index * 0.035, 0.28),
                      }}
                    >
                      <Card size="sm">
                        <CardHeader>
                          <CardTitle className="truncate leading-snug tracking-tight">
                            {workout.name}
                          </CardTitle>
                          {createdLabel ? (
                            <CardDescription>
                              Created {createdLabel}
                            </CardDescription>
                          ) : null}
                        </CardHeader>
                        <CardContent>
                          {hasStats || workout.stats.lastLoggedAt ? (
                            <WorkoutStatChips stats={workout.stats} />
                          ) : (
                            <p className="text-muted-foreground/80 text-xs">
                              No sets logged yet
                            </p>
                          )}
                        </CardContent>
                        <CardFooter className="gap-2 border-t border-border/60">
                          <Link
                            href={`/workouts/${workout.id}`}
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" }),
                            )}
                          >
                            <IconEye
                              className="size-3.5"
                              data-icon="inline-start"
                            />
                            View
                          </Link>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteTarget(workout)}
                          >
                            <IconTrash
                              className="size-3.5"
                              data-icon="inline-start"
                            />
                            Delete
                          </Button>
                        </CardFooter>
                      </Card>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          ) : null}
        </div>
      </AppShellBody>

      <CreateWorkoutDialog open={createOpen} onOpenChange={setCreateOpen} />
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
