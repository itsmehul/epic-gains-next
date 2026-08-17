import {
  MUSCLE_GROUP_VALUES,
  METRIC_PROFILE_VALUES,
  type MetricProfile,
  type MuscleGroup,
} from "@/db/schema/workout-schema";
import { setFillsMetricProfile } from "@/features/workouts/metric-profile";
import { addCalendarDays, dayKey } from "@/features/workouts/set-day";

import {
  GLOBAL_ACHIEVEMENT_CATALOG,
  WORKOUT_ACHIEVEMENT_CATALOG,
  WORKOUT_ACHIEVEMENT_COUNT,
  WORKOUT_ACHIEVEMENT_TIER_VALUES,
  WORKOUT_HUD_CATALOG,
  isBronzeWorkoutAchievement,
  type GlobalAchievementDefinition,
  type GlobalAchievementStatKey,
  type WorkoutAchievementDefinition,
  type WorkoutAchievementStatKey,
  type WorkoutAchievementTier,
} from "./catalog";

export type AchievementSetRow = {
  workoutId: string;
  exerciseId: string;
  muscleGroup: MuscleGroup | null;
  keyMuscles: string[];
  updatedAt: Date | string;
  metricProfile?: MetricProfile | null;
  reps?: number | null;
  weight?: number | null;
  time?: number | null;
  distance?: number | null;
};

export type WorkoutRosterExercise = {
  exerciseId: string;
  metricProfile?: MetricProfile | null;
  prescribedSets?: number;
};

export type WorkoutRosterInput = Array<string | WorkoutRosterExercise>;

const NON_CUSTOM_PROFILES = METRIC_PROFILE_VALUES.filter(
  (profile) => profile !== "CUSTOM",
);

function emptyMetricBuckets(): Record<
  MetricProfile,
  { setCount: number; rosterHits: number }
> {
  return Object.fromEntries(
    METRIC_PROFILE_VALUES.map((profile) => [
      profile,
      { setCount: 0, rosterHits: 0 },
    ]),
  ) as Record<MetricProfile, { setCount: number; rosterHits: number }>;
}

const DEFAULT_PRESCRIBED_SETS = 3;

function normalizeRoster(roster: WorkoutRosterInput): WorkoutRosterExercise[] {
  const byId = new Map<string, WorkoutRosterExercise>();
  for (const item of roster) {
    const next =
      typeof item === "string" ? { exerciseId: item } : item;
    const existing = byId.get(next.exerciseId);
    if (!existing) {
      byId.set(next.exerciseId, {
        exerciseId: next.exerciseId,
        metricProfile: next.metricProfile,
        prescribedSets: Math.max(next.prescribedSets ?? DEFAULT_PRESCRIBED_SETS, 1),
      });
      continue;
    }
    existing.prescribedSets =
      (existing.prescribedSets ?? DEFAULT_PRESCRIBED_SETS) +
      Math.max(next.prescribedSets ?? DEFAULT_PRESCRIBED_SETS, 1);
    existing.metricProfile = existing.metricProfile ?? next.metricProfile;
  }
  return [...byId.values()];
}

function prescribedVolume(roster: WorkoutRosterExercise[]): number {
  if (roster.length === 0) return DEFAULT_PRESCRIBED_SETS;
  return roster.reduce(
    (sum, item) => sum + (item.prescribedSets ?? DEFAULT_PRESCRIBED_SETS),
    0,
  );
}

function profileForExercise(
  exerciseId: string,
  roster: WorkoutRosterExercise[],
  rowProfile?: MetricProfile | null,
): MetricProfile | null | undefined {
  if (rowProfile) return rowProfile;
  return roster.find((item) => item.exerciseId === exerciseId)?.metricProfile;
}

function rowHasAnyMetric(row: AchievementSetRow) {
  return (
    row.metricProfile != null ||
    row.reps != null ||
    row.weight != null ||
    row.time != null ||
    row.distance != null
  );
}

function countsAsLoggedSet(
  row: AchievementSetRow,
  roster: WorkoutRosterExercise[],
): boolean {
  if (!rowHasAnyMetric(row)) return true;
  const profile = profileForExercise(row.exerciseId, roster, row.metricProfile);
  return setFillsMetricProfile(row, profile);
}

export function prescribedSetsFromTargets(targets?: unknown[] | null) {
  return Array.isArray(targets) && targets.length > 0
    ? targets.length
    : DEFAULT_PRESCRIBED_SETS;
}

function formatAchievementDescription(template: string, target: number) {
  return template.replaceAll("{target}", String(target));
}

export type GlobalAchievementStats = Record<GlobalAchievementStatKey, number>;

