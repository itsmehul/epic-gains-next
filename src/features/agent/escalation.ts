export type PublicTrainerEscalation = {
  approvalId: string;
  state: "pending" | "approved" | "denied";
  preview: string;
  trainers: Array<{ username: string; name: string }>;
};

export function loopInTrainerApprovalRequest(content: unknown[]) {
  for (const part of content) {
    if (typeof part !== "object" || part == null || !("type" in part)) continue;
    if (part.type !== "tool-approval-request") continue;
    const request = part as {
      type: "tool-approval-request";
      approvalId: string;
      isAutomatic?: boolean;
      toolCall: { toolName: string; input: unknown };
    };
    if (request.isAutomatic) continue;
    if (request.toolCall.toolName !== "loop_in_trainer") continue;
    const input = request.toolCall.input;
    const preview =
      input &&
      typeof input === "object" &&
      "message" in input &&
      typeof input.message === "string"
        ? input.message
        : "";
    if (!preview) continue;
    return { approvalId: request.approvalId, preview };
  }
  return null;
}

export function publicTrainerEscalation(
  meta: { trainerEscalation?: PublicTrainerEscalation & { messages?: unknown } } | null | undefined,
): PublicTrainerEscalation | null {
  const escalation = meta?.trainerEscalation;
  if (!escalation) return null;
  return {
    approvalId: escalation.approvalId,
    state: escalation.state,
    preview: escalation.preview,
    trainers: escalation.trainers,
  };
}

export function escalationAskText(options: {
  modelText?: string;
  preview: string;
  trainers: Array<{ name: string; username: string }>;
}) {
  const who =
    options.trainers.length > 0
      ? options.trainers
          .map((trainer) => trainer.name || `@${trainer.username}`)
          .join(", ")
      : "your trainer";
  const ask = `I can loop in ${who}. They would see this:\n\n${options.preview}\n\nApprove to notify them, or skip to keep this between us.`;
  const lead =
    options.modelText?.trim() ||
    "Stop the lift if this is a pop or sharp pain. See a doctor or physical therapist before loading again.";
  return `${lead}\n\n${ask}`;
}
