import type {
  MetricProfile,
  MuscleGroup,
} from "@/db/schema/workout-schema";

export function missingExerciseCatalogPatch(
  current: {
    muscleGroup: MuscleGroup | null;
    metricProfile: MetricProfile;
  },
  incoming: {
    muscleGroup?: MuscleGroup | null;
    metricProfile?: MetricProfile | null;
  },
): Partial<{
  muscleGroup: MuscleGroup;
  metricProfile: MetricProfile;
}> {
  const patch: Partial<{
    muscleGroup: MuscleGroup;
    metricProfile: MetricProfile;
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
  return patch;
}
