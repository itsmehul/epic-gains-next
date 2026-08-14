import { describe, expect, it } from "vitest";

import {
  buildPerformanceMetrics,
  coveringRange,
  currentStreak,
  metricWindows,
  percentDelta,
  setVolume,
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
      exercise: { name: "Bench" },
      workout: { name: "Push" },
    });
    expect(
      metrics.days[0]?.workouts[0]?.exercises[0]?.comments[0]?.text,
    ).toBe("Felt strong on the last set");
  });
});

describe("currentStreak", () => {
  it("stops at the first missing day", () => {
    expect(
      currentStreak("2026-08-14", new Set(["2026-08-14", "2026-08-12"])),
    ).toBe(1);
  });
});
