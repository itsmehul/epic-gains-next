import {
  IconCalendarEvent,
  IconCheck,
  IconFocus2,
  IconGamepad,
  IconLock,
  IconNotebook,
  IconPlayerPlay,
  IconTrophy,
} from "@/components/ui/icons";

import { Badge } from "@/components/ui/badge";
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "@/components/ui/progress";
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  WORKOUT_ACHIEVEMENT_TIER_LABELS,
  type AchievementCategory,
  type WorkoutAchievementTier,
} from "@/features/achievements/catalog";
import type { AchievementListItem } from "@/features/achievements/types";
import { cn } from "@/shared/utils";

const CATEGORY_ICONS: Record<AchievementCategory, typeof IconTrophy> = {
  ink: IconNotebook,
  days: IconCalendarEvent,
  tapes: IconPlayerPlay,
  targets: IconFocus2,
  hud: IconGamepad,
};

const TIER_BADGE_CLASS: Record<WorkoutAchievementTier, string> = {
  bronze:
    "border-transparent bg-[oklch(0.72_0.12_70_/_0.22)] text-[oklch(0.45_0.1_55)] dark:text-[oklch(0.84_0.1_75)]",
  silver:
    "border-transparent bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
  gold: "border-transparent bg-amber-500/18 text-amber-800 dark:text-amber-300",
  platinum:
    "border-transparent bg-cyan-500/15 text-cyan-800 dark:text-cyan-200",
};

export function formatUnlockedAt(value: Date | string | null) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AchievementTile({ item }: { item: AchievementListItem }) {
  const hidden = item.secret && !item.unlocked;
  const Icon = CATEGORY_ICONS[item.category];
  const pct = item.target > 0 ? Math.round((item.progress / item.target) * 100) : 0;

  return (
    <article
      className={cn(
        "relative isolate overflow-hidden rounded-xl px-4 py-3.5 transition-colors duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
        item.unlocked ? "bg-primary/10" : "bg-muted/55",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 opacity-80",
          item.unlocked ? "pattern-dots" : "pattern-graph",
        )}
      />
      <div className="relative grid grid-cols-[auto_1fr_auto] items-center gap-4">
      <div
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-full",
          item.unlocked
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground",
        )}
      >
        {hidden ? (
          <IconLock className="size-5" stroke={1.7} />
        ) : item.unlocked ? (
          <IconCheck className="size-5" stroke={2} />
        ) : (
          <Icon className="size-5" stroke={1.7} />
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-[16px] leading-6 font-medium tracking-[0.15px]">
            {hidden ? "Secret" : item.name}
          </p>
          {item.tier ? (
            <Badge
              variant="secondary"
              className={cn("h-5 px-1.5 text-[10px]", TIER_BADGE_CLASS[item.tier])}
            >
              {WORKOUT_ACHIEVEMENT_TIER_LABELS[item.tier]}
            </Badge>
          ) : null}
          {item.unlocked ? (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {ACHIEVEMENT_CATEGORY_LABELS[item.category]}
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm leading-5 tracking-[0.25px]">
          {hidden ? "Keep logging sets to reveal this one." : item.description}
        </p>
        {item.workoutName && !hidden ? (
          <p className="text-muted-foreground/80 mt-0.5 truncate text-xs">
            {item.workoutName}
          </p>
        ) : null}
        {!item.unlocked ? (
          <div className="mt-2.5 flex items-center gap-3">
            <Progress className="min-w-0 flex-1 gap-0" value={pct}>
              <ProgressTrack className="h-1.5">
                <ProgressIndicator />
              </ProgressTrack>
            </Progress>
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {item.progress}/{item.target}
            </span>
          </div>
        ) : (
          <p className="text-primary mt-1 text-xs font-medium tracking-[0.4px]">
            Unlocked {formatUnlockedAt(item.unlockedAt) ?? ""}
          </p>
        )}
      </div>
      <p
        className={cn(
          "shrink-0 text-sm font-medium tabular-nums tracking-[0.1px]",
          item.unlocked ? "text-primary" : "text-muted-foreground",
        )}
      >
        {item.gamerscore}G
      </p>
      </div>
    </article>
  );
}
