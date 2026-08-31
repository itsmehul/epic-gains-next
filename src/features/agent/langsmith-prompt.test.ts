import { describe, expect, it } from "vitest";

import {
  chatPromptManifest,
  extractPrimaryTemplate,
} from "./langsmith-prompt";

describe("prompt hub manifests", () => {
  it("round-trips a system template", () => {
    const template = "You are the trainer.";
    const manifest = chatPromptManifest({
      name: "trainer-agent",
      description: "test",
      tags: ["agent"],
      role: "system",
      template,
      inputVariables: [],
    });
    expect(extractPrimaryTemplate(manifest)).toBe(template);
  });
});
