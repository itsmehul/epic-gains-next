import "server-only";

import { and, asc, count, countDistinct, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { exercise, set as workoutSet, workoutExercise } from "@/db/schema";
import {
  SIMILAR_EXERCISE_THRESHOLD,
  exerciseNameSimilarity,
} from "@/features/workouts/exercise-name";
import { isRestWorkoutItem } from "@/features/workouts/workout-item";

export type ExerciseInsert = typeof exercise.$inferInsert;

export async function listExercisesForUser(userId: string) {
  const items = await db
    .select()
    .from(exercise)
    .where(eq(exercise.userId, userId))
    .orderBy(asc(exercise.name));
  return items.filter((item) => !isRestWorkoutItem(item));
}

export async function getExerciseById(id: string) {
  const [row] = await db
    .select()
    .from(exercise)
    .where(eq(exercise.id, id))
    .limit(1);
  return row ?? null;
}

export async function getExerciseByIdForUser(id: string, userId: string) {
  const [row] = await db
    .select()
    .from(exercise)
    .where(and(eq(exercise.id, id), eq(exercise.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function createExercise(data: ExerciseInsert) {
  const [row] = await db.insert(exercise).values(data).returning();
  return row;
}

export async function deleteExercise(id: string) {
  const [row] = await db
    .delete(exercise)
    .where(eq(exercise.id, id))
    .returning();
  return row ?? null;
}

export async function deleteExerciseForUser(id: string, userId: string) {
  const [row] = await db
    .delete(exercise)
    .where(and(eq(exercise.id, id), eq(exercise.userId, userId)))
    .returning();
  return row ?? null;
}

export type SimilarExerciseCandidate = {
  id: string;
  name: string;
  score: number;
  matchedAlias: string | null;
  setCount: number;
  workoutCount: number;
};

export async function findSimilarExercisesForUser(options: {
  userId: string;
  query: string;
  excludeExerciseId?: string;
  limit?: number;
  threshold?: number;
}): Promise<SimilarExerciseCandidate[]> {
  const limit = options.limit ?? 3;
  const threshold = options.threshold ?? SIMILAR_EXERCISE_THRESHOLD;
  const query = options.query.trim();
  if (!query) return [];

  const exercises = await listExercisesForUser(options.userId);
  const filtered = options.excludeExerciseId
    ? exercises.filter((item) => item.id !== options.excludeExerciseId)
    : exercises;
  if (filtered.length === 0) return [];

  const ids = filtered.map((item) => item.id);
  const aliasRows = await db
    .select({
      exerciseId: workoutExercise.exerciseId,
      name: workoutExercise.name,
    })
    .from(workoutExercise)
    .where(inArray(workoutExercise.exerciseId, ids));

  const aliasesByExercise = new Map<string, string[]>();
  for (const row of aliasRows) {
    const list = aliasesByExercise.get(row.exerciseId) ?? [];
    list.push(row.name);
    aliasesByExercise.set(row.exerciseId, list);
  }

  const [setCounts, workoutCounts] = await Promise.all([
    db
      .select({
        exerciseId: workoutSet.exerciseId,
        setCount: count(),
      })
      .from(workoutSet)
      .where(inArray(workoutSet.exerciseId, ids))
      .groupBy(workoutSet.exerciseId),
    db
      .select({
        exerciseId: workoutExercise.exerciseId,
        workoutCount: countDistinct(workoutExercise.workoutId),
      })
      .from(workoutExercise)
      .where(inArray(workoutExercise.exerciseId, ids))
      .groupBy(workoutExercise.exerciseId),
  ]);

  const setCountById = new Map(
    setCounts.map((row) => [row.exerciseId, Number(row.setCount)]),
  );
  const workoutCountById = new Map(
    workoutCounts.map((row) => [row.exerciseId, Number(row.workoutCount)]),
  );

  const scored: SimilarExerciseCandidate[] = [];

  for (const item of filtered) {
    let bestScore = exerciseNameSimilarity(query, item.name);
    let matchedAlias: string | null = null;

    for (const alias of aliasesByExercise.get(item.id) ?? []) {
      if (isRestWorkoutItem({ name: alias })) continue;
      const score = exerciseNameSimilarity(query, alias);
      if (score > bestScore) {
        bestScore = score;
        matchedAlias = alias === item.name ? null : alias;
      }
    }

    if (bestScore < threshold) continue;

    scored.push({
      id: item.id,
      name: item.name,
      score: bestScore,
      matchedAlias,
      setCount: setCountById.get(item.id) ?? 0,
      workoutCount: workoutCountById.get(item.id) ?? 0,
    });
  }

  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored.slice(0, limit);
}

export type MergeExerciseImpact = {
  sourceExerciseId: string;
  targetExerciseId: string;
  setCount: number;
  workoutCount: number;
  localSetCount: number;
  willDeleteSource: boolean;
};

export async function getMergeExerciseImpact(options: {
  userId: string;
  sourceExerciseId: string;
  targetExerciseId: string;
  workoutId: string;
}): Promise<MergeExerciseImpact | null> {
  const [source, target] = await Promise.all([
    getExerciseByIdForUser(options.sourceExerciseId, options.userId),
    getExerciseByIdForUser(options.targetExerciseId, options.userId),
  ]);
  if (!source || !target) return null;
  if (source.id === target.id) return null;

  const [setCountRow] = await db
    .select({ setCount: count() })
    .from(workoutSet)
    .where(eq(workoutSet.exerciseId, source.id));

  const [localSetCountRow] = await db
    .select({ setCount: count() })
    .from(workoutSet)
    .where(
      and(
        eq(workoutSet.exerciseId, source.id),
        eq(workoutSet.workoutId, options.workoutId),
      ),
    );

  const [workoutCountRow] = await db
    .select({
      workoutCount: countDistinct(workoutExercise.workoutId),
    })
    .from(workoutExercise)
    .where(eq(workoutExercise.exerciseId, source.id));

  const setCount = Number(setCountRow?.setCount ?? 0);
  const workoutCount = Number(workoutCountRow?.workoutCount ?? 0);
  const localSetCount = Number(localSetCountRow?.setCount ?? 0);

  // After merge, source is deleted if no leftover refs (best-effort always clears them).
  return {
    sourceExerciseId: source.id,
    targetExerciseId: target.id,
    setCount,
    workoutCount,
    localSetCount,
    willDeleteSource: true,
  };
}

/**
 * Global merge of source → target within a user.
 * Retargets every source appearance in place so the same exercise can occupy
 * multiple positions in a workout. Local name/video/timestamps stay on each row.
 */
export async function mergeExerciseInto(options: {
  userId: string;
  sourceExerciseId: string;
  targetExerciseId: string;
  workoutId: string;
  workoutExerciseId?: string;
}) {
  const impact = await getMergeExerciseImpact(options);
  if (!impact) {
    throw new Error("Exercise not found");
  }
  if (impact.localSetCount > 0) {
    throw new Error(
      "Resolve is only available when this workout has no sets for this exercise yet",
    );
  }

  const sourceId = options.sourceExerciseId;
  const targetId = options.targetExerciseId;
  const initiatingWorkoutId = options.workoutId;

  return db.transaction(async (tx) => {
    const sourceLinks = await tx
      .select()
      .from(workoutExercise)
      .where(eq(workoutExercise.exerciseId, sourceId));

    const initiatingLink =
      (options.workoutExerciseId
        ? sourceLinks.find((row) => row.id === options.workoutExerciseId)
        : null) ??
      sourceLinks.find((row) => row.workoutId === initiatingWorkoutId) ??
      null;

    if (!initiatingLink || initiatingLink.workoutId !== initiatingWorkoutId) {
      throw new Error("Workout exercise not found");
    }

    await tx
      .update(workoutSet)
      .set({ exerciseId: targetId })
      .where(eq(workoutSet.exerciseId, sourceId));

    await tx
      .update(workoutExercise)
      .set({ exerciseId: targetId })
      .where(eq(workoutExercise.exerciseId, sourceId));

    const [remainingLinks] = await tx
      .select({ n: count() })
      .from(workoutExercise)
      .where(eq(workoutExercise.exerciseId, sourceId));
    const [remainingSets] = await tx
      .select({ n: count() })
      .from(workoutSet)
      .where(eq(workoutSet.exerciseId, sourceId));

    let deletedSource = false;
    if (
      Number(remainingLinks?.n ?? 0) === 0 &&
      Number(remainingSets?.n ?? 0) === 0
    ) {
      await tx
        .delete(exercise)
        .where(
          and(eq(exercise.id, sourceId), eq(exercise.userId, options.userId)),
        );
      deletedSource = true;
    }

    const [workoutExerciseRow] = await tx
      .select()
      .from(workoutExercise)
      .where(eq(workoutExercise.id, initiatingLink.id))
      .limit(1);

    return {
      impact: { ...impact, willDeleteSource: deletedSource },
      workoutExercise: workoutExerciseRow ?? null,
      targetExerciseId: targetId,
    };
  });
}

export async function countSetsForExerciseInWorkout(
  exerciseId: string,
  workoutId: string,
) {
  const [row] = await db
    .select({ setCount: count() })
    .from(workoutSet)
    .where(
      and(
        eq(workoutSet.exerciseId, exerciseId),
        eq(workoutSet.workoutId, workoutId),
      ),
    );
  return Number(row?.setCount ?? 0);
}

/** Search user's exercises by fuzzy name / historical aliases. */
export async function searchExercisesForUser(options: {
  userId: string;
  q?: string;
  excludeExerciseId?: string;
  limit?: number;
}) {
  const limit = options.limit ?? 50;
  const q = options.q?.trim() ?? "";
  const exercises = await listExercisesForUser(options.userId);
  const filtered = options.excludeExerciseId
    ? exercises.filter((item) => item.id !== options.excludeExerciseId)
    : exercises;

  if (!q) {
    return filtered.slice(0, limit).map((item) => ({
      id: item.id,
      name: item.name,
      score: 1,
      matchedAlias: null as string | null,
    }));
  }

  const ids = filtered.map((item) => item.id);
  const aliasRows =
    ids.length === 0
      ? []
      : await db
          .select({
            exerciseId: workoutExercise.exerciseId,
            name: workoutExercise.name,
          })
          .from(workoutExercise)
          .where(inArray(workoutExercise.exerciseId, ids));

  const aliasesByExercise = new Map<string, string[]>();
  for (const row of aliasRows) {
    const list = aliasesByExercise.get(row.exerciseId) ?? [];
    list.push(row.name);
    aliasesByExercise.set(row.exerciseId, list);
  }

  const scored = [];
  for (const item of filtered) {
    let bestScore = exerciseNameSimilarity(q, item.name);
    let matchedAlias: string | null = null;
    for (const alias of aliasesByExercise.get(item.id) ?? []) {
      if (isRestWorkoutItem({ name: alias })) continue;
      const score = exerciseNameSimilarity(q, alias);
      if (score > bestScore) {
        bestScore = score;
        matchedAlias = alias === item.name ? null : alias;
      }
    }
    if (bestScore < 0.35) continue;
    scored.push({
      id: item.id,
      name: item.name,
      score: bestScore,
      matchedAlias,
    });
  }

  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored.slice(0, limit);
}
