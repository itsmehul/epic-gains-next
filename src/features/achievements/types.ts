import type {
  AchievementCategory,
  AchievementScope,
  WorkoutAchievementTier,
} from "@/features/achievements/catalog";

export type UnlockedAchievement = {
  id: string;
  name: string;
  description: string;
  gamerscore: number;
  category: AchievementCategory;
  scope: AchievementScope;
  secret?: boolean;
  target: number;
  workoutId: string | null;
  workoutName: string | null;
  unlockedAt: Date | string;
  tier?: WorkoutAchievementTier;
};

export type AchievementListItem = Omit<UnlockedAchievement, "unlockedAt"> & {
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
