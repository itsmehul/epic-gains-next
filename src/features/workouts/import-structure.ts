import type {
  MetricProfile,
  MuscleGroup,
} from "@/db/schema/workout-schema";
import type {
  ImportFullWorkoutInput,
  ImportWorkoutStructureInput,
} from "@/features/workouts/schemas";
import { isRestWorkoutItem } from "@/features/workouts/workout-item";

export type ExpandedImportWorkout = {
  workoutName: string;
  author?: string;
  channelUrl?: string;
  sourceVideoUrl?: string;
  exercises: Array<{
    name: string;
    videoStartTime: number;
    videoEndTime: number;
    chapter?: string;
    tags?: string[];
    metricProfile?: MetricProfile;
    muscleGroup?: MuscleGroup;
    keyMuscles?: string[];
    sets?: Array<{
      reps?: number | null;
      weight?: number | null;
      time?: number | null;
      distance?: number | null;
    }>;
  }>;
};

type ImportExerciseInput =
  | ExpandedImportWorkout["exercises"][number]
  | ImportFullWorkoutInput["exercises"][number];

export function resolveImportMetricProfile(
  ex: ImportExerciseInput,
): MetricProfile {
  if ("metricProfile" in ex && ex.metricProfile) return ex.metricProfile;
  if ("metric_profile" in ex && ex.metric_profile) return ex.metric_profile;
  return "CUSTOM";
}

export function resolveImportMuscleGroup(
  ex: ImportExerciseInput,
): MuscleGroup | undefined {
  if ("muscleGroup" in ex && ex.muscleGroup) return ex.muscleGroup;
  if ("muscle_group" in ex && ex.muscle_group) return ex.muscle_group;
  return undefined;
}

export type ImportSuggestedMetrics = {
  suggested_sets?: number;
  suggestedSets?: number;
  suggested_reps?: number;
  suggestedReps?: number;
  suggested_weight?: number;
  suggestedWeight?: number;
  suggested_time?: number;
  suggestedTime?: number;
  suggested_distance?: number;
  suggestedDistance?: number;
};

export function buildImportTargetSets(
  current: ImportSuggestedMetrics & Record<string, unknown>,
  fallbackTimeSeconds?: number,
): ExpandedImportWorkout["exercises"][number]["sets"] {
  const suggestedSetsCount = current.suggested_sets ?? current.suggestedSets;
  const suggestedRepsVal = current.suggested_reps ?? current.suggestedReps;
  const suggestedWeightVal = current.suggested_weight ?? current.suggestedWeight;
  const suggestedDistanceVal =
    current.suggested_distance ?? current.suggestedDistance;
  const hasExplicitLoad =
    suggestedRepsVal != null ||
    suggestedWeightVal != null ||
    suggestedDistanceVal != null;
  const suggestedTimeVal =
    current.suggested_time ??
    current.suggestedTime ??
    (!hasExplicitLoad && fallbackTimeSeconds != null
      ? fallbackTimeSeconds
      : undefined);

  if (
    suggestedRepsVal == null &&
    suggestedWeightVal == null &&
    suggestedTimeVal == null &&
    suggestedDistanceVal == null &&
    suggestedSetsCount == null
  ) {
    return undefined;
  }

  const numSets = suggestedSetsCount ?? 1;
  return Array.from({ length: numSets }, () => ({
    reps: suggestedRepsVal ?? null,
    weight: suggestedWeightVal ?? null,
    time: suggestedTimeVal ?? null,
    distance: suggestedDistanceVal ?? null,
  }));
}

export function resolveImportKeyMuscles(
  ex: ImportExerciseInput,
): string[] | undefined {
  if ("keyMuscles" in ex && ex.keyMuscles && ex.keyMuscles.length > 0) {
    return ex.keyMuscles;
  }
  if ("key_muscles" in ex && ex.key_muscles && ex.key_muscles.length > 0) {
    return ex.key_muscles;
  }
  return undefined;
}

