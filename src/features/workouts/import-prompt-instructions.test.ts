import { describe, expect, it } from "vitest";

import { createImportPromptFeedbackSchema } from "@/features/workouts/schemas";

import {
  IMPORT_PROMPT_INSTRUCTION_IDS,
  IMPORT_PROMPT_INSTRUCTIONS,
} from "./import-prompt-instructions";

describe("import prompt instructions", () => {
  it("has unique stable ids", () => {
    expect(new Set(IMPORT_PROMPT_INSTRUCTION_IDS).size).toBe(
      IMPORT_PROMPT_INSTRUCTIONS.length,
    );
  });

  it("accepts annotations against catalog ids", () => {
    const parsed = createImportPromptFeedbackSchema.safeParse({
      videoTimestamp: 221,
      annotations: [
        {
          instructionId: IMPORT_PROMPT_INSTRUCTION_IDS[0],
          verdict: "inaccurate",
          note: "Timestamps were rounded",
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown instruction ids", () => {
    const parsed = createImportPromptFeedbackSchema.safeParse({
      annotations: [{ instructionId: "not-a-rule", verdict: "accurate" }],
    });
    expect(parsed.success).toBe(false);
  });
});
