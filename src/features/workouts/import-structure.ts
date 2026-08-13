import type { MetricProfile } from "@/db/schema/workout-schema";
import type { ImportWorkoutStructureInput } from "@/features/workouts/schemas";

export type ExpandedImportWorkout = {
  workoutName: string;
  author?: string;
  sourceVideoUrl?: string;
  exercises: Array<{
    name: string;
    videoStartTime: number;
    videoEndTime: number;
    tags?: string[];
    metricProfile?: MetricProfile;
  }>;
};

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
  /(\d+)\s*s(?:ec(?:onds?)?)?\s*work\s*\/\s*(\d+)\s*s(?:ec(?:onds?)?)?\s*rest/i;

export function parseIntervalPattern(value: string): {
  work_seconds: number;
  rest_seconds: number;
} | null {
  const match = value.trim().match(INTERVAL_PATTERN);
  if (!match) {
    return null;
  }
  return {
    work_seconds: Number(match[1]),
    rest_seconds: Number(match[2]),
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
    section.exercises.map((exercise) => ({
      ...exercise,
      section_name: section.section_name,
    })),
  );

  for (let i = 0; i < allMoves.length; i += 1) {
    const current = allMoves[i];
    const next = allMoves[i + 1];
    const tags = [current.section_name];
    const start = parseClockTimestamp(current.timestamp);
    const fallbackEnd = interval
      ? start + interval.work_seconds + interval.rest_seconds
      : start + 30;
    let nextStart: number;
    if (next) {
      nextStart = parseClockTimestamp(next.timestamp);
      if (nextStart <= start) {
        throw new Error(
          `Timestamps must increase: ${current.name} (${current.timestamp})`,
        );
      }
    } else if (
      workoutLengthSeconds != null &&
      workoutLengthSeconds > start
    ) {
      nextStart = workoutLengthSeconds;
    } else {
      nextStart = fallbackEnd;
    }

    const workEnd = interval
      ? Math.min(start + interval.work_seconds, nextStart)
      : nextStart;

    exercises.push({
      name: current.name,
      videoStartTime: start,
      videoEndTime: workEnd,
      tags,
      metricProfile: current.metric_profile ?? current.metricProfile,
    });

    if (workEnd < nextStart) {
      exercises.push({
        name: "Rest",
        videoStartTime: workEnd,
        videoEndTime: nextStart,
        tags: [...tags, "rest"],
      });
    }
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
    sourceVideoUrl: input.sourceVideoUrl,
    exercises,
  };
}
