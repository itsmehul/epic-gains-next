import { normalizeExerciseName } from "@/features/workouts/exercise-name";
import type { WorkoutExercise } from "@/features/workouts/types";

const REST_NAMES = new Set([
  "rest",
  "rest period",
  "rest time",
  "recovery",
  "break",
]);

export function isRestWorkoutItem(item: {
  name: string;
  tags?: string[] | null;
}): boolean {
  if ((item.tags ?? []).some((tag) => normalizeExerciseName(tag) === "rest")) {
    return true;
  }
  return REST_NAMES.has(normalizeExerciseName(item.name));
}

export function getItemDurationSeconds(
  item: Pick<WorkoutExercise, "metaData">,
): number | null {
  const start = item.metaData?.videoStartTime;
  const end = item.metaData?.videoEndTime;
  if (start == null || end == null) return null;
  const duration = end - start;
  return duration > 0 ? duration : null;
}

export function formatDurationSeconds(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}:${String(
    Math.round(seconds % 60),
  ).padStart(2, "0")}`;
}
