import { describe, expect, it } from "vitest";

import {
  findAbuttingExerciseTimelineError,
  importFullWorkoutSchema,
} from "@/features/workouts/schemas";

const baseExercise = {
  name: "Squat",
  videoStartTime: 25,
  videoEndTime: 85,
};

describe("findAbuttingExerciseTimelineError", () => {
  it("accepts abutting seconds", () => {
    expect(
      findAbuttingExerciseTimelineError([
        { videoStartTime: 25, videoEndTime: 85 },
        { videoStartTime: 85, videoEndTime: 145 },
      ]),
    ).toBeUndefined();
  });

  it("rejects a gap", () => {
    expect(
      findAbuttingExerciseTimelineError([
        { videoStartTime: 25, videoEndTime: 85 },
        { videoStartTime: 145, videoEndTime: 205 },
      ]),
    ).toMatch(/must equal exercises\[1\]\.videoStartTime/);
  });

  it("rejects a missing end", () => {
    expect(
      findAbuttingExerciseTimelineError([{ videoStartTime: 25 }]),
    ).toBe("exercises[0].videoEndTime is required");
  });
});

describe("importFullWorkoutSchema", () => {
  it("rejects non-abutting exercises", () => {
    const parsed = importFullWorkoutSchema.safeParse({
      workoutName: "Test",
      sourceVideoUrl: "https://www.youtube.com/watch?v=6d_1DqgqOrE",
      exercises: [
        { ...baseExercise, videoEndTime: 85 },
        { ...baseExercise, name: "Jack", videoStartTime: 145, videoEndTime: 205 },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a doubled work interval on a regular grid", () => {
    const parsed = importFullWorkoutSchema.safeParse({
      workoutName: "Test",
      sourceVideoUrl: "https://www.youtube.com/watch?v=6d_1DqgqOrE",
      exercises: [
        { name: "A", videoStartTime: 25, videoEndTime: 85 },
        { name: "B", videoStartTime: 85, videoEndTime: 205 },
        { name: "C", videoStartTime: 205, videoEndTime: 265 },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});
