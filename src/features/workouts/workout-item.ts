import { normalizeExerciseName } from "@/features/workouts/exercise-name";

const REST_TAG = "rest";

const REST_NAMES = new Set([
  "rest",
  "rest period",
  "rest time",
  "recovery",
  "break",
]);

/** Leftover rest markers from older imports — skip them, do not treat as exercises. */
export function isRestWorkoutItem(item: {
  name: string;
  tags?: string[] | null;
}): boolean {
  if ((item.tags ?? []).some((tag) => normalizeExerciseName(tag) === REST_TAG)) {
    return true;
  }
  return REST_NAMES.has(normalizeExerciseName(item.name));
}
