import { describe, expect, it } from "vitest";

import { WORKOUT_ACHIEVEMENT_COUNT } from "@/features/achievements/catalog";
import type { AchievementSetRow } from "@/features/achievements/evaluate";
import {
  buildWorkoutAchievementStats,
  evaluateAchievements,
  workoutLadderUnlockedCount,
  workoutTierProgress,
} from "@/features/achievements/evaluate";

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
  it("unlocks global ink, streaks, and started-workout campaign rungs", () => {
    const items = evaluateAchievements(
      [
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
      ],
      new Map([
        ["w1", ["e1"]],
        ["w2", ["e2"]],
        ["w3", ["e3"]],
      ]),
    );
    const byId = Object.fromEntries(
      items.filter((item) => item.scope === "global").map((item) => [item.id, item]),
    );

    expect(byId.wet_ink.unlocked).toBe(true);
    expect(byId.back_to_back.unlocked).toBe(true);
    expect(byId.second_region.unlocked).toBe(true);
    expect(byId.second_tape.unlocked).toBe(true);
    expect(byId.two_follow_alongs.unlocked).toBe(false);
    expect(byId.posterior_line.progress).toBe(1);
    expect(byId.hip_drive.progress).toBe(1);
    expect(byId.three_clears.unlocked).toBe(false);
  });

  it("counts follow-alongs on the same day", () => {
    const items = evaluateAchievements(
      [
        row({ updatedAt: "2026-08-01T10:00:00", workoutId: "a", exerciseId: "e1" }),
        row({ updatedAt: "2026-08-01T14:00:00", workoutId: "b", exerciseId: "e2" }),
        row({ updatedAt: "2026-08-01T18:00:00", workoutId: "c", exerciseId: "e3" }),
      ],
      new Map([
        ["a", ["e1"]],
        ["b", ["e2"]],
        ["c", ["e3"]],
      ]),
    );
    const item = items.find((row) => row.id === "two_follow_alongs");
    expect(item?.unlocked).toBe(true);
  });

  it("unlocks per-workout tutorial independently and treats full ladder as complete", () => {
    const roster = ["e1", "e2"];
    const rows: AchievementSetRow[] = [
      row({ updatedAt: "2026-08-01", exerciseId: "e1" }),
    ];
    const items = evaluateAchievements(rows, new Map([["w1", roster]]));
    const tutorial = items.find(
      (item) => item.id === "wo_tutorial" && item.workoutId === "w1",
    );
    const rosterItem = items.find(
      (item) => item.id === "wo_roster" && item.workoutId === "w1",
    );
    const complete = items.find((item) => item.id === "three_clears");
    expect(tutorial?.unlocked).toBe(true);
    expect(rosterItem?.unlocked).toBe(false);
    expect(complete?.unlocked).toBe(false);
    expect(workoutLadderUnlockedCount(rows, roster).unlocked).toBe(1);
  });

  it("marks a workout complete only after every template unlocks", () => {
    const roster = ["e1"];
    const rows: AchievementSetRow[] = [
      ...Array.from({ length: 20 }, (_, index) =>
        row({
          updatedAt: `2026-08-01T${String(index).padStart(2, "0")}:00:00`,
          exerciseId: "e1",
        }),
      ),
      ...Array.from({ length: 28 }, (_, index) =>
        row({
          updatedAt: `2026-08-${String((index % 4) + 2).padStart(2, "0")}T${String(index % 12).padStart(2, "0")}:00:00`,
          exerciseId: "e1",
        }),
      ),
    ];
    const stats = buildWorkoutAchievementStats(rows, roster);
    expect(stats.setCount).toBe(48);
    expect(stats.trainingDayCount).toBe(5);
    expect(stats.maxSetsInOneDay).toBeGreaterThanOrEqual(20);
    expect(stats.fullRoster).toBe(1);
    expect(stats.sameDayFullRoster).toBe(1);

    const items = evaluateAchievements(rows, new Map([["w1", roster]]));
    const ladder = items.filter(
      (item) =>
        item.scope === "workout" &&
        item.workoutId === "w1" &&
        item.tier === "bronze",
    );
    expect(ladder.every((item) => item.unlocked)).toBe(true);
    expect(ladder).toHaveLength(WORKOUT_ACHIEVEMENT_COUNT);
    expect(items.find((item) => item.id === "almost_there")?.unlocked).toBe(
      true,
    );
  });

  it("unlocks demo disc when many workouts are started and none are fully complete", () => {
    const rows: AchievementSetRow[] = Array.from({ length: 10 }, (_, index) =>
      row({
        workoutId: `w${index}`,
        exerciseId: "e1",
        updatedAt: "2026-08-01",
      }),
    );
    const roster = new Map(
      rows.map((item) => [item.workoutId, ["e1", "e2"]]),
    );
    const items = evaluateAchievements(rows, roster);
    expect(items.find((item) => item.id === "window_shopper")?.unlocked).toBe(
      true,
    );
    expect(items.find((item) => item.id === "commitment_issues")?.unlocked).toBe(
      true,
    );
    expect(items.find((item) => item.id === "three_clears")?.unlocked).toBe(
      false,
    );
  });

  it("scales volume rungs from prescribed sets across the roster", () => {
    const roster = [
      { exerciseId: "e1", prescribedSets: 4, metricProfile: "WEIGHT_REPS" as const },
      { exerciseId: "e2", prescribedSets: 3, metricProfile: "TIMED_HOLD" as const },
      {
        exerciseId: "e3",
        prescribedSets: 1,
        metricProfile: "CARDIO_DISTANCE" as const,
      },
    ];
    const items = evaluateAchievements(
      [row({ updatedAt: "2026-08-01", exerciseId: "e1" })],
      new Map([["w1", roster]]),
    );
    const volumeI = items.find((item) => item.id === "wo_volume_i");
    const volumeII = items.find((item) => item.id === "wo_volume_ii");
    const speedrun = items.find((item) => item.id === "wo_one_sitting");
    expect(volumeI?.target).toBe(8);
    expect(volumeI?.description).toBe("Log 8 sets on this workout.");
    expect(volumeII?.target).toBe(32);
    expect(speedrun?.target).toBe(8);
    expect(items.find((item) => item.id === "wo_ag_volume")?.target).toBe(64);
    expect(items.find((item) => item.id === "wo_au_volume")?.target).toBe(128);
    expect(items.find((item) => item.id === "wo_pt_volume")?.target).toBe(256);
  });

  it("only counts sets that fill each exercise metric profile", () => {
    const roster = [
      { exerciseId: "hold", metricProfile: "TIMED_HOLD" as const, prescribedSets: 2 },
      {
        exerciseId: "run",
        metricProfile: "CARDIO_DISTANCE" as const,
        prescribedSets: 1,
      },
      {
        exerciseId: "press",
        metricProfile: "WEIGHT_REPS" as const,
        prescribedSets: 3,
      },
    ];
    const stats = buildWorkoutAchievementStats(
      [
        row({
          updatedAt: "2026-08-01",
          exerciseId: "hold",
          metricProfile: "TIMED_HOLD",
          reps: 10,
        }),
        row({
          updatedAt: "2026-08-01",
          exerciseId: "hold",
          metricProfile: "TIMED_HOLD",
          time: 30,
        }),
        row({
          updatedAt: "2026-08-01",
          exerciseId: "run",
          metricProfile: "CARDIO_DISTANCE",
          distance: 2,
        }),
        row({
          updatedAt: "2026-08-01",
          exerciseId: "run",
          metricProfile: "CARDIO_DISTANCE",
          distance: 2,
          time: 12,
        }),
        row({
          updatedAt: "2026-08-01",
          exerciseId: "press",
          metricProfile: "WEIGHT_REPS",
          weight: 40,
          reps: 8,
        }),
      ],
      roster,
    );
    expect(stats.setCount).toBe(3);
    expect(stats.fullRoster).toBe(3);
    expect(stats.sameDayFullRoster).toBe(1);
  });

  it("offers HUD bonuses beyond the ladder when a workout uses those playstyles", () => {
    const roster = [
      { exerciseId: "hold", metricProfile: "TIMED_HOLD" as const, prescribedSets: 2 },
      { exerciseId: "press", metricProfile: "WEIGHT_REPS" as const, prescribedSets: 3 },
    ];
    const items = evaluateAchievements(
      [
        row({
          updatedAt: "2026-08-01",
          exerciseId: "hold",
          metricProfile: "TIMED_HOLD",
          time: 40,
        }),
        row({
          updatedAt: "2026-08-01",
          exerciseId: "press",
          metricProfile: "WEIGHT_REPS",
          weight: 50,
          reps: 8,
        }),
      ],
      new Map([["w1", roster]]),
    );
    const workoutItems = items.filter(
      (item) => item.scope === "workout" && item.workoutId === "w1",
    );
    const hud = workoutItems.filter((item) => item.category === "hud");
    expect(hud.map((item) => item.id).sort()).toEqual([
      "wo_hud_hold",
      "wo_hud_weight_reps",
    ]);
    expect(hud.every((item) => item.unlocked)).toBe(true);
    expect(workoutItems.length).toBeGreaterThan(WORKOUT_ACHIEVEMENT_COUNT);
    expect(workoutLadderUnlockedCount(
      [
        row({
          updatedAt: "2026-08-01",
          exerciseId: "hold",
          metricProfile: "TIMED_HOLD",
          time: 40,
        }),
      ],
      roster,
    ).total).toBe(WORKOUT_ACHIEVEMENT_COUNT);
    expect(items.find((item) => item.id === "pause_buffer")?.unlocked).toBe(true);
    expect(items.find((item) => item.id === "barbell_hud")?.unlocked).toBe(true);
    expect(items.find((item) => item.id === "class_change")?.progress).toBe(2);
    expect(items.find((item) => item.id === "wo_hud_cardio")).toBeUndefined();
  });

  it("keeps bronze as the campaign clear while silver needs prescribed volume per exercise", () => {
    const roster = [
      { exerciseId: "e1", prescribedSets: 3 },
      { exerciseId: "e2", prescribedSets: 3 },
    ];
    const oneEach: AchievementSetRow[] = [
      row({ updatedAt: "2026-08-01", exerciseId: "e1" }),
      row({ updatedAt: "2026-08-01", exerciseId: "e2" }),
    ];
    const oneEachItems = evaluateAchievements(
      oneEach,
      new Map([["w1", roster]]),
    );
    expect(
      oneEachItems.find((item) => item.id === "wo_roster")?.unlocked,
    ).toBe(true);
    expect(
      oneEachItems.find((item) => item.id === "wo_ag_quota")?.unlocked,
    ).toBe(false);

    const prescribedRows: AchievementSetRow[] = [
      ...Array.from({ length: 3 }, (_, index) =>
        row({
          updatedAt: `2026-08-01T0${index}:00:00`,
          exerciseId: "e1",
        }),
      ),
      ...Array.from({ length: 3 }, (_, index) =>
        row({
          updatedAt: `2026-08-01T1${index}:00:00`,
          exerciseId: "e2",
        }),
      ),
    ];
    const stats = buildWorkoutAchievementStats(prescribedRows, roster);
    expect(stats.prescribedRoster).toBe(2);
    expect(stats.sameDayPrescribedRosterCount).toBe(1);
    const items = evaluateAchievements(
      prescribedRows,
      new Map([["w1", roster]]),
    );
    expect(items.find((item) => item.id === "wo_ag_quota")?.unlocked).toBe(
      true,
    );
    expect(items.find((item) => item.id === "wo_au_perfect")?.unlocked).toBe(
      true,
    );
    expect(items.find((item) => item.id === "wo_pt_mythic")?.unlocked).toBe(
      false,
    );
  });

  it("reports per-tier progress for the viewing user's sets on a workout", () => {
    const roster = ["e1", "e2"];
    const rows: AchievementSetRow[] = [
      row({ updatedAt: "2026-08-01", exerciseId: "e1" }),
      row({ updatedAt: "2026-08-01", exerciseId: "e2" }),
    ];
    const tiers = workoutTierProgress(rows, roster);
    const byTier = Object.fromEntries(tiers.map((item) => [item.tier, item]));
    expect(byTier.bronze.unlocked).toBeGreaterThan(0);
    expect(byTier.bronze.unlocked).toBeLessThan(byTier.bronze.total);
    expect(byTier.silver.unlocked).toBe(0);
    expect(byTier.gold.total).toBe(byTier.bronze.total);
    expect(byTier.platinum.total).toBe(byTier.bronze.total);
  });
});
