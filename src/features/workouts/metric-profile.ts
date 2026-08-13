import type { MetricProfile } from "@/db/schema/workout-schema";

export type SetFieldKey = "reps" | "weight" | "time" | "distance";

export type MetricProfileFields = {
  primary: SetFieldKey[];
  extra: SetFieldKey[];
};

const PROFILE_FIELDS: Record<MetricProfile, MetricProfileFields> = {
  WEIGHT_REPS: { primary: ["weight", "reps"], extra: ["time"] },
  BODYWEIGHT_REPS: { primary: ["reps"], extra: ["weight"] },
  WEIGHTED_REPS: { primary: ["weight", "reps"], extra: [] },
  TIMED_HOLD: { primary: ["time"], extra: ["weight"] },
  CARDIO_DISTANCE: { primary: ["distance", "time"], extra: [] },
  LOADED_CARRY: { primary: ["weight", "distance"], extra: ["time"] },
  CUSTOM: { primary: ["weight", "reps"], extra: ["time", "distance"] },
};

export function fieldsForMetricProfile(
  profile: MetricProfile | null | undefined,
): MetricProfileFields {
  return PROFILE_FIELDS[profile ?? "CUSTOM"];
}
