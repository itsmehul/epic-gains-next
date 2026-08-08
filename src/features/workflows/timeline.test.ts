import { describe, expect, it } from "vitest";

import { parseWorkflowTimeline } from "@/features/workflows/timeline";
import { getInvocableWorkflowMeta } from "@/features/workflows/invocable";

describe("hello workflow scaffold", () => {
  it("exposes hello as the only invocable workflow", () => {
    const meta = getInvocableWorkflowMeta();
    expect(meta).toHaveLength(1);
    expect(meta[0]?.id).toBe("hello");
  });

  it("parses timeline steps for display", () => {
    const steps = parseWorkflowTimeline({
      timeline: {
        greet: { output: "Hello, World!", timestamp: "2026-01-01T00:00:00.000Z" },
      },
      currentStepId: "greet",
      runStatus: "completed",
    });

    expect(steps).toHaveLength(1);
    expect(steps[0]?.status).toBe("completed");
    expect(steps[0]?.output).toBe("Hello, World!");
  });
});
