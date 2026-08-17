import "server-only";

import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  exercise,
  set as workoutSet,
  userAchievement,
  workout,
  workoutExercise,
} from "@/db/schema";
import {
  ACHIEVEMENT_BY_ID,
  GLOBAL_GAMERSCORE,
} from "@/features/achievements/catalog";
import {
  evaluateAchievements,
  prescribedSetsFromTargets,
  type AchievementSetRow,
  type EvaluatedAchievement,
  type WorkoutRosterExercise,
} from "@/features/achievements/evaluate";
import type {
  AchievementListItem,
  UnlockedAchievement,
} from "@/features/achievements/types";
import { isRestWorkoutItem } from "@/features/workouts/workout-item";

export type { AchievementListItem, UnlockedAchievement };

function evaluatedKey(item: EvaluatedAchievement) {
  return item.workoutId ? `${item.id}::${item.workoutId}` : item.id;
}

function toUnlocked(
  item: EvaluatedAchievement,
  names: Map<string, string>,
  unlockedAt: Date,
): UnlockedAchievement | null {
  const definition = ACHIEVEMENT_BY_ID.get(item.id);
  if (!definition) return null;
  return {
    id: definition.id,
    name: definition.name,
    description: item.description,
    gamerscore: definition.gamerscore,
    category: definition.category,
    scope: definition.scope,
    secret: definition.secret,
    target: item.target,
    workoutId: item.workoutId,
    workoutName: item.workoutId ? (names.get(item.workoutId) ?? null) : null,
    unlockedAt,
    tier: definition.scope === "workout" ? definition.tier : undefined,
  };
}

async function loadSetRows(userId: string) {
  return db
    .select({
      id: workoutSet.id,
      workoutId: workoutSet.workoutId,
      exerciseId: workoutSet.exerciseId,
      muscleGroup: exercise.muscleGroup,
      keyMuscles: exercise.keyMuscles,
      metricProfile: exercise.metricProfile,
      reps: workoutSet.reps,
      weight: workoutSet.weight,
      time: workoutSet.time,
      distance: workoutSet.distance,
      updatedAt: workoutSet.updatedAt,
    })
    .from(workoutSet)
    .innerJoin(exercise, eq(exercise.id, workoutSet.exerciseId))
    .where(eq(workoutSet.userId, userId));
}

function toEvalRows(
  rows: Awaited<ReturnType<typeof loadSetRows>>,
): AchievementSetRow[] {
  return rows.map((row) => ({
    workoutId: row.workoutId,
    exerciseId: row.exerciseId,
    muscleGroup: row.muscleGroup,
    keyMuscles: row.keyMuscles,
    metricProfile: row.metricProfile,
    reps: row.reps,
    weight: row.weight,
    time: row.time,
    distance: row.distance,
    updatedAt: row.updatedAt,
  }));
}

async function loadRosterByWorkout(workoutIds: string[]) {
  const map = new Map<string, WorkoutRosterExercise[]>();
  if (workoutIds.length === 0) return map;

  const rows = await db
    .select({
      workoutId: workoutExercise.workoutId,
      exerciseId: workoutExercise.exerciseId,
      name: workoutExercise.name,
      tags: workoutExercise.tags,
      metaData: workoutExercise.metaData,
      metricProfile: exercise.metricProfile,
    })
    .from(workoutExercise)
    .innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
    .where(inArray(workoutExercise.workoutId, workoutIds));

  for (const row of rows) {
    if (isRestWorkoutItem(row)) continue;
    const list = map.get(row.workoutId) ?? [];
    list.push({
      exerciseId: row.exerciseId,
      metricProfile: row.metricProfile,
      prescribedSets: prescribedSetsFromTargets(row.metaData?.targets),
    });
    map.set(row.workoutId, list);
  }
  return map;
}

async function loadWorkoutNames(workoutIds: string[]) {
  const map = new Map<string, string>();
  if (workoutIds.length === 0) return map;
  const rows = await db
    .select({ id: workout.id, name: workout.name })
    .from(workout)
    .where(inArray(workout.id, workoutIds));
  for (const row of rows) map.set(row.id, row.name);
  return map;
}

async function listUnlocks(userId: string) {
  return db
    .select()
    .from(userAchievement)
    .where(eq(userAchievement.userId, userId));
}

