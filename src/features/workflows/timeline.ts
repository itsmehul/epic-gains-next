export type WorkflowTimelineEntry = {
  output?: unknown;
  timestamp?: string | Date;
};

export type WorkflowStepStatus =
  | "completed"
  | "running"
  | "waiting"
  | "pending"
  | "failed";

export type ParsedWorkflowStep = {
  id: string;
  label: string;
  status: WorkflowStepStatus;
  output?: unknown;
  timestamp?: Date;
};

function toDate(value: string | Date | undefined) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function stepStatus({
  stepId,
  currentStepId,
  hasOutput,
  runStatus,
}: {
  stepId: string;
  currentStepId: string;
  hasOutput: boolean;
  runStatus: string;
}): WorkflowStepStatus {
  if (hasOutput) return "completed";
  if (runStatus === "failed" && stepId === currentStepId) return "failed";
  if (stepId === currentStepId) {
    return runStatus === "paused" ? "waiting" : "running";
  }
  return "pending";
}

export function parseWorkflowTimeline({
  timeline,
  currentStepId,
  runStatus,
}: {
  timeline: Record<string, unknown>;
  currentStepId: string;
  runStatus: string;
}): ParsedWorkflowStep[] {
  const steps: ParsedWorkflowStep[] = [];

  for (const [key, raw] of Object.entries(timeline)) {
    const entry = raw as WorkflowTimelineEntry;
    if (!entry || typeof entry !== "object") continue;

    steps.push({
      id: key,
      label: key,
      status: stepStatus({
        stepId: key,
        currentStepId,
        hasOutput: entry.output !== undefined,
        runStatus,
      }),
      output: entry.output,
      timestamp: toDate(entry.timestamp),
    });
  }

  return steps.sort((left, right) => {
    if (!left.timestamp && !right.timestamp) return 0;
    if (!left.timestamp) return 1;
    if (!right.timestamp) return -1;
    return left.timestamp.getTime() - right.timestamp.getTime();
  });
}

export function countCompletedTimelineSteps(timeline: Record<string, unknown>) {
  return Object.values(timeline).filter(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      "output" in entry &&
      entry.output !== undefined,
  ).length;
}
