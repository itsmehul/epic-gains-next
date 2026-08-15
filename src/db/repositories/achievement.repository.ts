import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  exercise,
  set as workoutSet,
  userAchievement,
} from "@/db/schema";
import {
  ACHIEVEMENT_BY_ID,
  TOTAL_GAMERSCORE,
  type AchievementDefinition,
} from "@/features/achievements/catalog";
import {
  buildAchievementStats,
  evaluateAchievements,
} from "@/features/achievements/evaluate";

export type UnlockedAchievement = AchievementDefinition & {
  unlockedAt: Date;
};

export type AchievementListItem = AchievementDefinition & {
  progress: number;
  unlocked: boolean;
  unlockedAt: Date | null;
};

async function loadSetRows(userId: string) {
  return db
    .select({
      workoutId: workoutSet.workoutId,
      exerciseId: workoutSet.exerciseId,
      muscleGroup: exercise.muscleGroup,
      keyMuscles: exercise.keyMuscles,
      updatedAt: workoutSet.updatedAt,
    })
    .from(workoutSet)
    .innerJoin(exercise, eq(exercise.id, workoutSet.exerciseId))
    .where(eq(workoutSet.userId, userId));
}

async function listUnlocks(userId: string) {
  return db
    .select()
    .from(userAchievement)
    .where(eq(userAchievement.userId, userId));
}

async function insertUnlocks(userId: string, achievementIds: string[]) {
  if (achievementIds.length === 0) return [];

  return db
    .insert(userAchievement)
    .values(
      achievementIds.map((achievementId) => ({
        userId,
        achievementId,
      })),
    )
    .onConflictDoNothing()
    .returning();
}

export async function unlockNewAchievementsForUser(
  userId: string,
): Promise<UnlockedAchievement[]> {
  const [rows, existing] = await Promise.all([
    loadSetRows(userId),
    listUnlocks(userId),
  ]);
  const already = new Set(existing.map((row) => row.achievementId));
  const earned = evaluateAchievements(buildAchievementStats(rows)).filter(
    (item) => item.unlocked && !already.has(item.id),
  );
  const inserted = await insertUnlocks(
    userId,
    earned.map((item) => item.id),
  );
  const insertedIds = new Set(inserted.map((row) => row.achievementId));
  const unlockedAtById = new Map(
    inserted.map((row) => [row.achievementId, row.unlockedAt]),
  );

  return earned
    .filter((item) => insertedIds.has(item.id))
    .map((item) => {
      const definition = ACHIEVEMENT_BY_ID.get(item.id);
      if (!definition) return null;
      return {
        ...definition,
        unlockedAt: unlockedAtById.get(item.id) ?? new Date(),
      };
    })
    .filter((item): item is UnlockedAchievement => item !== null);
}

export async function listAchievementsForUser(userId: string): Promise<{
  items: AchievementListItem[];
  gamerscore: number;
  totalGamerscore: number;
  unlockedCount: number;
}> {
  const newlyUnlocked = await unlockNewAchievementsForUser(userId);
  const [rows, unlocks] = await Promise.all([
    loadSetRows(userId),
    listUnlocks(userId),
  ]);
  const unlockedAtById = new Map(
    unlocks.map((row) => [row.achievementId, row.unlockedAt]),
  );
  for (const item of newlyUnlocked) {
    if (!unlockedAtById.has(item.id)) {
      unlockedAtById.set(item.id, item.unlockedAt);
    }
  }

  const items = evaluateAchievements(buildAchievementStats(rows)).map(
    (item) => ({
      ...item,
      unlocked: unlockedAtById.has(item.id) || item.unlocked,
      unlockedAt: unlockedAtById.get(item.id) ?? null,
    }),
  );

  const gamerscore = items
    .filter((item) => item.unlocked)
    .reduce((sum, item) => sum + item.gamerscore, 0);

  return {
    items,
    gamerscore,
    totalGamerscore: TOTAL_GAMERSCORE,
    unlockedCount: items.filter((item) => item.unlocked).length,
  };
}
