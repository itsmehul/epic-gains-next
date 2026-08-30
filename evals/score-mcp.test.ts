import { describe, expect, it } from "vitest";

import { TASK_EVAL_SPEC } from "./mcp/trial";
import { scoreMcpTrial } from "./score-mcp";

describe("scoreMcpTrial", () => {
  it("passes a correct friends progress trajectory", () => {
    const score = scoreMcpTrial({
      spec: TASK_EVAL_SPEC.friends_progress,
      toolCalls: ["following_performance_metrics"],
      toolCallsByStep: [["following_performance_metrics"]],
      toolErrorCount: 0,
      text: "Nitin: volume up, 4-day streak.",
    });
    expect(score.pass).toBe(true);
  });

  it("fails when 1v1 skips the second performance_metrics call", () => {
    const score = scoreMcpTrial({
      spec: TASK_EVAL_SPEC.compare_1v1,
      toolCalls: ["performance_metrics"],
      toolCallsByStep: [["performance_metrics"]],
      toolErrorCount: 0,
      text: "You lifted more.",
    });
    expect(score.pass).toBe(false);
    expect(
      score.checks.some(
        (check) => check.id === "same-turn-count:performance_metrics" && !check.pass,
      ),
    ).toBe(true);
  });

  it("fails forbidden tools on the friends recap", () => {
    const score = scoreMcpTrial({
      spec: TASK_EVAL_SPEC.check_friends,
      toolCalls: ["following_performance_metrics", "list_following"],
      toolCallsByStep: [["following_performance_metrics", "list_following"]],
      toolErrorCount: 0,
      text: "Here are your friends.",
    });
    expect(score.pass).toBe(false);
  });
});
