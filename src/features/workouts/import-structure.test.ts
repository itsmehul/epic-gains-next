import { describe, expect, it } from "vitest";

import {
  expandImportStructure,
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
  it("parses work/rest seconds", () => {
    expect(parseIntervalPattern("40s work / 20s rest")).toEqual({
      work_seconds: 40,
      rest_seconds: 20,
    });
    expect(parseIntervalPattern("45s work / 15s rest")).toEqual({
      work_seconds: 45,
      rest_seconds: 15,
    });
  });
});

describe("expandImportStructure", () => {
  it("maps work/rest intervals from chapter timestamps", () => {
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

    expect(expanded.exercises.slice(0, 4)).toEqual([
      {
        name: "Side to side taps",
        videoStartTime: 26,
        videoEndTime: 71,
        tags: ["Full Workout"],
      },
      {
        name: "Rest",
        videoStartTime: 71,
        videoEndTime: 86,
        tags: ["Full Workout", "rest"],
      },
      {
        name: "Jump + cross chop",
        videoStartTime: 86,
        videoEndTime: 131,
        tags: ["Full Workout"],
      },
      {
        name: "Rest",
        videoStartTime: 131,
        videoEndTime: 146,
        tags: ["Full Workout", "rest"],
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
});
