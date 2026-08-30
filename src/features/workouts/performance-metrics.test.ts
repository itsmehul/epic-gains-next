import { describe, expect, it } from "vitest";

import {
  buildPerformanceMetrics,
  coveringRange,
  currentStreak,
  metricWindows,
  percentDelta,
  setVolume,
  buildCirclePulse,
  buildPeriodPerformance,
  compactSets,
  recentSetRangeForPeriod,
} from "@/features/workouts/performance-metrics";

describe("metricWindows", () => {
  it("covers yesterday-adjacent ISO weeks and a 30-day lookback from a Friday", () => {
    const windows = metricWindows(new Date(2026, 7, 14));
    expect(windows.focalDay.startDay).toBe("2026-08-14");
    expect(windows.currentWeek.startDay).toBe("2026-08-10");
    expect(windows.currentWeek.endDay).toBe("2026-08-16");
    expect(windows.priorWeek.startDay).toBe("2026-08-03");
    expect(windows.priorWeek.endDay).toBe("2026-08-09");
    expect(windows.trailing30Days.startDay).toBe("2026-07-16");
    expect(windows.trailing30Days.endDay).toBe("2026-08-14");
  });

  it("keeps the prior ISO week when the calendar month would miss July days", () => {
    const windows = metricWindows(new Date(2026, 7, 3));
    expect(windows.currentWeek.startDay).toBe("2026-08-03");
    expect(windows.priorWeek.startDay).toBe("2026-07-27");
    expect(windows.priorWeek.endDay).toBe("2026-08-02");
    const covering = coveringRange(windows);
    expect(covering.startDay).toBe("2026-07-05");
    expect(covering.endDay).toBe("2026-08-09");
  });
});

describe("percentDelta / setVolume", () => {
  it("computes week-over-week volume change", () => {
    expect(percentDelta(120, 100)).toBe(20);
    expect(percentDelta(80, 100)).toBe(-20);
    expect(percentDelta(50, 0)).toBeNull();
  });

  it("uses weight × reps for volume", () => {
    expect(setVolume({ weight: 100, reps: 5, time: null, distance: null })).toBe(
      500,
    );
    expect(
      setVolume({ weight: null, reps: 10, time: null, distance: null }),
    ).toBe(0);
  });
});

