import "server-only";

import { and, asc, count, countDistinct, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { exercise, set as workoutSet, workout, workoutExercise } from "@/db/schema";
import type {
  MetricProfile,
  MuscleGroup,
} from "@/db/schema/workout-schema";
import { missingExerciseCatalogPatch } from "@/features/workouts/exercise-catalog";
import {
  SIMILAR_EXERCISE_THRESHOLD,
  exerciseNameLookupKeys,
  exerciseNameSimilarity,
  normalizeExerciseName,
} from "@/features/workouts/exercise-name";
import {
  CANONICAL_REST_NAME,
  isRestWorkoutItem,
  withRestTag,
} from "@/features/workouts/workout-item";

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

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ExerciseRow = typeof exercise.$inferSelect;

/** Fill nullable / default catalog fields without overwriting known values. */
export async function fillMissingExerciseCatalogFields(
  tx: DbTransaction,
  current: ExerciseRow,
  incoming: {
    muscleGroup?: MuscleGroup | null;
    metricProfile?: MetricProfile | null;
  },
): Promise<ExerciseRow> {
  const patch = missingExerciseCatalogPatch(current, incoming);
  if (Object.keys(patch).length === 0) return current;
  const [updated] = await tx
    .update(exercise)
    .set(patch)
    .where(eq(exercise.id, current.id))
    .returning();
  return updated ?? current;
}

/**
 * One Rest exercise per user. Remaps every rest appearance onto that id and
 * deletes leftover Rest rows so rests are not duplicated across workouts.
 */
export async function resolveCanonicalRestExercise(
  tx: DbTransaction,
  userId: string,
  options?: { createIfMissing?: boolean },
): Promise<string | null> {
  const createIfMissing = options?.createIfMissing ?? true;
  const exercises = await tx
    .select()
    .from(exercise)
    .where(eq(exercise.userId, userId));
  const restExercises = exercises.filter((item) => isRestWorkoutItem(item));

  const appearances = await tx
    .select({
      id: workoutExercise.id,
      exerciseId: workoutExercise.exerciseId,
      name: workoutExercise.name,
      tags: workoutExercise.tags,
    })
    .from(workoutExercise)
    .innerJoin(workout, eq(workoutExercise.workoutId, workout.id))
    .where(eq(workout.userId, userId));
  const restAppearances = appearances.filter((item) => isRestWorkoutItem(item));

  const namedRest = restExercises.find(
    (item) => normalizeExerciseName(item.name) === "rest",
  );
  let canonicalId = namedRest?.id ?? restExercises[0]?.id ?? null;

  if (!canonicalId) {
    if (!createIfMissing && restAppearances.length === 0) return null;
    canonicalId = crypto.randomUUID();
    await tx.insert(exercise).values({
      id: canonicalId,
      userId,
      name: CANONICAL_REST_NAME,
    });
  } else if (!namedRest) {
    await tx
      .update(exercise)
      .set({ name: CANONICAL_REST_NAME })
      .where(and(eq(exercise.id, canonicalId), eq(exercise.userId, userId)));
  }

  const extraRestIds = restExercises
    .map((item) => item.id)
    .filter((id) => id !== canonicalId);

  for (const appearance of restAppearances) {
    const tags = withRestTag(appearance.tags);
    const tagsChanged =
      tags.length !== appearance.tags.length ||
      tags.some((tag, index) => tag !== appearance.tags[index]);
    if (appearance.exerciseId === canonicalId && !tagsChanged) continue;

    await tx
      .update(workoutExercise)
      .set({
        exerciseId: canonicalId,
        tags,
      })
      .where(eq(workoutExercise.id, appearance.id));
  }

  if (extraRestIds.length > 0) {
    await tx
      .update(workoutExercise)
      .set({ exerciseId: canonicalId })
      .where(inArray(workoutExercise.exerciseId, extraRestIds));
    await tx
      .update(workoutSet)
      .set({ exerciseId: canonicalId })
      .where(inArray(workoutSet.exerciseId, extraRestIds));
    await tx
      .delete(exercise)
      .where(
        and(eq(exercise.userId, userId), inArray(exercise.id, extraRestIds)),
      );
  }

  return canonicalId;
}

export async function ensureCanonicalRestExerciseForUser(
  userId: string,
  options?: { createIfMissing?: boolean },
) {
  return db.transaction((tx) =>
    resolveCanonicalRestExercise(tx, userId, options),
  );
}

export type ConsolidateDuplicateExercisesResult = {
  groupsMerged: number;
  exercisesDeleted: number;
};

/**
 * Collapse per-user exercises that share the same normalized name into the
 * most-used row (workout appearances, then sets, then stable id). Remaps
 * workout_exercise + set refs, then deletes emptied duplicates.
 */
export async function consolidateDuplicateExercisesForUser(
  userId: string,
  tx?: DbTransaction,
): Promise<ConsolidateDuplicateExercisesResult> {
  const run = async (dbOrTx: DbTransaction | typeof db) => {
    const exercises = await dbOrTx
      .select()
      .from(exercise)
      .where(eq(exercise.userId, userId));

    const candidates = exercises.filter((item) => !isRestWorkoutItem(item));
    if (candidates.length < 2) {
      return { groupsMerged: 0, exercisesDeleted: 0 };
    }

    const ids = candidates.map((item) => item.id);
    const [linkCounts, setCounts] = await Promise.all([
      dbOrTx
        .select({
          exerciseId: workoutExercise.exerciseId,
          n: count(),
        })
        .from(workoutExercise)
        .where(inArray(workoutExercise.exerciseId, ids))
        .groupBy(workoutExercise.exerciseId),
      dbOrTx
        .select({
          exerciseId: workoutSet.exerciseId,
          n: count(),
        })
        .from(workoutSet)
        .where(inArray(workoutSet.exerciseId, ids))
        .groupBy(workoutSet.exerciseId),
    ]);

    const linkCountById = new Map(
      linkCounts.map((row) => [row.exerciseId, Number(row.n)]),
    );
    const setCountById = new Map(
      setCounts.map((row) => [row.exerciseId, Number(row.n)]),
    );

    const groups = new Map<string, typeof candidates>();
    for (const item of candidates) {
      const keys = exerciseNameLookupKeys(item.name);
      const key = keys.slice().sort()[0];
      if (!key) continue;
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }

    let groupsMerged = 0;
    let exercisesDeleted = 0;

    for (const group of groups.values()) {
      if (group.length < 2) continue;

      group.sort((a, b) => {
        const linkDiff =
          (linkCountById.get(b.id) ?? 0) - (linkCountById.get(a.id) ?? 0);
        if (linkDiff !== 0) return linkDiff;
        const setDiff =
          (setCountById.get(b.id) ?? 0) - (setCountById.get(a.id) ?? 0);
        if (setDiff !== 0) return setDiff;
        return a.id.localeCompare(b.id);
      });

      const canonical = group[0]!;
      const duplicates = group.slice(1);
      const duplicateIds = duplicates.map((item) => item.id);
      const patch = missingExerciseCatalogPatch(canonical, {
        muscleGroup:
          canonical.muscleGroup ??
          duplicates.find((item) => item.muscleGroup)?.muscleGroup,
        metricProfile:
          canonical.metricProfile !== "CUSTOM"
            ? canonical.metricProfile
            : duplicates.find((item) => item.metricProfile !== "CUSTOM")
                ?.metricProfile,
      });
      if (Object.keys(patch).length > 0) {
        await dbOrTx
          .update(exercise)
          .set(patch)
          .where(eq(exercise.id, canonical.id));
      }

      await dbOrTx
        .update(workoutExercise)
        .set({ exerciseId: canonical.id })
        .where(inArray(workoutExercise.exerciseId, duplicateIds));
      await dbOrTx
        .update(workoutSet)
        .set({ exerciseId: canonical.id })
        .where(inArray(workoutSet.exerciseId, duplicateIds));
      await dbOrTx
        .delete(exercise)
        .where(
          and(eq(exercise.userId, userId), inArray(exercise.id, duplicateIds)),
        );

      groupsMerged += 1;
      exercisesDeleted += duplicateIds.length;
    }

    return { groupsMerged, exercisesDeleted };
  };

  if (tx) return run(tx);
  return db.transaction((inner) => run(inner));
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
  muscleGroup: MuscleGroup | null;
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
      muscleGroup: item.muscleGroup,
      setCount: setCountById.get(item.id) ?? 0,
      workoutCount: workoutCountById.get(item.id) ?? 0,
    });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.workoutCount - a.workoutCount ||
      b.setCount - a.setCount ||
      a.name.localeCompare(b.name),
  );

  // One candidate per singular/plural-folded name so orphan catalog dupes don't flood UI.
  const seenNames = new Set<string>();
  const deduped: SimilarExerciseCandidate[] = [];
  for (const candidate of scored) {
    const keys = exerciseNameLookupKeys(candidate.name);
    const key = keys.slice().sort()[0];
    if (!key || seenNames.has(key)) continue;
    seenNames.add(key);
    deduped.push(candidate);
    if (deduped.length >= limit) break;
  }
  return deduped;
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
      muscleGroup: item.muscleGroup,
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
      muscleGroup: item.muscleGroup,
    });
  }

  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored.slice(0, limit);
}
