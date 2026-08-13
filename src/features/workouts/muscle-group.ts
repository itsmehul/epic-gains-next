import type { MuscleGroup } from "@/db/schema/workout-schema";

const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  legs: "Legs",
  core: "Core",
};

export function muscleGroupLabel(
  group: MuscleGroup | null | undefined,
): string | null {
  if (!group) return null;
  return MUSCLE_GROUP_LABELS[group];
}
