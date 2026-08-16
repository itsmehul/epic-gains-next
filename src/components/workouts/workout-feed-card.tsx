"use client";

import {
  IconBarbell,
  IconDotsVertical,
  IconPlayerPlayFilled,
  IconTrash,
  IconTrendingDown,
  IconTrendingUp,
} from "@/components/ui/icons";
import Link from "next/link";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { SocialUser } from "@/features/social/types";
import type { WorkoutListStats, WorkoutWithStats } from "@/features/workouts/types";
import { getYouTubeThumbnailUrl } from "@/features/workouts/youtube";
import { cn } from "@/shared/utils";

export function personInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatWorkoutDate(value: Date | string) {
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

export function WorkoutMetaLine({ stats }: { stats: WorkoutListStats }) {
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

export function WorkoutFeedCard({
  workout,
  owner,
  onDelete,
  className,
}: {
  workout: WorkoutWithStats;
  owner?: SocialUser;
  onDelete?: () => void;
  className?: string;
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
  const byline = owner
    ? [owner.name, createdLabel].filter(Boolean).join(" · ")
    : [youtubeAuthor, createdLabel].filter(Boolean).join(" · ");

  return (
    <article className={cn("group flex w-55 flex-col gap-2.5", className)}>
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

      <div className="flex min-w-0 gap-2">
        {owner ? (
          <Link
            href={`/u/${owner.username}`}
            className="mt-0.5 shrink-0"
            aria-label={owner.name}
          >
            <Avatar size="sm">
              {owner.image ? <AvatarImage alt="" src={owner.image} /> : null}
              <AvatarFallback>{personInitials(owner.name)}</AvatarFallback>
            </Avatar>
          </Link>
        ) : null}
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
            {byline}
          </p>
          {owner && workout.author?.trim() ? (
            <p className="text-muted-foreground/80 truncate text-[11px]">
              {workout.author.trim()}
            </p>
          ) : null}
          <div className="mt-1">
            <WorkoutMetaLine stats={workout.stats} />
          </div>
        </div>
      </div>
    </article>
  );
}

export function WorkoutFeedSkeleton({
  index,
  className,
}: {
  index: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex w-55 flex-col gap-2.5", className)}
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
