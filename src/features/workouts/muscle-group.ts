import {
  MUSCLE_GROUP_VALUES,
  type MuscleGroup,
} from "@/db/schema/workout-schema";

const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  legs: "Legs",
  core: "Core",
};

export const MUSCLE_GROUP_OPTIONS = MUSCLE_GROUP_VALUES.map((value) => ({
  value,
  label: MUSCLE_GROUP_LABELS[value],
}));

export function muscleGroupLabel(
  group: MuscleGroup | null | undefined,
): string | null {
  if (!group) return null;
  return MUSCLE_GROUP_LABELS[group];
}