export type WorkoutAchievementStats = Record<
  Exclude<WorkoutAchievementStatKey, "metricSetCount" | "metricRoster">,
  number
> & {
  byMetric: Record<MetricProfile, { setCount: number; rosterHits: number }>;
};

export type EvaluatedAchievement = {
  id: string;
  name: string;
  description: string;
  gamerscore: number;
  category: (typeof GLOBAL_ACHIEVEMENT_CATALOG)[number]["category"];
  secret?: boolean;
  target: number;
  scope: "global" | "workout";
  tier?: WorkoutAchievementTier;
  progress: number;
  unlocked: boolean;
  workoutId: string | null;
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

export function buildWorkoutAchievementStats(
  rows: AchievementSetRow[],
  rosterInput: WorkoutRosterInput,
): WorkoutAchievementStats {
  const rosterItems = normalizeRoster(rosterInput);
  const roster = new Set(rosterItems.map((item) => item.exerciseId));
  const exercises = new Set<string>();
  const days = new Set<string>();
  const setsByDay = new Map<string, number>();
  const setsByExercise = new Map<string, number>();
  const exercisesByDay = new Map<string, Set<string>>();
  const setsByDayExercise = new Map<string, Map<string, number>>();
  let setCount = 0;

  for (const row of rows) {
    if (!countsAsLoggedSet(row, rosterItems)) continue;
    setCount += 1;
    exercises.add(row.exerciseId);
    setsByExercise.set(
      row.exerciseId,
      (setsByExercise.get(row.exerciseId) ?? 0) + 1,
    );
    const day = dayKey(row.updatedAt);
    days.add(day);
    setsByDay.set(day, (setsByDay.get(day) ?? 0) + 1);
    const dayExercises = exercisesByDay.get(day) ?? new Set();
    dayExercises.add(row.exerciseId);
    exercisesByDay.set(day, dayExercises);
    const dayCounts = setsByDayExercise.get(day) ?? new Map();
    dayCounts.set(row.exerciseId, (dayCounts.get(row.exerciseId) ?? 0) + 1);
    setsByDayExercise.set(day, dayCounts);
  }

  const rosterHits = roster.size
    ? [...roster].filter((id) => exercises.has(id)).length
    : 0;
  const byMetric = emptyMetricBuckets();
  for (const item of rosterItems) {
    const profile = item.metricProfile;
    if (!profile) continue;
    if (exercises.has(item.exerciseId)) {
      byMetric[profile].rosterHits += 1;
    }
  }
  for (const row of rows) {
    if (!countsAsLoggedSet(row, rosterItems)) continue;
    const profile = profileForExercise(
      row.exerciseId,
      rosterItems,
      row.metricProfile,
    );
    if (!profile) continue;
    byMetric[profile].setCount += 1;
  }
  let sameDayFullRosterCount = 0;
  let sameDayPrescribedRosterCount = 0;
  if (roster.size > 0) {
    for (const [day, dayExercises] of exercisesByDay) {
      if ([...roster].every((id) => dayExercises.has(id))) {
        sameDayFullRosterCount += 1;
      }
      const dayCounts = setsByDayExercise.get(day) ?? new Map();
      if (
        rosterItems.every(
          (item) =>
            (dayCounts.get(item.exerciseId) ?? 0) >=
            (item.prescribedSets ?? DEFAULT_PRESCRIBED_SETS),
        )
      ) {
        sameDayPrescribedRosterCount += 1;
      }
    }
  }

  const prescribedRoster = rosterItems.filter(
    (item) =>
      (setsByExercise.get(item.exerciseId) ?? 0) >=
      (item.prescribedSets ?? DEFAULT_PRESCRIBED_SETS),
  ).length;

  return {
    setCount,
    uniqueExerciseCount: exercises.size,
    trainingDayCount: days.size,
    maxSetsInOneDay: Math.max(0, ...setsByDay.values()),
    fullRoster: rosterHits,
    prescribedRoster,
    sameDayFullRoster: sameDayFullRosterCount > 0 ? 1 : 0,
    sameDayFullRosterCount,
    sameDayPrescribedRosterCount,
    longestStreak: longestConsecutiveDays([...days]),
    byMetric,
  };
}

function workoutTarget(
  definition: WorkoutAchievementDefinition,
  roster: WorkoutRosterExercise[],
): number {
  const scoped = definition.metricProfile
    ? roster.filter((item) => item.metricProfile === definition.metricProfile)
    : roster;
  const scale = definition.targetScale ?? "fixed";
  if (
    scale === "roster" ||
    definition.stat === "fullRoster" ||
    definition.stat === "prescribedRoster" ||
    definition.stat === "metricRoster"
  ) {
    return Math.max(scoped.length, 1);
  }
  const volume = prescribedVolume(scoped);
  if (scale === "prescribed") {
    return volume * Math.max(definition.volumeMultiplier ?? 1, 1);
  }
  if (scale === "prescribedx4") return volume * 4;
  return definition.target;
}

function workoutStatValue(
  definition: WorkoutAchievementDefinition,
  stats: WorkoutAchievementStats,
): number {
  if (definition.metricProfile && definition.stat === "metricRoster") {
    return stats.byMetric[definition.metricProfile].rosterHits;
  }
  if (definition.metricProfile && definition.stat === "metricSetCount") {
    return stats.byMetric[definition.metricProfile].setCount;
  }
  if (definition.stat === "metricRoster" || definition.stat === "metricSetCount") {
    return 0;
  }
  return stats[definition.stat];
}

export function evaluateWorkoutAchievements(
  stats: WorkoutAchievementStats,
  rosterInput: WorkoutRosterInput,
  workoutId: string,
): EvaluatedAchievement[] {
  const roster = normalizeRoster(rosterInput);
  const catalog = [...WORKOUT_ACHIEVEMENT_CATALOG, ...WORKOUT_HUD_CATALOG];
  return catalog.flatMap((definition) => {
    if (
      definition.metricProfile &&
      !roster.some((item) => item.metricProfile === definition.metricProfile)
    ) {
      return [];
    }
    const target = workoutTarget(definition, roster);
    const raw = workoutStatValue(definition, stats);
    const canUnlock =
      definition.stat === "fullRoster" ||
      definition.stat === "prescribedRoster" ||
      definition.stat === "sameDayFullRoster" ||
      definition.stat === "sameDayFullRosterCount" ||
      definition.stat === "sameDayPrescribedRosterCount" ||
      definition.stat === "metricRoster"
        ? (definition.metricProfile
            ? roster.some(
                (item) => item.metricProfile === definition.metricProfile,
              )
            : roster.length > 0)
        : true;
    const progress = Math.min(target, raw);
    return [
      {
        ...definition,
        description: formatAchievementDescription(
          definition.description,
          target,
        ),
        target,
        progress,
        unlocked: canUnlock && progress >= target,
        workoutId,
      },
    ];
  });
}

export function buildGlobalAchievementStats(
  rows: AchievementSetRow[],
  ladderUnlockedByWorkout: Map<string, number>,
): GlobalAchievementStats {
  const muscleGroupCounts = { ...EMPTY_MUSCLE_COUNTS };
  const workouts = new Set<string>();
  const exercises = new Set<string>();
  const keyMuscleLabels = new Map<string, number>();
  const workoutsByDay = new Map<string, Set<string>>();
  const setsByDay = new Map<string, number>();
  const metricSetCounts = Object.fromEntries(
    METRIC_PROFILE_VALUES.map((profile) => [profile, 0]),
  ) as Record<MetricProfile, number>;

  for (const row of rows) {
    workouts.add(row.workoutId);
    exercises.add(row.exerciseId);
    if (row.muscleGroup) {
      muscleGroupCounts[row.muscleGroup] += 1;
    }
    const day = dayKey(row.updatedAt);
    setsByDay.set(day, (setsByDay.get(day) ?? 0) + 1);

    const dayWorkouts = workoutsByDay.get(day) ?? new Set();
    dayWorkouts.add(row.workoutId);
    workoutsByDay.set(day, dayWorkouts);

    for (const raw of row.keyMuscles) {
      const label = normalizeMuscle(raw);
      if (!label) continue;
      keyMuscleLabels.set(label, (keyMuscleLabels.get(label) ?? 0) + 1);
    }

    if (
      row.metricProfile &&
      setFillsMetricProfile(row, row.metricProfile)
    ) {
      metricSetCounts[row.metricProfile] += 1;
    }
  }

  let maxUniqueWorkoutsInADay = 0;
  for (const dayWorkouts of workoutsByDay.values()) {
    maxUniqueWorkoutsInADay = Math.max(
      maxUniqueWorkoutsInADay,
      dayWorkouts.size,
    );
  }

  const uniqueMuscleGroupCount = MUSCLE_GROUP_VALUES.filter(
    (group) => muscleGroupCounts[group] > 0,
  ).length;

  let completedWorkoutCount = 0;
  let maxWorkoutLadderProgress = 0;
  for (const workoutId of workouts) {
    const unlocked = (ladderUnlockedByWorkout.get(workoutId) ?? 0);
    maxWorkoutLadderProgress = Math.max(maxWorkoutLadderProgress, unlocked);
    if (unlocked >= WORKOUT_ACHIEVEMENT_COUNT) completedWorkoutCount += 1;
  }
  const startedWorkoutCount = workouts.size;

  return {
    setCount: rows.length,
    maxSetsInOneDay: Math.max(0, ...setsByDay.values()),
    uniqueExerciseCount: exercises.size,
    longestStreak: longestConsecutiveDays([...setsByDay.keys()]),
    trainingDayCount: setsByDay.size,
    uniqueWorkoutCount: startedWorkoutCount,
    maxUniqueWorkoutsInADay,
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
    startedWorkoutCount,
    completedWorkoutCount,
    abandonedStartCount: startedWorkoutCount - completedWorkoutCount,
    maxWorkoutLadderProgress,
    weightRepsSets: metricSetCounts.WEIGHT_REPS,
    bodyweightRepsSets: metricSetCounts.BODYWEIGHT_REPS,
    weightedRepsSets: metricSetCounts.WEIGHTED_REPS,
    timedHoldSets: metricSetCounts.TIMED_HOLD,
    cardioDistanceSets: metricSetCounts.CARDIO_DISTANCE,
    loadedCarrySets: metricSetCounts.LOADED_CARRY,
    customSets: metricSetCounts.CUSTOM,
    uniqueMetricProfileCount: NON_CUSTOM_PROFILES.filter(
      (profile) => metricSetCounts[profile] > 0,
    ).length,
  };
}

function evaluateGlobalDefinition(
  definition: GlobalAchievementDefinition,
  stats: GlobalAchievementStats,
): EvaluatedAchievement {
  const progress = Math.min(definition.target, stats[definition.stat]);
  const zeroOk =
    definition.zeroStat == null || stats[definition.zeroStat] === 0;
  return {
    ...definition,
    progress,
    unlocked: zeroOk && progress >= definition.target,
    workoutId: null,
  };
}

export function evaluateAchievements(
  rows: AchievementSetRow[],
  rosterByWorkout: Map<string, WorkoutRosterInput>,
): EvaluatedAchievement[] {
  const rowsByWorkout = new Map<string, AchievementSetRow[]>();
  for (const row of rows) {
    const list = rowsByWorkout.get(row.workoutId) ?? [];
    list.push(row);
    rowsByWorkout.set(row.workoutId, list);
  }

  const workoutItems: EvaluatedAchievement[] = [];
  const ladderUnlockedByWorkout = new Map<string, number>();

  for (const [workoutId, workoutRows] of rowsByWorkout) {
    const roster = rosterByWorkout.get(workoutId) ?? [];
    const stats = buildWorkoutAchievementStats(workoutRows, roster);
    const items = evaluateWorkoutAchievements(stats, roster, workoutId);
    ladderUnlockedByWorkout.set(
      workoutId,
      items.filter((item) => isBronzeWorkoutAchievement(item.id)).filter((item) => item.unlocked).length,
    );
    workoutItems.push(...items);
  }

  const globalStats = buildGlobalAchievementStats(
    rows,
    ladderUnlockedByWorkout,
  );
  const globalItems = GLOBAL_ACHIEVEMENT_CATALOG.map((definition) =>
    evaluateGlobalDefinition(definition, globalStats),
  );

  return [...globalItems, ...workoutItems];
}

export type WorkoutTierProgress = {
  tier: WorkoutAchievementTier;
  unlocked: number;
  total: number;
};

/** Per-tier progress for the viewing user's sets on one workout. */
export function workoutTierProgress(
  rows: AchievementSetRow[],
  rosterInput: WorkoutRosterInput,
): WorkoutTierProgress[] {
  const stats = buildWorkoutAchievementStats(rows, rosterInput);
  const items = evaluateWorkoutAchievements(stats, rosterInput, "local");
  return WORKOUT_ACHIEVEMENT_TIER_VALUES.map((tier) => {
    const group = items.filter((item) => item.tier === tier);
    return {
      tier,
      unlocked: group.filter((item) => item.unlocked).length,
      total: group.length,
    };
  });
}

/** Live bronze ladder progress for a single started workout (feed). */
export function workoutLadderUnlockedCount(
  rows: AchievementSetRow[],
  rosterInput: WorkoutRosterInput,
): { unlocked: number; total: number } {
  const bronze = workoutTierProgress(rows, rosterInput).find(
    (item) => item.tier === "bronze",
  );
  return {
    unlocked: bronze?.unlocked ?? 0,
    total: bronze?.total ?? WORKOUT_ACHIEVEMENT_COUNT,
  };
}
