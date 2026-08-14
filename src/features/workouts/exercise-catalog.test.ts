import { describe, expect, it } from "vitest";

import { missingExerciseCatalogPatch } from "@/features/workouts/exercise-catalog";

describe("missingExerciseCatalogPatch", () => {
  it("fills null muscle group and CUSTOM metric profile", () => {
    expect(
      missingExerciseCatalogPatch(
        { muscleGroup: null, metricProfile: "CUSTOM", keyMuscles: [] },
        {
          muscleGroup: "arms",
          metricProfile: "BODYWEIGHT_REPS",
          keyMuscles: ["Biceps Brachii"],
        },
      ),
    ).toEqual({
      muscleGroup: "arms",
      metricProfile: "BODYWEIGHT_REPS",
      keyMuscles: ["Biceps Brachii"],
    });
  });

  it("does not overwrite existing catalog values", () => {
    expect(
      missingExerciseCatalogPatch(
        { muscleGroup: "chest", metricProfile: "WEIGHT_REPS", keyMuscles: ["Pectoralis Major"] },
        {
          muscleGroup: "arms",
          metricProfile: "BODYWEIGHT_REPS",
          keyMuscles: ["Biceps Brachii"],
        },
      ),
    ).toEqual({});
  });
});
