import { describe, expect, it } from "vitest";

import { missingExerciseCatalogPatch } from "@/features/workouts/exercise-catalog";

describe("missingExerciseCatalogPatch", () => {
  it("fills null muscle group and CUSTOM metric profile", () => {
    expect(
      missingExerciseCatalogPatch(
        { muscleGroup: null, metricProfile: "CUSTOM" },
        { muscleGroup: "arms", metricProfile: "BODYWEIGHT_REPS" },
      ),
    ).toEqual({
      muscleGroup: "arms",
      metricProfile: "BODYWEIGHT_REPS",
    });
  });

  it("does not overwrite existing catalog values", () => {
    expect(
      missingExerciseCatalogPatch(
        { muscleGroup: "chest", metricProfile: "WEIGHT_REPS" },
        { muscleGroup: "arms", metricProfile: "BODYWEIGHT_REPS" },
      ),
    ).toEqual({});
  });
});
