import { describe, expect, it } from "vitest";

import {
  formatDurationSeconds,
  isRestWorkoutItem,
} from "@/features/workouts/workout-item";

describe("isRestWorkoutItem", () => {
  it("treats Rest as a rest marker, not an exercise", () => {
    expect(isRestWorkoutItem({ name: "Rest" })).toBe(true);
    expect(isRestWorkoutItem({ name: "rest period" })).toBe(true);
    expect(isRestWorkoutItem({ name: "Recovery" })).toBe(true);
  });

  it("treats a rest tag as a rest marker", () => {
    expect(isRestWorkoutItem({ name: "Pause", tags: ["rest"] })).toBe(true);
  });

  it("does not treat real exercises as rest", () => {
    expect(isRestWorkoutItem({ name: "Lunges" })).toBe(false);
    expect(isRestWorkoutItem({ name: "Rest pause squat" })).toBe(false);
  });
});

describe("formatDurationSeconds", () => {
  it("formats short rests in seconds", () => {
    expect(formatDurationSeconds(31)).toBe("31s");
  });

  it("formats longer rests as m:ss", () => {
    expect(formatDurationSeconds(75)).toBe("1:15");
  });
});
