"use client";

import type { ComponentType } from "react";
import Link from "next/link";

import { formatUnlockedAt } from "@/components/achievements/achievement-tile";
import {
  IconBarbell,
  IconChartBar,
  IconFlame,
  IconFocus2,
  IconTrophy,
  type IconProps,
} from "@/components/ui/icons";
import type { ProfileInsights } from "@/features/social/profile-insights";
import { muscleGroupLabel } from "@/features/workouts/muscle-group";
import { cn } from "@/shared/utils";

function InsightCard({
  label,
  value,
  detail,
  icon: Icon,
  href,
  onClick,
  accent,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: ComponentType<IconProps>;
  href?: string;
  onClick?: () => void;
  accent?: boolean;
}) {
  const className = cn(
    "relative isolate flex min-h-[5.5rem] flex-col overflow-hidden rounded-2xl px-3.5 py-3 text-left transition-colors",
    accent
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "bg-muted/60 hover:bg-muted",
  );

  const body = (
    <>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 opacity-70",
          accent ? "pattern-diagonal" : "pattern-dots",
        )}
      />
      <div className="relative flex items-start justify-between gap-2">
        <p
          className={cn(
            "text-[11px] font-medium tracking-[0.32px] uppercase",
            accent ? "opacity-80" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        <Icon
          className={cn("size-4 shrink-0", accent ? "opacity-90" : "text-primary")}
          stroke={1.7}
        />
      </div>
      <p className="relative mt-auto line-clamp-2 pt-3 text-[15px] leading-5 font-medium tracking-tight">
        {value}
      </p>
      {detail ? (
        <p
          className={cn(
            "relative mt-0.5 text-xs tabular-nums",
            accent ? "opacity-80" : "text-muted-foreground",
          )}
        >
          {detail}
        </p>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link className={className} href={href}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button className={className} onClick={onClick} type="button">
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}

export function ProfileInsightsGrid({
  insights,
  onOpenAchievements,
}: {
  insights: ProfileInsights;
  onOpenAchievements?: () => void;
}) {
  if (insights.setCount === 0 && !insights.latestAchievement) return null;

  const muscleLabel = insights.topMuscle
    ? muscleGroupLabel(insights.topMuscle.group)
    : null;

  return (
    <div className="space-y-2">
      <div className="bg-muted/50 grid grid-cols-3 overflow-hidden rounded-2xl">
        <div className="px-3 py-2.5">
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.32px] uppercase">
            Sets
          </p>
          <p className="mt-0.5 text-lg font-medium tabular-nums tracking-tight">
            {insights.setCount}
          </p>
        </div>
        <div className="border-border/70 border-l px-3 py-2.5">
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.32px] uppercase">
            Days
          </p>
          <p className="mt-0.5 text-lg font-medium tabular-nums tracking-tight">
            {insights.trainingDays}
          </p>
        </div>
        <div className="border-border/70 border-l px-3 py-2.5">
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.32px] uppercase">
            Streak
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-lg font-medium tabular-nums tracking-tight">
            <IconFlame className="text-primary size-3.5" />
            {insights.streakDays}d
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {insights.favoriteWorkout ? (
          <InsightCard
            detail={`${insights.favoriteWorkout.setCount} sets`}
            href={`/workouts/${insights.favoriteWorkout.id}`}
            icon={IconBarbell}
            label="Favourite workout"
            value={insights.favoriteWorkout.name}
          />
        ) : null}
        {insights.favoriteExercise ? (
          <InsightCard
            detail={`${insights.favoriteExercise.setCount} sets`}
            icon={IconFocus2}
            label="Favourite exercise"
            value={insights.favoriteExercise.name}
          />
        ) : null}
        {muscleLabel && insights.topMuscle ? (
          <InsightCard
            detail={`${insights.topMuscle.setCount} sets`}
            icon={IconChartBar}
            label="Most trained"
            value={muscleLabel}
          />
        ) : null}
        {insights.latestAchievement ? (
          <InsightCard
            accent
            detail={
              formatUnlockedAt(insights.latestAchievement.unlockedAt) ??
              `${insights.latestAchievement.gamerscore}G`
            }
            icon={IconTrophy}
            label="Latest unlock"
            onClick={onOpenAchievements}
            value={
              insights.latestAchievement.secret
                ? "Secret"
                : insights.latestAchievement.name
            }
          />
        ) : null}
      </div>
    </div>
  );
}

export function ProfileInsightsSkeleton() {
  return (
    <div className="space-y-2">
      <div className="bg-muted/40 h-[4.25rem] animate-pulse rounded-2xl" />
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/40 h-[5.5rem] animate-pulse rounded-2xl" />
        <div className="bg-muted/40 h-[5.5rem] animate-pulse rounded-2xl" />
        <div className="bg-muted/40 h-[5.5rem] animate-pulse rounded-2xl" />
        <div className="bg-muted/40 h-[5.5rem] animate-pulse rounded-2xl" />
      </div>
    </div>
  );
}
