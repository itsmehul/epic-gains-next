import { describe, expect, it } from "vitest";

import {
  buildImportTargetSets,
  expandImportStructure,
  findSnappedCadenceTimestampsError,
  ImportStructureValidationError,
  parseClockTimestamp,
  parseIntervalPattern,
} from "@/features/workouts/import-structure";
import { importWorkoutStructureSchema } from "@/features/workouts/schemas";

describe("parseClockTimestamp", () => {
  it("parses MM:SS", () => {
    expect(parseClockTimestamp("00:26")).toBe(26);
    expect(parseClockTimestamp("20:41")).toBe(20 * 60 + 41);
    expect(parseClockTimestamp("[01:26]")).toBe(86);
  });
});

describe("parseIntervalPattern", () => {
  it("parses work seconds from interval strings", () => {
    expect(parseIntervalPattern("40s work / 20s rest")).toEqual({
      work_seconds: 40,
    });
    expect(parseIntervalPattern("45s work / 15s rest")).toEqual({
      work_seconds: 45,
    });
    expect(parseIntervalPattern("40s work")).toEqual({
      work_seconds: 40,
    });
  });
});

describe("expandImportStructure", () => {
  it("maps chapter timestamps to contiguous exercise clips", () => {
    const parsed = importWorkoutStructureSchema.parse({
      overview: {
        workout_length: "20 minutes",
        structure: "Full Body Circuit",
        interval_pattern: "45s work / 15s rest",
        equipment_needed: ["None / Bodyweight"],
      },
      sections: [
        {
          section_name: "Full Workout",
          exercises: [
            { name: "Side to side taps", timestamp: "00:26" },
            { name: "Jump + cross chop", timestamp: "01:26" },
            { name: "Run in place", timestamp: "02:26" },
          ],
        },
      ],
    });

    const expanded = expandImportStructure(parsed);

    expect(expanded.exercises).toMatchObject([
      {
        name: "Side to side taps",
        videoStartTime: 26,
        videoEndTime: 86,
        tags: ["Full Workout"],
      },
      {
        name: "Jump + cross chop",
        videoStartTime: 86,
        videoEndTime: 146,
        tags: ["Full Workout"],
      },
      {
        name: "Run in place",
        videoStartTime: 146,
        videoEndTime: 191,
        tags: ["Full Workout"],
      },
    ]);
  });

  it("handles non-standard interval patterns gracefully", () => {
    const parsed = importWorkoutStructureSchema.parse({
      overview: {
        workout_length: "40 minutes",
        structure: "Full Body Beginner Circuit",
        interval_pattern: "4 sets per exercise with 30-40s rest",
        equipment_needed: ["Dumbbells"],
      },
      sections: [
        {
          section_name: "Full Body",
          exercises: [
            { name: "Arm Circles", timestamp: "01:21" },
            { name: "High Knees", timestamp: "03:20" },
          ],
        },
      ],
    });

    const expanded = expandImportStructure(parsed);
    expect(expanded.exercises[0]).toEqual({
      name: "Arm Circles",
      videoStartTime: 81,
      videoEndTime: 200,
      tags: ["Full Body"],
    });
  });

  it("does not treat workout_length as a ceiling for the last chapter", () => {
    const parsed = importWorkoutStructureSchema.parse({
      overview: {
        workout_length: "25 minutes",
        structure: "Full Body HIIT Circuit (No Repeat)",
        interval_pattern: "40s work / 10s rest",
        equipment_needed: ["None"],
      },
      sections: [
        {
          section_name: "Cool Down",
          exercises: [
            { name: "Deep Lunge Left Leg", timestamp: "26:45" },
            { name: "Inhale Exhale", timestamp: "27:25" },
          ],
        },
      ],
    });

    const expanded = expandImportStructure(parsed);
    const lastMove = expanded.exercises.find((item) => item.name === "Inhale Exhale");
    expect(lastMove).toMatchObject({
      name: "Inhale Exhale",
      videoStartTime: 27 * 60 + 25,
      videoEndTime: 27 * 60 + 25 + 40,
    });
  });

  it("skips leftover Rest chapters and spans clips to the next real move", () => {
    const parsed = importWorkoutStructureSchema.parse({
      overview: {
        workout_length: "10 minutes",
        structure: "Circuit",
        interval_pattern: "40s work / 20s rest",
      },
      sections: [
        {
          section_name: "Main",
          exercises: [
            { name: "Push-ups", timestamp: "00:10" },
            { name: "Rest", timestamp: "00:50" },
            { name: "Squats", timestamp: "01:10" },
          ],
        },
      ],
    });

    const expanded = expandImportStructure(parsed);
    expect(expanded.exercises.map((item) => item.name)).toEqual([
      "Push-ups",
      "Squats",
    ]);
    expect(expanded.exercises[0]).toMatchObject({
      name: "Push-ups",
      videoStartTime: 10,
      videoEndTime: 70,
    });
  });

  it("expands suggested_sets and suggested_time into targets", () => {
    const parsed = importWorkoutStructureSchema.parse({
      overview: {
        workout_length: "10 minutes",
        structure: "HIIT",
        interval_pattern: "45s work / 15s rest",
      },
      sections: [
        {
          section_name: "Main",
          exercises: [
            {
              name: "Front to Back Shuffle",
              timestamp: "02:25",
              metric_profile: "BODYWEIGHT_REPS",
              muscle_group: "legs",
              key_muscles: [
                "Gastrocnemius",
                "Soleus",
                "Quadriceps",
                "Gluteus Medius",
              ],
              suggested_sets: 1,
              suggested_time: 45,
            },
          ],
        },
      ],
    });

    const expanded = expandImportStructure(parsed);
    expect(expanded.exercises[0]).toMatchObject({
      name: "Front to Back Shuffle",
      metricProfile: "BODYWEIGHT_REPS",
      muscleGroup: "legs",
      sets: [{ reps: null, weight: null, time: 45, distance: null }],
    });
  });
});