async function insertGlobalUnlocks(userId: string, achievementIds: string[]) {
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
  options?: { createdSetId?: string },
): Promise<UnlockedAchievement[]> {
  const [rows, existing] = await Promise.all([
    loadSetRows(userId),
    listUnlocks(userId),
  ]);
  const workoutIds = [...new Set(rows.map((row) => row.workoutId))];
  const [rosterByWorkout, names] = await Promise.all([
    loadRosterByWorkout(workoutIds),
    loadWorkoutNames(workoutIds),
  ]);

  const current = evaluateAchievements(toEvalRows(rows), rosterByWorkout);
  const previousRows = options?.createdSetId
    ? rows.filter((row) => row.id !== options.createdSetId)
    : rows;
  const previous = options?.createdSetId
    ? evaluateAchievements(toEvalRows(previousRows), rosterByWorkout)
    : current;

  const previousUnlocked = new Set(
    previous.filter((item) => item.unlocked).map(evaluatedKey),
  );
  const alreadyGlobal = new Set(existing.map((row) => row.achievementId));

  const newlyEvaluated = current.filter((item) => {
    if (!item.unlocked) return false;
    if (item.scope === "global") return !alreadyGlobal.has(item.id);
    return !previousUnlocked.has(evaluatedKey(item));
  });

  const inserted = await insertGlobalUnlocks(
    userId,
    newlyEvaluated
      .filter((item) => item.scope === "global")
      .map((item) => item.id),
  );
  const insertedIds = new Set(inserted.map((row) => row.achievementId));
  const unlockedAtById = new Map(
    inserted.map((row) => [row.achievementId, row.unlockedAt]),
  );
  const now = new Date();

  const unlocked: UnlockedAchievement[] = [];
  for (const item of newlyEvaluated) {
    if (item.scope === "global" && !insertedIds.has(item.id)) continue;
    const mapped = toUnlocked(
      item,
      names,
      item.scope === "global"
        ? (unlockedAtById.get(item.id) ?? now)
        : now,
    );
    if (mapped) unlocked.push(mapped);
  }
  return unlocked;
}

export async function listAchievementsForUser(
  userId: string,
  options?: { persistUnlocks?: boolean },
): Promise<{
  items: AchievementListItem[];
  gamerscore: number;
  totalGamerscore: number;
  unlockedCount: number;
}> {
  const persistUnlocks = options?.persistUnlocks ?? true;
  if (persistUnlocks) {
    await unlockNewAchievementsForUser(userId);
  }
  const [rows, unlocks] = await Promise.all([
    loadSetRows(userId),
    listUnlocks(userId),
  ]);
  const workoutIds = [...new Set(rows.map((row) => row.workoutId))];
  const [rosterByWorkout, names] = await Promise.all([
    loadRosterByWorkout(workoutIds),
    loadWorkoutNames(workoutIds),
  ]);
  const globalUnlockedAt = new Map(
    unlocks.map((row) => [row.achievementId, row.unlockedAt]),
  );

  const evaluated = evaluateAchievements(toEvalRows(rows), rosterByWorkout);
  const items: AchievementListItem[] = evaluated.map((item) => {
    const persistedAt =
      item.scope === "global"
        ? (globalUnlockedAt.get(item.id) ?? null)
        : null;
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      gamerscore: item.gamerscore,
      category: item.category,
      scope: item.scope,
      secret: item.secret,
      target: item.target,
      progress: item.progress,
      unlocked:
        item.scope === "global"
          ? Boolean(persistedAt) || item.unlocked
          : item.unlocked,
      workoutId: item.workoutId,
      workoutName: item.workoutId ? (names.get(item.workoutId) ?? null) : null,
      unlockedAt: persistedAt,
      tier: item.tier,
    };
  });

  const gamerscore = items
    .filter((item) => item.unlocked)
    .reduce((sum, item) => sum + item.gamerscore, 0);

  return {
    items,
    gamerscore,
    totalGamerscore:
      GLOBAL_GAMERSCORE +
      evaluated
        .filter((item) => item.scope === "workout")
        .reduce((sum, item) => sum + item.gamerscore, 0),
    unlockedCount: items.filter((item) => item.unlocked).length,
  };
}
