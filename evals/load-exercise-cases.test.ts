import { describe, expect, it } from "vitest";

import { loadExerciseEvalCases } from "./load-exercise-cases";

describe("loadExerciseEvalCases", () => {
  it("loads ground-truth JSON from the exercises folder", () => {
    const cases = loadExerciseEvalCases();
    expect(cases.map((item) => item.id).sort()).toEqual([
      "disabled-playback",
      "unstructured-dance",
    ]);
    expect(cases.every((item) => "rejected" in item.expected)).toBe(true);
  });
});
