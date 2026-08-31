import type { ModelMessage } from "ai";

export type AgentEvalStep = {
  toolName: string;
  inputPreview: string;
  outputPreview: string;
};

export function priorDeniedMessages(comment: string): ModelMessage[] {
  return [
    {
      role: "user",
      content: "Sharp pain on the squat — loop in my coach.",
    },
    {
      role: "assistant",
      content:
        "I can loop in Maya. They would see a short relay about the squat pain. Approve to notify them, or skip to keep this between us.",
    },
    {
      role: "user",
      content: comment,
    },
  ];
}

export function caseMessages(input: {
  comment: string;
  deniedPriorPing?: boolean;
}): ModelMessage[] {
  return input.deniedPriorPing
    ? priorDeniedMessages(input.comment)
    : [{ role: "user", content: input.comment }];
}

export function previewValue(value: unknown, maxLen = 200): string {
  if (value == null) return "";
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return str.length > maxLen ? `${str.slice(0, maxLen)}…` : str;
}

export function toolNamesFromSteps(
  steps: Array<{ toolCalls?: Array<{ toolName: string }> }>,
) {
  const names: string[] = [];
  for (const step of steps) {
    for (const call of step.toolCalls ?? []) names.push(call.toolName);
  }
  return names;
}

export function extractTrajectory(
  steps: Array<{
    toolCalls?: Array<{ toolName: string; input?: unknown }>;
    toolResults?: Array<{ toolName: string; output?: unknown }>;
  }>,
): AgentEvalStep[] {
  const trajectory: AgentEvalStep[] = [];
  for (const step of steps) {
    for (const call of step.toolCalls ?? []) {
      const toolResult = step.toolResults?.find(
        (row) => row.toolName === call.toolName,
      );
      trajectory.push({
        toolName: call.toolName,
        inputPreview: previewValue(call.input),
        outputPreview: previewValue(toolResult?.output),
      });
    }
  }
  return trajectory;
}
