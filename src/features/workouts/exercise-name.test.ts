import { describe, expect, it } from "vitest";

import {
  exerciseNameLookupKeys,
  exerciseNameSimilarity,
  normalizeExerciseName,
} from "@/features/workouts/exercise-name";

describe("normalizeExerciseName", () => {
  it("collapses punctuation and case", () => {
    expect(normalizeExerciseName("Push-up")).toBe("push up");
    expect(normalizeExerciseName("  Push   ups ")).toBe("push ups");
  });
});

describe("exerciseNameLookupKeys", () => {
  it("includes a singular/plural fold on the last token", () => {
    expect(exerciseNameLookupKeys("Back Extension")).toEqual([
      "back extension",
      "back extensions",
    ]);
    expect(exerciseNameLookupKeys("Back Extensions")).toEqual([
      "back extensions",
      "back extension",
    ]);
  });
});

describe("exerciseNameSimilarity", () => {
  it("treats push-up variants as near matches", () => {
    expect(exerciseNameSimilarity("Push up", "Push-up")).toBeGreaterThan(0.9);
    expect(exerciseNameSimilarity("pushups", "Push-up")).toBeGreaterThan(0.85);
  });

  it("scores unrelated names low", () => {
    expect(exerciseNameSimilarity("Squat", "Deadlift")).toBeLessThan(0.5);
  });
});
