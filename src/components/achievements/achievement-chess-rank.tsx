import { IconChessPawn } from "@/components/ui/icons";

const MIN_SIZE_PX = 16;
const MAX_SIZE_PX = 40;
/** Doubles every 10 unlocked achievements, then caps. */
const DOUBLE_EVERY = 10;

export function achievementChessSizePx(
  unlockedCount: number,
  maxSizePx = MAX_SIZE_PX,
) {
  if (unlockedCount <= 0) return 0;
  return Math.min(
    maxSizePx,
    MIN_SIZE_PX * 2 ** ((unlockedCount - 1) / DOUBLE_EVERY),
  );
}

export function AchievementChessRank({
  unlockedCount,
  maxSizePx,
}: {
  unlockedCount: number;
  maxSizePx?: number;
}) {
  const size = achievementChessSizePx(unlockedCount, maxSizePx);
  if (size <= 0) return null;

  return (
    <IconChessPawn
      aria-hidden={false}
      aria-label={`${unlockedCount} achievement${unlockedCount === 1 ? "" : "s"}`}
      className="shrink-0 text-amber-700 dark:text-[#f5c542]"
      fill
      role="img"
      style={{ width: size, height: size }}
      title={`${unlockedCount} achievement${unlockedCount === 1 ? "" : "s"}`}
    />
  );
}
