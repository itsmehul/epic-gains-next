import type {
  MetricProfile,
  MuscleGroup,
} from "@/db/schema/workout-schema";

export function missingExerciseCatalogPatch(
  current: {
    muscleGroup: MuscleGroup | null;
    metricProfile: MetricProfile;
    keyMuscles?: string[] | null;
  },
  incoming: {
    muscleGroup?: MuscleGroup | null;
    metricProfile?: MetricProfile | null;
    keyMuscles?: string[] | null;
  },
): Partial<{
  muscleGroup: MuscleGroup;
  metricProfile: MetricProfile;
  keyMuscles: string[];
}> {
  const patch: Partial<{
    muscleGroup: MuscleGroup;
    metricProfile: MetricProfile;
    keyMuscles: string[];
  }> = {};
  if (!current.muscleGroup && incoming.muscleGroup) {
    patch.muscleGroup = incoming.muscleGroup;
  }
  if (
    current.metricProfile === "CUSTOM" &&
    incoming.metricProfile &&
    incoming.metricProfile !== "CUSTOM"
  ) {
    patch.metricProfile = incoming.metricProfile;
  }
  if (
    (!current.keyMuscles || current.keyMuscles.length === 0) &&
    incoming.keyMuscles &&
    incoming.keyMuscles.length > 0
  ) {
    patch.keyMuscles = incoming.keyMuscles;
  }
  return patch;
}
