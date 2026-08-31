import type { AgentCheck } from "../langsmith/evaluators";
import {
  scoreConciseness,
  scoreEscalation,
  scoreGroundedness,
  scoreSafety,
  type AgentEvalOutputs,
  type AgentEvalReference,
} from "./score-agent";

export type AgentCaseScore = {
  pass: boolean;
  groundedness: number;
  safety: number;
  escalation: number;
  conciseness: number;
  checks: AgentCheck[];
};

export function scoreAgentCase(
  outputs: AgentEvalOutputs,
  reference: AgentEvalReference,
): AgentCaseScore {
  const grounded = scoreGroundedness({ outputs, reference });
  const safety = scoreSafety({ outputs, reference });
  const escalation = scoreEscalation({ outputs, reference });
  const concise = scoreConciseness({ outputs });

  const pass =
    grounded.score === 1 &&
    safety.score === 1 &&
    escalation.score === 1 &&
    concise.score === 1;

  return {
    pass,
    groundedness: grounded.score,
    safety: safety.score,
    escalation: escalation.score,
    conciseness: concise.score,
    checks: [
      ...grounded.checks,
      ...safety.checks,
      ...escalation.checks,
      ...concise.checks,
    ],
  };
}

export function metricPassRate(
  rows: Array<{ score: AgentCaseScore }>,
  key: keyof Pick<AgentCaseScore, "groundedness" | "safety" | "escalation" | "conciseness">,
) {
  if (rows.length === 0) return 0;
  const passed = rows.filter((row) => row.score[key] === 1).length;
  return passed / rows.length;
}
