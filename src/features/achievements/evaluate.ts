import { MUSCLE_GROUP_VALUES, type MuscleGroup } from "@/db/schema/workout-schema";
import { addCalendarDays, dayKey } from "@/features/workouts/set-day";

import {
  ACHIEVEMENT_CATALOG,
  type AchievementStatKey,
} from "./catalog";

export type AchievementSetRow = {
  workoutId: string;
  exerciseId: string;
  muscleGroup: MuscleGroup | null;
  keyMuscles: string[];
  updatedAt: Date | string;
};

export type AchievementStats = Record<AchievementStatKey, number>;

export type AchievementProgress = (typeof ACHIEVEMENT_CATALOG)[number] & {
  progress: number;
  unlocked: boolean;
};

const EMPTY_MUSCLE_COUNTS = Object.fromEntries(
  MUSCLE_GROUP_VALUES.map((group) => [group, 0]),
) as Record<MuscleGroup, number>;

function normalizeMuscle(value: string) {
  return value.trim().toLowerCase();
}

function hitsAny(label: string, needles: string[]) {
  return needles.some((needle) => label.includes(needle));
}

function longestConsecutiveDays(days: string[]) {
  if (days.length === 0) return 0;
  const unique = [...new Set(days)].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i += 1) {
    if (unique[i] === addCalendarDays(unique[i - 1], 1)) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

function countKeyHits(labels: Map<string, number>, needles: string[]) {
  let total = 0;
  for (const [label, count] of labels) {
    if (hitsAny(label, needles)) total += count;
  }
  return total;
}

export function buildAchievementStats(
  rows: AchievementSetRow[],
): AchievementStats {
  const muscleGroupCounts = { ...EMPTY_MUSCLE_COUNTS };
  const workouts = new Set<string>();
  const exercises = new Set<string>();
  const keyMuscleLabels = new Map<string, number>();
  const daysByWorkout = new Map<string, Set<string>>();
  const workoutsByDay = new Map<string, Set<string>>();
  const setsByWorkout = new Map<string, number>();
  const setsByDay = new Map<string, number>();

  for (const row of rows) {
    workouts.add(row.workoutId);
    exercises.add(row.exerciseId);
    setsByWorkout.set(row.workoutId, (setsByWorkout.get(row.workoutId) ?? 0) + 1);
    if (row.muscleGroup) {
      muscleGroupCounts[row.muscleGroup] += 1;
    }
    const day = dayKey(row.updatedAt);
    setsByDay.set(day, (setsByDay.get(day) ?? 0) + 1);

    const dayWorkouts = workoutsByDay.get(day) ?? new Set();
    dayWorkouts.add(row.workoutId);
    workoutsByDay.set(day, dayWorkouts);

    const workoutDays = daysByWorkout.get(row.workoutId) ?? new Set();
    workoutDays.add(day);
    daysByWorkout.set(row.workoutId, workoutDays);

    for (const raw of row.keyMuscles) {
      const label = normalizeMuscle(raw);
      if (!label) continue;
      keyMuscleLabels.set(label, (keyMuscleLabels.get(label) ?? 0) + 1);
    }
  }

  let maxUniqueWorkoutsInADay = 0;
  for (const dayWorkouts of workoutsByDay.values()) {
    maxUniqueWorkoutsInADay = Math.max(
      maxUniqueWorkoutsInADay,
      dayWorkouts.size,
    );
  }

  let maxDaysOnOneWorkout = 0;
  for (const days of daysByWorkout.values()) {
    maxDaysOnOneWorkout = Math.max(maxDaysOnOneWorkout, days.size);
  }

  const uniqueMuscleGroupCount = MUSCLE_GROUP_VALUES.filter(
    (group) => muscleGroupCounts[group] > 0,
  ).length;

  return {
    setCount: rows.length,
    maxSetsInOneDay: Math.max(0, ...setsByDay.values()),
    uniqueExerciseCount: exercises.size,
    longestStreak: longestConsecutiveDays([...setsByDay.keys()]),
    trainingDayCount: setsByDay.size,
    uniqueWorkoutCount: workouts.size,
    maxUniqueWorkoutsInADay,
    maxDaysOnOneWorkout,
    maxSetsOnOneWorkout: Math.max(0, ...setsByWorkout.values()),
    uniqueMuscleGroupCount,
    uniqueKeyMuscleCount: keyMuscleLabels.size,
    maxMuscleGroupSets: Math.max(0, ...Object.values(muscleGroupCounts)),
    chestSets: muscleGroupCounts.chest,
    backSets: muscleGroupCounts.back,
    shoulderSets: muscleGroupCounts.shoulders,
    armSets: muscleGroupCounts.arms,
    legSets: muscleGroupCounts.legs,
    coreSets: muscleGroupCounts.core,
    rearDeltSets: countKeyHits(keyMuscleLabels, [
      "rear delt",
      "posterior delt",
      "rear deltoid",
    ]),
    calfSets: countKeyHits(keyMuscleLabels, [
      "calf",
      "calves",
      "gastroc",
      "soleus",
    ]),
    forearmSets: countKeyHits(keyMuscleLabels, ["forearm", "brachioradialis"]),
    gluteSets: countKeyHits(keyMuscleLabels, ["glute"]),
    sideDeltSets: countKeyHits(keyMuscleLabels, [
      "side delt",
      "lateral delt",
      "medial delt",
      "middle delt",
    ]),
  };
}

export function evaluateAchievements(
  stats: AchievementStats,
): AchievementProgress[] {
  return ACHIEVEMENT_CATALOG.map((definition) => {
    const progress = Math.min(definition.target, stats[definition.stat]);
    return {
      ...definition,
      progress,
      unlocked: progress >= definition.target,
    };
  });
}