describe("buildPerformanceMetrics", () => {
  it("aggregates windows, streak, and PRs from one day list", () => {
    const windows = metricWindows(new Date(2026, 7, 14));
    const metrics = buildPerformanceMetrics({
      asOf: "2026-08-14",
      windows,
      allTimeBests: [
        {
          exerciseId: "ex-1",
          bestWeight: 225,
          bestReps: 5,
          bestTime: 0,
          bestDistance: 0,
          bestVolume: 1125,
        },
      ],
      days: [
        {
          day: "2026-08-14",
          workouts: [
            {
              id: "w1",
              name: "Push",
              exercises: [
                {
                  id: "ex-1",
                  name: "Bench",
                  metricProfile: "WEIGHT_REPS",
                  muscleGroup: "chest",
                  keyMuscles: ["pecs"],
                  sets: [
                    { reps: 5, weight: 225, time: null, distance: null },
                    { reps: 5, weight: 205, time: null, distance: null },
                  ],
                },
              ],
            },
          ],
        },
        {
          day: "2026-08-13",
          workouts: [
            {
              id: "w1",
              name: "Push",
              exercises: [
                {
                  id: "ex-1",
                  name: "Bench",
                  metricProfile: "WEIGHT_REPS",
                  muscleGroup: "chest",
                  keyMuscles: ["pecs"],
                  sets: [{ reps: 5, weight: 185, time: null, distance: null }],
                },
              ],
            },
          ],
        },
        {
          day: "2026-08-05",
          workouts: [
            {
              id: "w2",
              name: "Pull",
              exercises: [
                {
                  id: "ex-2",
                  name: "Row",
                  metricProfile: "WEIGHT_REPS",
                  muscleGroup: "back",
                  keyMuscles: ["lats"],
                  sets: [{ reps: 8, weight: 100, time: null, distance: null }],
                },
              ],
            },
          ],
        },
      ],
      comments: [
        {
          id: "c1",
          text: "Felt strong on the last set",
          createdAt: "2026-08-14T12:00:00.000Z",
          author: {
            id: "u1",
            name: "Alex",
            username: "alex",
            image: null,
          },
          exercise: {
            id: "ex-1",
            name: "Bench",
            muscleGroup: "chest",
            keyMuscles: ["pecs"],
          },
          workout: { id: "w1", name: "Push" },
        },
      ],
    });

    expect(metrics.windows.focalDay.setCount).toBe(2);
    expect(metrics.windows.focalDay.volume).toBe(2150);
    expect(metrics.windows.currentWeek.trainingDays).toBe(2);
    expect(metrics.windows.priorWeek.trainingDays).toBe(1);
    expect(metrics.windows.trailing30Days.muscleGroups[0]?.group).toBe("chest");
    expect(metrics.streak.currentDays).toBe(2);
    expect(metrics.personalRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          exerciseName: "Bench",
          metric: "weight",
          value: 225,
          day: "2026-08-14",
        }),
        expect.objectContaining({
          metric: "volume",
          value: 1125,
        }),
        expect.objectContaining({
          metric: "reps",
          value: 5,
        }),
      ]),
    );
    expect(metrics.comments).toHaveLength(1);
    expect(metrics.comments[0]).toMatchObject({
      text: "Felt strong on the last set",
      exerciseName: "Bench",
      workoutName: "Push",
      authorUsername: "alex",
    });
    expect(metrics.recentSets.range).toEqual({
      start: "2026-08-03",
      end: "2026-08-14",
    });
    expect(metrics.recentSets.days.map((day) => day.day)).toEqual([
      "2026-08-14",
      "2026-08-13",
      "2026-08-05",
    ]);
    expect(
      metrics.recentSets.days[0]?.workouts[0]?.exercises[0]?.notes,
    ).toEqual(["Felt strong on the last set"]);
    expect(metrics.olderHistory.daily).toHaveLength(0);
    expect(metrics.analytics.personalRecordCount).toBeGreaterThan(0);
    expect(metrics.analytics.muscleLeaders.currentWeek).toBe("chest");
    expect(metrics.analytics.topExercisesByVolume[0]?.name).toBe("Bench");
    expect(metrics.personalRecords.length).toBeLessThanOrEqual(10);
  });
});

describe("recentSetRangeForPeriod", () => {
  it("keeps the full week and clips month sets to 14 days", () => {
    const week = {
      start: new Date(2026, 7, 10),
      end: new Date(2026, 7, 17),
      startDay: "2026-08-10",
      endDay: "2026-08-16",
    };
    expect(recentSetRangeForPeriod("week", week, "2026-08-14")).toMatchObject({
      startDay: "2026-08-10",
      endDay: "2026-08-14",
    });
    const month = {
      start: new Date(2026, 7, 1),
      end: new Date(2026, 8, 1),
      startDay: "2026-08-01",
      endDay: "2026-08-31",
    };
    expect(recentSetRangeForPeriod("month", month, "2026-08-14")).toMatchObject({
      startDay: "2026-08-01",
      endDay: "2026-08-14",
    });
  });
});

