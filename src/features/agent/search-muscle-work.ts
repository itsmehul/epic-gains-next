import "server-only";

import { getExerciseById, listExercises } from "@/db/repositories/exercise.repository";
import { listRecentSetsMatchingMuscles } from "@/db/repositories/set.repository";
import type { MuscleGroup } from "@/db/schema/workout-schema";
import { resolveMuscleSearch } from "@/features/agent/muscle-search";
import { dayKey } from "@/features/workouts/set-day";

export async function searchAthleteMuscleWork(options: {
  userId: string;
  query: string;
  muscleGroups?: MuscleGroup[];
  keyMuscles?: string[];
  currentExerciseId?: string;
  days?: number;
}) {
  const days = options.days && options.days > 0 ? Math.min(options.days, 90) : 28;
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const [catalog, currentExercise] = await Promise.all([
    listExercises(),
    options.currentExerciseId
      ? getExerciseById(options.currentExerciseId)
      : Promise.resolve(null),
  ]);

  const resolved = resolveMuscleSearch({
    query: options.query,
    muscleGroups: options.muscleGroups,
    keyMuscles: options.keyMuscles,
    catalog,
    currentExercise: currentExercise
      ? {
          id: currentExercise.id,
          name: currentExercise.name,
          muscleGroup: currentExercise.muscleGroup,
          keyMuscles: currentExercise.keyMuscles,
        }
      : null,
  });

  if (
    resolved.muscleGroups.length === 0 &&
    resolved.keyMusclePatterns.length === 0
  ) {
    return {
      available: false as const,
      reason:
        "Could not map that to muscles. Try a body region, muscle group, or lift name (e.g. knees, back, deadlift).",
      windowDays: days,
      resolved,
    };
  }

  const rows = await listRecentSetsMatchingMuscles(options.userId, {
    start,
    end,
    muscleGroups: resolved.muscleGroups,
    keyMusclePatterns: resolved.keyMusclePatterns,
  });

  const byExercise = new Map<
    string,
    {
      exerciseId: string;
      name: string;
      muscleGroup: MuscleGroup | null;
      keyMuscles: string[];
      setCount: number;
      lastLoggedAt: string;
      recentSets: Array<{
        day: string;
        reps: number | null;
        weight: number | null;
        time: number | null;
        distance: number | null;
      }>;
    }
  >();

  for (const row of rows) {
    const existing = byExercise.get(row.exercise.id);
    const sample = {
      day: dayKey(row.set.updatedAt),
      reps: row.set.reps,
      weight: row.set.weight,
      time: row.set.time,
      distance: row.set.distance,
    };
    if (existing) {
      existing.setCount += 1;
      if (existing.recentSets.length < 6) existing.recentSets.push(sample);
      continue;
    }
    byExercise.set(row.exercise.id, {
      exerciseId: row.exercise.id,
      name: row.exercise.name,
      muscleGroup: row.exercise.muscleGroup,
      keyMuscles: row.exercise.keyMuscles,
      setCount: 1,
      lastLoggedAt: row.set.updatedAt.toISOString(),
      recentSets: [sample],
    });
  }

  const logged = [...byExercise.values()].sort(
    (a, b) => b.setCount - a.setCount,
  );
  const loggedIds = new Set(logged.map((item) => item.exerciseId));

  const relatedCatalog = catalog
    .filter((exercise) => {
      if (loggedIds.has(exercise.id)) return false;
      const groupMatch =
        exercise.muscleGroup != null &&
        resolved.muscleGroups.includes(exercise.muscleGroup);
      const keyMatch = exercise.keyMuscles.some((muscle) =>
        resolved.keyMusclePatterns.some((pattern) =>
          muscle.toLowerCase().includes(pattern),
        ),
      );
      return groupMatch || keyMatch;
    })
    .slice(0, 8)
    .map((exercise) => ({
      exerciseId: exercise.id,
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      keyMuscles: exercise.keyMuscles,
    }));

  return {
    available: true as const,
    windowDays: days,
    resolved,
    logged,
    relatedCatalog,
    hint:
      logged.length > 0
        ? "Use logged work the athlete already does. Encourage pushing intensity there when it is strengthening, not when pain is a red flag."
        : "No matching sets in this window. relatedCatalog are catalog moves that hit the same muscles.",
  };
}
