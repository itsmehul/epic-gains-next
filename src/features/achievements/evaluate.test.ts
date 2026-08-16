import { describe, expect, it } from "vitest";

import {
  buildAchievementStats,
  evaluateAchievements,
} from "@/features/achievements/evaluate";
import type { AchievementSetRow } from "@/features/achievements/evaluate";

function row(
  partial: Partial<AchievementSetRow> & { updatedAt: string },
): AchievementSetRow {
  return {
    workoutId: "w1",
    exerciseId: "e1",
    muscleGroup: "chest",
    keyMuscles: ["pectoralis major"],
    ...partial,
  };
}

describe("evaluateAchievements", () => {
  it("unlocks ink, day streaks, tapes, and tagged targets from logged sets", () => {
    const stats = buildAchievementStats([
      row({ updatedAt: "2026-08-01" }),
      row({
        updatedAt: "2026-08-02",
        workoutId: "w2",
        exerciseId: "e2",
        muscleGroup: "back",
        keyMuscles: ["lats", "rear delts"],
      }),
      row({
        updatedAt: "2026-08-03",
        workoutId: "w3",
        exerciseId: "e3",
        muscleGroup: "legs",
        keyMuscles: ["glutes", "quads"],
      }),
    ]);
    const byId = Object.fromEntries(
      evaluateAchievements(stats).map((item) => [item.id, item]),
    );

    expect(byId.wet_ink.unlocked).toBe(true);
    expect(byId.back_to_back.unlocked).toBe(true);
    expect(byId.second_region.unlocked).toBe(true);
    expect(byId.second_tape.unlocked).toBe(true);
    expect(byId.two_follow_alongs.unlocked).toBe(false);
    expect(byId.posterior_line.progress).toBe(1);
    expect(byId.hip_drive.progress).toBe(1);
    expect(stats.uniqueExerciseCount).toBe(3);
    expect(stats.trainingDayCount).toBe(3);
  });

  it("counts follow-alongs on the same day", () => {
    const stats = buildAchievementStats([
      row({ updatedAt: "2026-08-01T10:00:00", workoutId: "a", exerciseId: "e1" }),
      row({ updatedAt: "2026-08-01T14:00:00", workoutId: "b", exerciseId: "e2" }),
      row({ updatedAt: "2026-08-01T18:00:00", workoutId: "c", exerciseId: "e3" }),
    ]);
    const item = evaluateAchievements(stats).find(
      (row) => row.id === "two_follow_alongs",
    );
    expect(item?.unlocked).toBe(true);
    expect(stats.maxSetsInOneDay).toBe(3);
  });
});