describe("buildPeriodPerformance", () => {
  it("summarizes a month with grouped recent sets", () => {
    const range = {
      start: new Date(2026, 7, 1),
      end: new Date(2026, 8, 1),
      startDay: "2026-08-01",
      endDay: "2026-08-31",
    };
    const result = buildPeriodPerformance({
      period: "month",
      asOf: "2026-08-14",
      range,
      days: [
        {
          day: "2026-08-14",
          workouts: [
            {
              id: "w1",
              name: "Push",
              exercises: [
                {
                  id: "ex-1",
                  name: "Bench",
                  metricProfile: "WEIGHT_REPS",
                  muscleGroup: "chest",
                  keyMuscles: ["pecs"],
                  sets: [
                    { reps: 5, weight: 100, time: null, distance: null },
                    { reps: 5, weight: 100, time: null, distance: null },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(result.stats.setCount).toBe(2);
    expect(result.recentSets.days[0]?.workouts[0]?.exercises[0]?.sets).toEqual([
      { reps: 5, weight: 100, time: null, distance: null, count: 2 },
    ]);
    expect(result.topExercisesByVolume[0]?.name).toBe("Bench");
  });
});

describe("buildCirclePulse", () => {
  it("counts trained athletes and the volume leader", () => {
    const pulse = buildCirclePulse([
      {
        username: "a",
        canViewWorkouts: true,
        metrics: {
          windows: {
            focalDay: {
              range: { start: "2026-08-14", end: "2026-08-14" },
              trainingDays: 1,
              sessions: 1,
              setCount: 4,
              volume: 100,
              muscleGroups: [],
            },
            currentWeek: {
              range: { start: "2026-08-10", end: "2026-08-16" },
              trainingDays: 2,
              sessions: 2,
              setCount: 8,
              volume: 400,
              muscleGroups: [],
            },
            priorWeek: {
              range: { start: "2026-08-03", end: "2026-08-09" },
              trainingDays: 1,
              sessions: 1,
              setCount: 4,
              volume: 200,
              muscleGroups: [],
            },
            trailing30Days: {
              range: { start: "2026-07-16", end: "2026-08-14" },
              trainingDays: 4,
              sessions: 4,
              setCount: 16,
              volume: 800,
              muscleGroups: [],
            },
          },
          streak: { currentDays: 1, longestInRange: 2 },
        },
      },
      {
        username: "b",
        canViewWorkouts: true,
        metrics: {
          windows: {
            focalDay: {
              range: { start: "2026-08-14", end: "2026-08-14" },
              trainingDays: 0,
              sessions: 0,
              setCount: 0,
              volume: 0,
              muscleGroups: [],
            },
            currentWeek: {
              range: { start: "2026-08-10", end: "2026-08-16" },
              trainingDays: 1,
              sessions: 1,
              setCount: 4,
              volume: 200,
              muscleGroups: [],
            },
            priorWeek: {
              range: { start: "2026-08-03", end: "2026-08-09" },
              trainingDays: 0,
              sessions: 0,
              setCount: 0,
              volume: 0,
              muscleGroups: [],
            },
            trailing30Days: {
              range: { start: "2026-07-16", end: "2026-08-14" },
              trainingDays: 1,
              sessions: 1,
              setCount: 4,
              volume: 200,
              muscleGroups: [],
            },
          },
          streak: { currentDays: 0, longestInRange: 1 },
        },
      },
      { username: "hidden", canViewWorkouts: false },
    ]);
    expect(pulse.visibleCount).toBe(2);
    expect(pulse.trainedFocalDay).toBe(1);
    expect(pulse.trainedCurrentWeek).toBe(2);
    expect(pulse.volumeLeader).toEqual({ username: "a", volume: 400 });
    expect(pulse.medianCurrentWeekVolume).toBe(300);
  });
});

describe("compactSets", () => {
  it("groups identical sets", () => {
    expect(
      compactSets([
        { reps: 5, weight: 100, time: null, distance: null },
        { reps: 5, weight: 100, time: null, distance: null },
        { reps: 3, weight: 120, time: null, distance: null },
      ]),
    ).toEqual([
      { reps: 5, weight: 100, time: null, distance: null, count: 2 },
      { reps: 3, weight: 120, time: null, distance: null, count: 1 },
    ]);
  });
});

describe("currentStreak", () => {
  it("stops at the first missing day", () => {
    expect(
      currentStreak("2026-08-14", new Set(["2026-08-14", "2026-08-12"])),
    ).toBe(1);
  });
});
