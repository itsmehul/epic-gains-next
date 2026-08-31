import { describe, expect, it } from "vitest";

import {
  formatAthleteLiftContext,
  subagentTaskPrompt,
  withAthleteLiftContext,
} from "@/features/agent/lift-context";

const selected = {
  available: true as const,
  exercise: {
    id: "ex_leg_ext",
    name: "Leg Extension",
    muscleGroup: "legs",
    keyMuscles: ["Rectus Femoris"],
    tags: ["accessories"],
    chapter: null,
    videoUrl: "https://www.youtube.com/watch?v=abc",
  },
  recentSets: [
    { reps: 12, weight: 70, time: null, distance: null, updatedAt: "2026-08-29T11:23:33.000Z" },
  ],
  recentNotes: [] as Array<{ text: string; createdAt: string }>,
};

describe("lift context", () => {
  it("names the selected lift and attached video", () => {
    const block = formatAthleteLiftContext(selected);
    expect(block).toContain("Leg Extension");
    expect(block).toContain("ex_leg_ext");
    expect(block).toContain("https://www.youtube.com/watch?v=abc");
    expect(block).not.toContain("squat");
  });

  it("says no lift is selected without naming examples", () => {
    const block = formatAthleteLiftContext({
      available: false,
      reason: "No lift is selected.",
    });
    expect(block).toContain("none selected");
    expect(block).not.toContain("Back Squat");
  });

  it("keeps the parent task but tells the subagent to prefer Current lift", () => {
    const prompt = subagentTaskPrompt("demo video for squats", selected);
    expect(prompt).toContain("Leg Extension");
    expect(prompt).toContain("Task: demo video for squats");
    expect(prompt).toContain("ignore the guessed name");
  });

  it("appends the block to a system prompt", () => {
    expect(withAthleteLiftContext("You are a trainer.", selected)).toContain(
      "Leg Extension",
    );
  });
});
