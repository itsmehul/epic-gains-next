"use client";

import {
  IconBrandYoutube,
  IconBrandYoutubeFilled,
  IconRefresh,
  IconSearch,
  IconUsers,
  IconX,
} from "@/components/ui/icons";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";

import { AchievementChessRank } from "@/components/achievements/achievement-chess-rank";
import { GlobalAchievementHeader } from "@/components/achievements/global-achievement-header";
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
import { Spinner } from "@/components/ui/spinner";
import {
  WorkoutFeedCard,
  WorkoutFeedSkeleton,
  personInitials,
} from "@/components/workouts/workout-feed-card";
import type { MuscleGroup } from "@/db/schema/workout-schema";
import {
  useAchievements,
  useProfileAchievements,
} from "@/features/achievements/hooks";
import type { AchievementListItem } from "@/features/achievements/types";
import { useFollowingFeed } from "@/features/social/hooks";
import type { FeedWorkoutItem, SocialUser } from "@/features/social/types";
import { useDeleteWorkout, useWorkouts } from "@/features/workouts/hooks";
import { MUSCLE_GROUP_OPTIONS } from "@/features/workouts/muscle-group";
import type { WorkoutWithStats } from "@/features/workouts/types";
import { useSession } from "@/infrastructure/auth/client";
import { cn } from "@/shared/utils";

const springSoft = { type: "spring" as const, stiffness: 420, damping: 32 };
const easeOut = [0.25, 1, 0.5, 1] as const;
const SEARCH_DEBOUNCE_MS = 300;
const SHELF_CARD_WIDTH = "minmax(13.75rem,13.75rem)";

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

function WorkoutShelf({
  title,
  href,
  owner,
  workouts,
  emptyHint,
  archiveUserId,
  onDeleteWorkout,
  showLoggedStats = true,
  showCommunityOverlay = false,
  headerAddon,
}: {
  title: string;
  href?: string;
  owner?: SocialUser;
  workouts: WorkoutWithStats[];
  emptyHint?: ReactNode;
  archiveUserId?: string;
  onDeleteWorkout?: (workout: WorkoutWithStats) => void;
  showLoggedStats?: boolean;
  showCommunityOverlay?: boolean;
  headerAddon?: ReactNode;
}) {
  const ownerAchievements = useProfileAchievements(
    owner?.username ?? "",
    Boolean(owner?.username),
  );

  if (workouts.length === 0 && !emptyHint) return null;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex min-w-0 items-center gap-2.5">
        {owner ? (
          <Link
            href={href ?? `/u/${owner.username}`}
            className="flex min-w-0 shrink-0 items-center gap-2.5"
          >
            <Avatar size="sm">
              {owner.image ? <AvatarImage alt="" src={owner.image} /> : null}
              <AvatarFallback>{personInitials(owner.name)}</AvatarFallback>
            </Avatar>
            <h2 className="truncate text-base font-semibold tracking-tight">
              {title}
            </h2>
            {ownerAchievements.data ? (
              <AchievementChessRank
                maxSizePx={22}
                unlockedCount={ownerAchievements.data.unlockedCount}
              />
            ) : null}
          </Link>
        ) : (
          <h2 className="shrink-0 truncate text-base font-semibold tracking-tight">
            {title}
          </h2>
        )}
        {headerAddon}
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
                  showLoggedStats={showLoggedStats}
                  showCommunityOverlay={showCommunityOverlay}
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
  const achievementsQuery = useAchievements();
  const globalAchievements = useMemo(
    () =>
      (achievementsQuery.data?.items ?? []).filter(
        (item: AchievementListItem) => item.scope === "global",
      ),
    [achievementsQuery.data?.items],
  );

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
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              />
              <Input
                id={searchId}
                type="search"
                value={searchInput}
                maxLength={200}
                placeholder="Search workouts, friends, or muscles"
                aria-label="Search workouts by name, friend, author, muscle group, or key muscles"
                className="pl-9 pr-10"
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
                      headerAddon={
                        <GlobalAchievementHeader items={globalAchievements} />
                      }
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
                      showLoggedStats={false}
                      showCommunityOverlay
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
