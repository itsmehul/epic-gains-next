"use client";

import {
  IconBarbell,
  IconBrandYoutube,
  IconBrandYoutubeFilled,
  IconDotsVertical,
  IconPlayerPlayFilled,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconTrendingDown,
  IconTrendingUp,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";

import {
  AppShellBody,
  AppShellHeader,
  AppShellScroll,
} from "@/components/layout/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useFollowingFeed } from "@/features/social/hooks";
import type { FeedWorkoutItem, SocialUser } from "@/features/social/types";
import { useDeleteWorkout, useWorkouts } from "@/features/workouts/hooks";
import { MUSCLE_GROUP_OPTIONS } from "@/features/workouts/muscle-group";
import type { WorkoutListStats, WorkoutWithStats } from "@/features/workouts/types";
import { getYouTubeThumbnailUrl } from "@/features/workouts/youtube";
import { useSession } from "@/infrastructure/auth/client";
import { cn } from "@/shared/utils";

const springSoft = { type: "spring" as const, stiffness: 420, damping: 32 };
const easeOut = [0.25, 1, 0.5, 1] as const;
const SEARCH_DEBOUNCE_MS = 300;
const SHELF_CARD_WIDTH = "minmax(13.75rem,13.75rem)";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

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

function workoutCreatedAt(value: Date | string) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortWorkoutsByCreatedAtAsc<T extends { createdAt: Date | string }>(
  items: T[],
) {
  return [...items].sort(
    (a, b) => workoutCreatedAt(a.createdAt) - workoutCreatedAt(b.createdAt),
  );
}

function groupFollowingByOwner(items: FeedWorkoutItem[]) {
  const groups = new Map<
    string,
    { owner: SocialUser; workouts: FeedWorkoutItem[] }
  >();
  for (const item of items) {
    const existing = groups.get(item.owner.id);
    if (existing) {
      existing.workouts.push(item);
      continue;
    }
    groups.set(item.owner.id, { owner: item.owner, workouts: [item] });
  }

  return [...groups.values()]
    .map((group) => ({
      owner: group.owner,
      workouts: sortWorkoutsByCreatedAtAsc(group.workouts),
    }))
    .sort((a, b) => a.owner.name.localeCompare(b.owner.name));
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
  onDelete?: () => void;
}) {
  const thumbnail = workout.videoUrl
    ? getYouTubeThumbnailUrl(workout.videoUrl)
    : null;
  const youtubeAuthor = workout.author?.trim() || "Imported workout";
  const createdLabel = formatWorkoutDate(workout.createdAt);
  const progressPct =
    workout.stats.exerciseCount > 0
      ? Math.round(
        (workout.stats.loggedExerciseCount / workout.stats.exerciseCount) *
        100,
      )
      : null;

  return (
    <article className="group flex w-55 flex-col gap-2.5">
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
              <IconBarbell className="size-10" stroke={1.25} />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="flex size-10 items-center justify-center rounded-full bg-black/70 text-white shadow-lg">
              <IconPlayerPlayFilled className="size-5 translate-x-px" />
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

      <div className="flex min-w-0 gap-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <Link href={`/workouts/${workout.id}`} className="min-w-0 flex-1">
              <h2 className="line-clamp-2 text-sm leading-snug font-semibold tracking-tight">
                {workout.name}
              </h2>
            </Link>
            {onDelete ? (
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
                    Archive
                  </Button>
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {youtubeAuthor}
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

function WorkoutShelf({
  title,
  href,
  owner,
  workouts,
  emptyHint,
  archiveUserId,
  onDeleteWorkout,
}: {
  title: string;
  href?: string;
  owner?: SocialUser;
  workouts: WorkoutWithStats[];
  emptyHint?: ReactNode;
  archiveUserId?: string;
  onDeleteWorkout?: (workout: WorkoutWithStats) => void;
}) {
  if (workouts.length === 0 && !emptyHint) return null;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex min-w-0 items-center gap-2.5">
        {owner ? (
          <Link
            href={href ?? `/u/${owner.username}`}
            className="flex min-w-0 items-center gap-2.5"
          >
            <Avatar size="sm">
              {owner.image ? <AvatarImage alt="" src={owner.image} /> : null}
              <AvatarFallback>{initials(owner.name)}</AvatarFallback>
            </Avatar>
            <h2 className="truncate text-base font-semibold tracking-tight">
              {title}
            </h2>
          </Link>
        ) : (
          <h2 className="truncate text-base font-semibold tracking-tight">
            {title}
          </h2>
        )}
      </header>
      {workouts.length === 0 ? (
        <div className="text-muted-foreground text-sm">{emptyHint}</div>
      ) : (
        <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 scrollbar-none md:-mx-6 md:px-6">
          <ul
            className="grid w-max grid-flow-col grid-rows-1 gap-x-3"
            style={{ gridAutoColumns: SHELF_CARD_WIDTH }}
          >
            {workouts.map((workout) => (
              <li key={workout.id}>
                <WorkoutFeedCard
                  workout={workout}
                  onDelete={
                    onDeleteWorkout &&
                      archiveUserId &&
                      workout.userId === archiveUserId
                      ? () => onDeleteWorkout(workout)
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function WorkoutShelfSkeleton({ index }: { index: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div
        className="bg-muted h-5 w-28 animate-pulse rounded-md"
        style={{ animationDelay: `${index * 80}ms` }}
      />
      <div className="-mx-4 overflow-hidden px-4 md:-mx-6 md:px-6">
        <div
          className="grid w-max grid-flow-col grid-rows-1 gap-x-3"
          style={{ gridAutoColumns: SHELF_CARD_WIDTH }}
        >
          {Array.from({ length: 4 }, (_, cardIndex) => (
            <WorkoutFeedSkeleton key={cardIndex} index={index * 4 + cardIndex} />
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkoutFeedSkeleton({ index }: { index: number }) {
  return (
    <div
      className="flex w-55 flex-col gap-2.5"
      style={{ animationDelay: `${index * 60}ms` }}
    >
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
          <DialogTitle>Archive workout?</DialogTitle>
          <DialogDescription>
            {workout
              ? `“${workout.name}” will leave the catalog. Logged sets stay on each member’s history.`
              : "This workout will leave the catalog. Logged sets stay on each member’s history."}
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
                Archiving…
              </>
            ) : (
              "Archive"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WorkoutsPageClient() {
  const searchId = useId();
  const { data: session } = useSession();
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

  const mineQuery = useWorkouts({
    q: debouncedSearch,
    muscleGroups,
    scope: "mine",
  });
  const catalogQuery = useWorkouts({
    q: debouncedSearch,
    muscleGroups,
    scope: "catalog",
  });
  const followingQuery = useFollowingFeed({
    q: debouncedSearch,
    muscleGroups,
  });

  const personalWorkouts = useMemo(
    () => sortWorkoutsByCreatedAtAsc(mineQuery.data?.items ?? []),
    [mineQuery.data?.items],
  );
  const catalogWorkouts = useMemo(
    () => sortWorkoutsByCreatedAtAsc(catalogQuery.data?.items ?? []),
    [catalogQuery.data?.items],
  );
  const followingSections = useMemo(
    () => groupFollowingByOwner(followingQuery.data?.items ?? []),
    [followingQuery.data?.items],
  );

  const isInitialLoading =
    mineQuery.isPending && catalogQuery.isPending && followingQuery.isPending;
  const isError =
    mineQuery.isError || catalogQuery.isError || followingQuery.isError;
  const error = mineQuery.error ?? catalogQuery.error ?? followingQuery.error;
  const isFetching =
    mineQuery.isFetching || catalogQuery.isFetching || followingQuery.isFetching;
  const hasSearch = debouncedSearch.length > 0;
  const hasFilters = hasSearch || muscleGroups.length > 0;
  const hasSections =
    personalWorkouts.length > 0 ||
    catalogWorkouts.length > 0 ||
    followingSections.length > 0;
  const bothReady =
    !mineQuery.isPending &&
    !catalogQuery.isPending &&
    !followingQuery.isPending;
  const showEmpty = bothReady && !isError && !hasSections;
  const showList = !isError && !isInitialLoading && !showEmpty;

  function refetchAll() {
    void mineQuery.refetch();
    void catalogQuery.refetch();
    void followingQuery.refetch();
  }

  return (
    <AppShellScroll>
      <AppShellHeader
        title="Workouts"
        actions={
          <div className="flex items-center gap-1.5 md:gap-2 h-full">
            <Link
              href="/workouts/import"
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "flex items-baseline gap-2 h-8"
              )}
              style={{ alignItems: "center" }}
            >
              <span className="flex items-center">
                <IconBrandYoutubeFilled data-icon="inline-start" />
              </span>
              <span className="flex items-center">Import</span>
            </Link>

          </div>

        }
      />
      <AppShellBody className="max-w-screen-2xl">
        <div className="flex flex-col gap-4 px-4 pt-4 pb-10 md:gap-5 md:px-6 md:pt-6 md:pb-14">
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
                placeholder="Search workouts, friends, or muscles"
                aria-label="Search workouts by name, friend, author, muscle group, or key muscles"
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

          {isInitialLoading ? (
            <div
              className="flex flex-col gap-8"
              aria-busy="true"
              aria-label="Loading workouts"
            >
              {Array.from({ length: 2 }, (_, index) => (
                <WorkoutShelfSkeleton key={index} index={index} />
              ))}
            </div>
          ) : null}

          {isError ? (
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
                  {error instanceof Error
                    ? error.message
                    : "Something went wrong. Try again."}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={refetchAll}
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
                {hasFilters ? (
                  <IconSearch className="size-7" stroke={1.5} />
                ) : (
                  <IconBrandYoutube className="size-7 text-red-500" stroke={1.5} />
                )}
              </div>
              <div className="relative flex max-w-xs flex-col gap-2">
                <p className="text-base font-semibold tracking-tight">
                  {hasFilters ? "No matches" : "Your feed is empty"}
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {hasFilters
                    ? "Nothing matched those filters. Try a different name, friend, or muscle."
                    : "Import a YouTube workout, or follow friends to see their workouts here."}
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
                <div className="relative flex flex-wrap items-center justify-center gap-2">
                  <Link href="/workouts/import" className={cn(buttonVariants())}>
                    <IconBrandYoutube className="size-4 text-red-500" data-icon="inline-start" />
                    Import
                  </Link>
                  <Link
                    href="/friends"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    <IconUsers className="size-4" data-icon="inline-start" />
                    Find friends
                  </Link>
                </div>
              )}
            </motion.div>
          ) : null}

          {showList ? (
            <div
              className={cn(
                "flex flex-col gap-8 transition-opacity duration-200",
                isFetching && "opacity-70",
              )}
            >
              <AnimatePresence initial={false}>
                {mineQuery.isPending ? (
                  <WorkoutShelfSkeleton key="personal-loading" index={0} />
                ) : (
                  <motion.div
                    key="personal"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={springSoft}
                  >
                    <WorkoutShelf
                      emptyHint={
                        personalWorkouts.length === 0 ? (
                          hasFilters ? (
                            "No matching personal workouts."
                          ) : (
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              Import a YouTube workout to fill this row.
                              <Link
                                href="/workouts/import"
                                className="text-foreground font-medium underline-offset-4 hover:underline"
                              >
                                Import
                              </Link>
                            </span>
                          )
                        ) : undefined
                      }
                      title="Personal"
                      workouts={personalWorkouts}
                      archiveUserId={session?.user?.id}
                      onDeleteWorkout={setDeleteTarget}
                    />
                  </motion.div>
                )}
                {followingQuery.isPending ? (
                  <WorkoutShelfSkeleton key="following-loading" index={1} />
                ) : followingSections.length === 0 ? (
                  <motion.div
                    key="followers"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={springSoft}
                  >
                    <WorkoutShelf
                      emptyHint={
                        hasFilters
                          ? "No matching workouts from people you follow."
                          : "Follow friends to see their workouts here."
                      }
                      title="Followers"
                      workouts={[]}
                    />
                  </motion.div>
                ) : (
                  followingSections.map((section) => (
                    <motion.div
                      key={section.owner.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={springSoft}
                    >
                      <WorkoutShelf
                        href={`/u/${section.owner.username}`}
                        owner={section.owner}
                        title={section.owner.name}
                        workouts={section.workouts}
                      />
                    </motion.div>
                  ))
                )}
                {catalogQuery.isPending ? (
                  <WorkoutShelfSkeleton key="public-loading" index={2} />
                ) : (
                  <motion.div
                    key="public"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={springSoft}
                  >
                    <WorkoutShelf
                      emptyHint={
                        catalogWorkouts.length === 0
                          ? hasFilters
                            ? "No matching public workouts."
                            : "No public workouts yet."
                          : undefined
                      }
                      title="Public"
                      workouts={catalogWorkouts}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
