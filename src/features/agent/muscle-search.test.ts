import { describe, expect, it } from "vitest";

import { resolveMuscleSearch } from "@/features/agent/muscle-search";

describe("resolveMuscleSearch", () => {
  it("maps knee pain to upper-leg muscles", () => {
    const resolved = resolveMuscleSearch({ query: "pain in my knees" });
    expect(resolved.muscleGroups).toContain("legs");
    expect(resolved.keyMusclePatterns).toEqual(
      expect.arrayContaining(["quad", "glute", "hamstring"]),
    );
  });

  it("maps deadlifts to back and posterior-chain muscles", () => {
    const resolved = resolveMuscleSearch({
      query: "deadlifts feel off",
      catalog: [
        {
          id: "dl",
          name: "Barbell Deadlift",
          muscleGroup: "back",
          keyMuscles: ["lats", "glutes"],
        },
      ],
    });
    expect(resolved.muscleGroups).toEqual(
      expect.arrayContaining(["back", "legs"]),
    );
    expect(resolved.matchedExerciseNames).toContain("Barbell Deadlift");
    expect(resolved.keyMusclePatterns).toEqual(
      expect.arrayContaining(["lat", "glute", "hamstring"]),
    );
  });

  it("includes the current lift's muscles", () => {
    const resolved = resolveMuscleSearch({
      query: "this hurts",
      currentExercise: {
        id: "1",
        name: "Romanian Deadlift",
        muscleGroup: "legs",
        keyMuscles: ["Hamstrings"],
      },
    });
    expect(resolved.muscleGroups).toContain("legs");
    expect(resolved.keyMusclePatterns).toContain("hamstrings");
  });
});
