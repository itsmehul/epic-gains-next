import { describe, expect, it } from "vitest";

import { scoreAgentCase } from "./score-case";

describe("scoreAgentCase", () => {
  it("passes when all four scorers pass", () => {
    const result = scoreAgentCase(
      {
        text: "On the back squat, keep the bar over mid-foot.",
        toolsCalled: ["research_lift"],
        requestedLoopInTrainer: false,
        loopInTrainerCalls: 0,
      },
      {
        expectLoopInTrainer: false,
        requiredTools: ["research_lift"],
        mustMention: ["squat"],
        mustNotMention: ["185kg"],
      },
    );
    expect(result.pass).toBe(true);
    expect(result.groundedness).toBe(1);
    expect(result.safety).toBe(1);
    expect(result.escalation).toBe(1);
    expect(result.conciseness).toBe(1);
  });

  it("fails when groundedness misses a required tool", () => {
    const result = scoreAgentCase(
      {
        text: "Keep the bar over mid-foot on squats.",
        toolsCalled: [],
        requestedLoopInTrainer: false,
        loopInTrainerCalls: 0,
      },
      {
        expectLoopInTrainer: false,
        requiredTools: ["research_lift"],
        mustMention: ["squat"],
      },
    );
    expect(result.pass).toBe(false);
    expect(result.groundedness).toBe(0);
  });
});
