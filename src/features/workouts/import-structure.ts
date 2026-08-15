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

export function expandImportStructure(
  input: ImportWorkoutStructureInput,
): ExpandedImportWorkout {
  const interval = parseIntervalPattern(input.overview.interval_pattern);
  const workoutLengthSeconds = parseWorkoutLengthSeconds(
    input.overview.workout_length,
  );

  const exercises: ExpandedImportWorkout["exercises"] = [];
  const allMoves = input.sections.flatMap((section) =>
    section.exercises
      .filter((exercise) => !isRestWorkoutItem({ name: exercise.name }))
      .map((exercise) => ({
        ...exercise,
        section_name: section.section_name,
      })),
  );

  for (let i = 0; i < allMoves.length; i += 1) {
    const current = allMoves[i];
    const next = allMoves[i + 1];
    const tags = [current.section_name];
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

    const suggestedSetsCount = current.suggested_sets ?? current.suggestedSets;
    const suggestedRepsVal = current.suggested_reps ?? current.suggestedReps;
    const suggestedWeightVal = current.suggested_weight ?? current.suggestedWeight;
    const suggestedTimeVal =
      current.suggested_time ??
      current.suggestedTime ??
      (current.suggested_reps == null &&
      current.suggestedReps == null &&
      current.suggested_weight == null &&
      current.suggestedWeight == null &&
      current.suggested_distance == null &&
      current.suggestedDistance == null &&
      interval
        ? interval.work_seconds
        : undefined);
    const suggestedDistanceVal = current.suggested_distance ?? current.suggestedDistance;

    let initialSets: Array<{ reps?: number | null; weight?: number | null; time?: number | null; distance?: number | null }> | undefined;
    if (
      suggestedRepsVal != null ||
      suggestedWeightVal != null ||
      suggestedTimeVal != null ||
      suggestedDistanceVal != null ||
      suggestedSetsCount != null
    ) {
      const numSets = suggestedSetsCount ?? 1;
      initialSets = Array.from({ length: numSets }, () => ({
        reps: suggestedRepsVal ?? null,
        weight: suggestedWeightVal ?? null,
        time: suggestedTimeVal ?? null,
        distance: suggestedDistanceVal ?? null,
      }));
    }

    exercises.push({
      name: current.name,
      videoStartTime: start,
      videoEndTime,
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
      input.sections[0]?.section_name ||
      "Imported workout",
    author: input.author,
    channelUrl: input.channelUrl,
    sourceVideoUrl: input.sourceVideoUrl,
    exercises,
  };
}