export function parseClockTimestamp(value: string): number {
  const parts = value.trim().replace(/^\[/, "").replace(/\]$/, "").split(":");
  if (parts.length < 2 || parts.length > 3) {
    throw new Error(`Invalid timestamp: ${value}`);
  }

  const numbers = parts.map((part) => {
    if (!/^\d{1,2}$/.test(part)) {
      throw new Error(`Invalid timestamp: ${value}`);
    }
    return Number(part);
  });

  if (numbers.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid timestamp: ${value}`);
  }

  if (numbers.length === 3) {
    const [hours, minutes, seconds] = numbers;
    if (minutes > 59 || seconds > 59) {
      throw new Error(`Invalid timestamp: ${value}`);
    }
    return hours * 3600 + minutes * 60 + seconds;
  }

  const [minutes, seconds] = numbers;
  if (seconds > 59) {
    throw new Error(`Invalid timestamp: ${value}`);
  }
  return minutes * 60 + seconds;
}

const INTERVAL_PATTERN =
  /(\d+)\s*s(?:ec(?:onds?)?)?\s*work(?:\s*\/\s*\d+\s*s(?:ec(?:onds?)?)?\s*rest)?/i;

export function parseIntervalPattern(value: string): {
  work_seconds: number;
} | null {
  const match = value.trim().match(INTERVAL_PATTERN);
  if (!match) {
    return null;
  }
  return {
    work_seconds: Number(match[1]),
  };
}

function parseWorkoutLengthSeconds(value: string): number | null {
  const minutes = value.trim().match(/(\d+(?:\.\d+)?)\s*(?:min(?:ute)?s?)/i);
  if (minutes) {
    return Math.round(Number(minutes[1]) * 60);
  }
  const clock = value.trim().match(/^\[?\d{1,2}:\d{2}(?::\d{2})?\]?$/);
  if (clock) {
    return parseClockTimestamp(value);
  }
  return null;
}

const ROUND_CLOCK_SECONDS = new Set([0, 30]);
const SYNTHETIC_GAPS = new Set([30, 45, 60, 90]);

export class ImportStructureValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportStructureValidationError";
  }
}

type CadenceExercise = {
  name: string;
  timestamp: string;
  chapter?: string;
  suggested_time?: number;
};

function chapterWorkSeconds(group: CadenceExercise[]): number | undefined {
  const times = group
    .map((exercise) => exercise.suggested_time)
    .filter((value): value is number => value != null && value > 0);
  if (times.length === 0) return undefined;
  const first = times[0];
  return times.every((value) => value === first) ? first : undefined;
}

/** Gemini often invents a fixed cadence (08:00, 09:00 or 07:53, 08:53) instead of each beep. */
export function findSnappedCadenceTimestampsError(
  exercises: CadenceExercise[],
): string | undefined {
  const groups = new Map<string, CadenceExercise[]>();
  for (const exercise of exercises) {
    if (isRestWorkoutItem({ name: exercise.name })) continue;
    const key = exercise.chapter ?? "";
    const group = groups.get(key) ?? [];
    group.push(exercise);
    groups.set(key, group);
  }

  for (const [chapter, group] of groups) {
    const moves = group.map((exercise) => ({
      timestamp: exercise.timestamp,
      start: parseClockTimestamp(exercise.timestamp),
    }));
    if (moves.length < 5) continue;

    const gaps: number[] = [];
    for (let i = 1; i < moves.length; i += 1) {
      gaps.push(moves[i]!.start - moves[i - 1]!.start);
    }
    const gap = gaps[0];
    if (gap == null || !SYNTHETIC_GAPS.has(gap)) continue;
    if (!gaps.every((value) => value === gap)) continue;

    const workSeconds = chapterWorkSeconds(group);
    // 20s work / 10s rest (Tabata): work starts really are 30s apart.
    if (workSeconds === 20 && gap === 30) continue;

    const clockSeconds = moves.map((move) => move.start % 60);
    const uniqueSeconds = new Set(clockSeconds);
    const allRound = clockSeconds.every((value) =>
      ROUND_CLOCK_SECONDS.has(value),
    );
    if (uniqueSeconds.size > 1 && !allRound) continue;

    const sample = moves
      .slice(0, 4)
      .map((move) => move.timestamp)
      .join(", ");
    const label = chapter || "Exercise";
    return `${label} timestamps are a synthetic ${gap}s grid (${sample}, …). Do not shift a cadence by a constant offset (07:53, 08:53 is as wrong as 08:00, 09:00). Re-watch the beep/timer for each move — seconds-of-minute should change (e.g. 07:00, 07:57, 08:58).`;
  }
  return undefined;
}

export function expandImportStructure(
  input: ImportWorkoutStructureInput,
): ExpandedImportWorkout {
  const allMoves = input.exercises.filter(
    (exercise) => !isRestWorkoutItem({ name: exercise.name }),
  );
  const snapped = findSnappedCadenceTimestampsError(allMoves);
  if (snapped) {
    throw new ImportStructureValidationError(snapped);
  }

  const interval = parseIntervalPattern(input.overview.interval_pattern);
  const workoutLengthSeconds = parseWorkoutLengthSeconds(
    input.overview.workout_length,
  );

  const exercises: ExpandedImportWorkout["exercises"] = [];

  for (let i = 0; i < allMoves.length; i += 1) {
    const current = allMoves[i];
    const next = allMoves[i + 1];
    const chapter = current.chapter?.trim() || undefined;
    const tags = chapter ? [chapter] : [];
    const start = parseClockTimestamp(current.timestamp);
    let videoEndTime: number;
    if (next) {
      videoEndTime = parseClockTimestamp(next.timestamp);
      if (videoEndTime <= start) {
        throw new Error(
          `Timestamps must increase: ${current.name} (${current.timestamp})`,
        );
      }
    } else if (interval) {
      videoEndTime = start + interval.work_seconds;
    } else if (
      workoutLengthSeconds != null &&
      workoutLengthSeconds > start
    ) {
      videoEndTime = workoutLengthSeconds;
    } else {
      videoEndTime = start + 30;
    }

    const initialSets = buildImportTargetSets(
      current,
      interval?.work_seconds,
    );

    exercises.push({
      name: current.name,
      videoStartTime: start,
      videoEndTime,
      ...(chapter ? { chapter } : {}),
      tags,
      metricProfile: current.metric_profile ?? current.metricProfile,
      muscleGroup: current.muscle_group ?? current.muscleGroup,
      keyMuscles: current.key_muscles ?? current.keyMuscles,
      sets: initialSets,
    });
  }

  if (exercises.length === 0) {
    throw new Error("Import structure has no exercises");
  }

  return {
    workoutName:
      input.workoutName?.trim() ||
      input.overview.structure?.trim() ||
      allMoves[0]?.chapter ||
      "Imported workout",
    author: input.author,
    channelUrl: input.channelUrl,
    sourceVideoUrl: input.sourceVideoUrl,
    exercises,
  };
}
