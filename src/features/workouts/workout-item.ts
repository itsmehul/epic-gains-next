import { normalizeExerciseName } from "@/features/workouts/exercise-name";
import type { WorkoutExercise } from "@/features/workouts/types";

export const CANONICAL_REST_NAME = "Rest";
export const REST_TAG = "rest";

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
  if ((item.tags ?? []).some((tag) => normalizeExerciseName(tag) === REST_TAG)) {
    return true;
  }
  return REST_NAMES.has(normalizeExerciseName(item.name));
}

export function withRestTag(tags: string[] | null | undefined): string[] {
  const next = [...(tags ?? [])];
  if (!next.some((tag) => normalizeExerciseName(tag) === REST_TAG)) {
    next.push(REST_TAG);
  }
  return next;
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
