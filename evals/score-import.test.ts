import { describe, expect, it } from "vitest";

import {
  UNSTRUCTURED_DANCE_REJECT_REASON,
  VIDEO_PLAYBACK_REJECT_REASON,
} from "@/features/workouts/import-eligibility";

import { scoreImportOutput } from "./score-import";

describe("scoreImportOutput", () => {
  it("passes a matching playback rejection", () => {
    const score = scoreImportOutput({
      text: `\`\`\`json\n${JSON.stringify({
        rejected: true,
        reason: VIDEO_PLAYBACK_REJECT_REASON,
      })}\n\`\`\``,
      expected: { rejected: true, reason: VIDEO_PLAYBACK_REJECT_REASON },
    });
    expect(score.pass).toBe(true);
  });

  it("fails when a dance video is imported as exercises", () => {
    const score = scoreImportOutput({
      text: JSON.stringify({
        overview: {
          workout_length: "10 minutes",
          interval_pattern: "continuous",
        },
        sections: [
          {
            section_name: "Dance",
            exercises: [{ name: "Hip roll", timestamp: "00:10" }],
          },
        ],
      }),
      expected: { rejected: true, reason: UNSTRUCTURED_DANCE_REJECT_REASON },
    });
    expect(score.pass).toBe(false);
    expect(score.checks.some((check) => check.id === "rejected" && !check.pass)).toBe(
      true,
    );
  });

  it("scores accepted exercise JSON by name and timestamp", () => {
    const expected = {
      overview: {
        workout_length: "20 minutes",
        interval_pattern: "45s work / 15s rest",
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
    };
    const score = scoreImportOutput({
      text: JSON.stringify({
        overview: expected.overview,
        sections: [
          {
            section_name: "Full Workout",
            exercises: [
              { name: "Side-to-side taps", timestamp: "00:27" },
              { name: "Jump + cross chop", timestamp: "01:26" },
              { name: "Run in place", timestamp: "02:28" },
            ],
          },
        ],
      }),
      expected,
    });
    expect(score.pass).toBe(true);
  });
});
