import { describe, expect, it } from "vitest";

import { isRestWorkoutItem } from "@/features/workouts/workout-item";

describe("isRestWorkoutItem", () => {
  it("treats Rest as a leftover marker, not an exercise", () => {
    expect(isRestWorkoutItem({ name: "Rest" })).toBe(true);
    expect(isRestWorkoutItem({ name: "rest period" })).toBe(true);
    expect(isRestWorkoutItem({ name: "Recovery" })).toBe(true);
  });

  it("treats a rest tag as a leftover marker", () => {
    expect(isRestWorkoutItem({ name: "Pause", tags: ["rest"] })).toBe(true);
  });

  it("does not treat real exercises as rest", () => {
    expect(isRestWorkoutItem({ name: "Lunges" })).toBe(false);
    expect(isRestWorkoutItem({ name: "Rest pause squat" })).toBe(false);
  });
});
