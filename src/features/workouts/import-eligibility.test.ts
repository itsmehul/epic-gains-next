import { describe, expect, it } from "vitest";

import { generateYoutubeImportPrompt } from "@/features/workouts/import-prompt";
import { importRejectionSchema } from "@/features/workouts/schemas";

describe("importRejectionSchema", () => {
  it("accepts a playback refusal", () => {
    const parsed = importRejectionSchema.parse({
      rejected: true,
      reason: "This video doesn't allow playback, so it can't be imported.",
    });
    expect(parsed.rejected).toBe(true);
  });

  it("rejects a workout payload", () => {
    expect(
      importRejectionSchema.safeParse({
        workoutName: "HIIT",
        overview: { workout_length: "20", interval_pattern: "60s" },
        sections: [],
      }).success,
    ).toBe(false);
  });
});

describe("generateYoutubeImportPrompt", () => {
  it("includes eligibility refusal rules", () => {
    const prompt = generateYoutubeImportPrompt(
      "https://www.youtube.com/watch?v=38z61KcalV4",
    );
    expect(prompt).toContain("Unstructured dance");
    expect(prompt).toContain('"rejected": true');
    expect(prompt).toContain("Never round to the nearest");
    expect(prompt).not.toContain("lock to this underlying interval grid");
  });
});
