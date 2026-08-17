import type { ComponentType } from "react";

import {
  IconAwardStar,
  IconCrown,
  IconDiamondShine,
  IconMilitaryTech,
  type IconProps,
} from "@/components/ui/icons";
import {
  WORKOUT_ACHIEVEMENT_TIER_LABELS,
  type WorkoutAchievementTier,
} from "@/features/achievements/catalog";
import type { WorkoutTierProgress } from "@/features/achievements/evaluate";
import { cn } from "@/shared/utils";

const TIER_ICONS: Record<WorkoutAchievementTier, ComponentType<IconProps>> = {
  bronze: IconMilitaryTech,
  silver: IconAwardStar,
  gold: IconCrown,
  platinum: IconDiamondShine,
};

const TIER_COLOR: Record<
  "onDark" | "onSurface",
  Record<WorkoutAchievementTier, string>
> = {
  onDark: {
    bronze: "text-[#e0a15a]",
    silver: "text-[#d5dce6]",
    gold: "text-[#f5c542]",
    platinum: "text-[#9aefe8]",
  },
  onSurface: {
    bronze: "text-[#b56b2a] dark:text-[#e0a15a]",
    silver: "text-zinc-500 dark:text-zinc-300",
    gold: "text-amber-700 dark:text-[#f5c542]",
    platinum: "text-cyan-700 dark:text-[#9aefe8]",
  },
};

function tierLabel(item: WorkoutTierProgress) {
  const name = WORKOUT_ACHIEVEMENT_TIER_LABELS[item.tier];
  if (item.completers != null) {
    return `${name} ${item.completers} completed`;
  }
  if (item.total <= 0) return name;
  if (item.unlocked >= item.total) return `${name} complete`;
  if (item.unlocked > 0) {
    return `${name} ${item.unlocked} of ${item.total}`;
  }
  return `${name} locked`;
}

export function WorkoutTierRewardIcon({
  item,
  className,
  tone = "onDark",
}: {
  item: WorkoutTierProgress;
  className?: string;
  tone?: "onDark" | "onSurface";
}) {
  const Icon = TIER_ICONS[item.tier];
  const complete =
    item.completers != null
      ? item.completers > 0
      : item.total > 0 && item.unlocked >= item.total;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        complete
          ? TIER_COLOR[tone][item.tier]
          : tone === "onDark"
            ? "text-white/28"
            : "text-muted-foreground/40",
        className,
      )}
      title={tierLabel(item)}
    >
      <Icon className="size-full" fill={complete} />
    </span>
  );
}

export function WorkoutTierRewardStrip({
  tiers,
  className,
  showCompleters = false,
  tone = "onDark",
}: {
  tiers: WorkoutTierProgress[];
  className?: string;
  showCompleters?: boolean;
  tone?: "onDark" | "onSurface";
}) {
  if (tiers.length === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex",
        tone === "onDark" && "bg-black/90 shadow-sm ring-1 ring-white/18",
        showCompleters
          ? "items-center gap-1.5 rounded-lg px-2 py-1.5"
          : "items-center gap-0.5 rounded-full px-1 py-0.5",
        tone === "onSurface" && showCompleters && "gap-2.5 px-0 py-0",
        className,
      )}
      aria-label={tiers.map(tierLabel).join(", ")}
    >
      {tiers.map((item) => (
        <span
          className={cn(
            "inline-flex items-center",
            showCompleters && "min-w-5 flex-row items-center gap-0.5",
          )}
          key={item.tier}
        >
          <WorkoutTierRewardIcon
            className={showCompleters ? "size-5" : "size-4"}
            item={item}
            tone={tone}
          />
          {showCompleters ? (
            <span
              className={cn(
                "text-[11px] leading-none font-semibold tabular-nums",
                (item.completers ?? 0) > 0
                  ? tone === "onDark"
                    ? "text-white"
                    : "text-foreground"
                  : tone === "onDark"
                    ? "text-white/40"
                    : "text-muted-foreground/40",
              )}
            >
              {item.completers ?? 0}
            </span>
          ) : null}
        </span>
      ))}
    </span>
  );
}
