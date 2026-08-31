import { describe, expect, it } from "vitest";

import {
  escalationAskText,
  loopInTrainerApprovalRequest,
  publicTrainerEscalation,
} from "@/features/agent/escalation";

describe("escalation helpers", () => {
  it("asks the athlete before pinging", () => {
    expect(
      escalationAskText({
        preview: "Check form on the last set.",
        trainers: [{ name: "Maya", username: "maya" }],
      }),
    ).toContain("Approve to notify them");
  });

  it("extracts a loop_in_trainer approval request", () => {
    expect(
      loopInTrainerApprovalRequest([
        {
          type: "tool-approval-request",
          approvalId: "a1",
          toolCall: {
            toolName: "loop_in_trainer",
            input: { message: "Please check her knee." },
          },
        },
      ]),
    ).toEqual({
      approvalId: "a1",
      preview: "Please check her knee.",
    });
  });

  it("strips resume messages from public escalation", () => {
    expect(
      publicTrainerEscalation({
        trainerEscalation: {
          approvalId: "a1",
          state: "pending",
          preview: "hi",
          trainers: [],
          messages: [{ role: "user", content: "secret" }],
        },
      }),
    ).toEqual({
      approvalId: "a1",
      state: "pending",
      preview: "hi",
      trainers: [],
    });
  });
});