describe("findSnappedCadenceTimestampsError", () => {
  it("rejects a later section snapped to a 60s :00 grid", () => {
    const error = findSnappedCadenceTimestampsError([
      {
        section_name: "Warm Up",
        exercises: [
          { name: "Neck Circles", timestamp: "00:50" },
          { name: "Shoulder Circles", timestamp: "01:25" },
          { name: "Arm Circles", timestamp: "01:58" },
        ],
      },
      {
        section_name: "Upper Body",
        exercises: [
          { name: "Walkout", timestamp: "07:00" },
          { name: "Push-up", timestamp: "08:00" },
          { name: "Burpee", timestamp: "09:00" },
          { name: "Pike Push-up", timestamp: "10:00" },
          { name: "Diamond Push-up", timestamp: "11:00" },
        ],
      },
    ]);
    expect(error).toMatch(/Upper Body/);
    expect(error).toMatch(/07:00, 07:57, 08:58/);
  });

  it("rejects a constant-offset 60s grid", () => {
    const error = findSnappedCadenceTimestampsError([
      {
        section_name: "Upper Body",
        exercises: [
          { name: "Walkout", timestamp: "06:53" },
          { name: "Push-up", timestamp: "07:53" },
          { name: "Burpee", timestamp: "08:53" },
          { name: "Pike Push-up", timestamp: "09:53" },
          { name: "Diamond Push-up", timestamp: "10:53" },
        ],
      },
    ]);
    expect(error).toMatch(/Upper Body/);
    expect(error).toMatch(/07:53/);
  });

  it("allows watched clocks that only look close to a minute", () => {
    expect(
      findSnappedCadenceTimestampsError([
        {
          section_name: "Upper Body",
          exercises: [
            { name: "Walkout", timestamp: "07:00" },
            { name: "Push-up", timestamp: "07:57" },
            { name: "Burpee", timestamp: "08:58" },
            { name: "Pike Push-up", timestamp: "09:58" },
            { name: "Diamond Push-up", timestamp: "10:58" },
          ],
        },
      ]),
    ).toBeUndefined();
  });

  it("rejects expand when a section is a synthetic grid", () => {
    expect(() =>
      expandImportStructure({
        overview: {
          workout_length: "45 minutes",
          interval_pattern: "30s work / 30s rest",
        },
        sections: [
          {
            section_name: "Upper Body",
            exercises: [
              { name: "Walkout", timestamp: "07:00" },
              { name: "Push-up", timestamp: "08:00" },
              { name: "Burpee", timestamp: "09:00" },
              { name: "Pike", timestamp: "10:00" },
              { name: "Diamond", timestamp: "11:00" },
            ],
          },
        ],
      }),
    ).toThrow(ImportStructureValidationError);
  });
});

describe("buildImportTargetSets", () => {
  it("uses suggested metrics over clip fallback", () => {
    expect(
      buildImportTargetSets(
        { suggested_sets: 1, suggested_time: 45 },
        60,
      ),
    ).toEqual([{ reps: null, weight: null, time: 45, distance: null }]);
  });

  it("falls back to clip duration when suggestions are missing", () => {
    expect(buildImportTargetSets({}, 60)).toEqual([
      { reps: null, weight: null, time: 60, distance: null },
    ]);
  });
});
