import type { AchievementCategory } from "@/features/achievements/catalog";

export type UnlockedAchievement = {
  id: string;
  name: string;
  description: string;
  gamerscore: number;
  category: AchievementCategory;
  secret?: boolean;
  target: number;
  unlockedAt: Date | string;
};

export type AchievementListItem = UnlockedAchievement & {
  progress: number;
  unlocked: boolean;
  unlockedAt: Date | string | null;
};

export type ListAchievementsResult = {
  items: AchievementListItem[];
  gamerscore: number;
  totalGamerscore: number;
  unlockedCount: number;
};
