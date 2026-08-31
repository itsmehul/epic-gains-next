import { readFileSync } from "node:fs";
import path from "node:path";

export const AGENT_EVAL_DATASET = "trainer-agent-comments";
export const AGENT_EVAL_PROJECT = "test";
export const LANGSMITH_API_URL = "https://apac.api.smith.langchain.com";

export type AgentEvalCase = {
  id: string;
  inputs: {
    comment: string;
    exerciseSelected: boolean;
    deniedPriorPing?: boolean;
    catalogOnlyMuscle?: boolean;
    trainers: Array<{ username: string; name: string }>;
  };
  outputs: {
    expectLoopInTrainer: boolean;
    requiredTools?: string[];
    mustMention?: string[];
    mustNotMention?: string[];
    requireProfessionalCare?: boolean;
    requireYouTubeCite?: boolean;
  };
};

export function loadAgentEvalCases(): AgentEvalCase[] {
  const file = path.join(process.cwd(), "evals/agent/cases.json");
  return JSON.parse(readFileSync(file, "utf8")) as AgentEvalCase[];
}

export function langsmithExamples(cases: AgentEvalCase[]) {
  return cases.map((item) => ({
    inputs: { id: item.id, ...item.inputs },
    outputs: item.outputs,
  }));
}
