import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { runBaselineEvalTrial } from "./baseline";
import { loadAgentEvalCases, type AgentEvalCase } from "./cases";
import { metricPassRate, scoreAgentCase, type AgentCaseScore } from "./score-case";
import type { AgentEvalOutputs } from "./score-agent";
import { runAgentEvalTrial } from "./trial";

export type AgentCompareCaseResult = {
  id: string;
  comment: string;
  baseline: {
    outputs: AgentEvalOutputs;
    score: AgentCaseScore;
  };
  agent: {
    outputs: AgentEvalOutputs;
    score: AgentCaseScore;
  };
};

export type AgentCompareSummary = {
  model: string;
  runAt: string;
  caseCount: number;
  baseline: {
    casesPassed: number;
    groundedness: number;
    safety: number;
    escalation: number;
    conciseness: number;
  };
  agent: {
    casesPassed: number;
    groundedness: number;
    safety: number;
    escalation: number;
    conciseness: number;
  };
  cases: AgentCompareCaseResult[];
};

const TRAJECTORY_ROOT = path.join(process.cwd(), "evals/agent/trajectories");
const RESULTS_FILE = path.join(process.cwd(), "evals/agent/results/latest.json");

function writeTrajectory(
  mode: "baseline" | "agent",
  item: AgentEvalCase,
  outputs: AgentEvalOutputs,
  score: AgentCaseScore,
) {
  const dir = path.join(TRAJECTORY_ROOT, mode);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, `${item.id}.json`),
    `${JSON.stringify(
      {
        id: item.id,
        comment: item.inputs.comment,
        reference: item.outputs,
        outputs,
        score,
      },
      null,
      2,
    )}\n`,
  );
}

function summarize(
  rows: Array<{ score: AgentCaseScore }>,
): AgentCompareSummary["baseline"] {
  return {
    casesPassed: rows.filter((row) => row.score.pass).length,
    groundedness: metricPassRate(rows, "groundedness"),
    safety: metricPassRate(rows, "safety"),
    escalation: metricPassRate(rows, "escalation"),
    conciseness: metricPassRate(rows, "conciseness"),
  };
}

function formatRate(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function printCompareTable(summary: AgentCompareSummary) {
  console.log("\n## Trainer agent vs baseline\n");
  console.log("| Metric | Simple baseline | Agent solution | Change |");
  console.log("| --- | --- | --- | --- |");
  console.log(
    `| Primary: cases passed (all 4 checks) | ${summary.baseline.casesPassed}/${summary.caseCount} | ${summary.agent.casesPassed}/${summary.caseCount} | +${summary.agent.casesPassed - summary.baseline.casesPassed} |`,
  );
  console.log(
    `| Groundedness | ${formatRate(summary.baseline.groundedness)} | ${formatRate(summary.agent.groundedness)} | ${formatRate(summary.agent.groundedness - summary.baseline.groundedness)} |`,
  );
  console.log(
    `| Safety | ${formatRate(summary.baseline.safety)} | ${formatRate(summary.agent.safety)} | ${formatRate(summary.agent.safety - summary.baseline.safety)} |`,
  );
  console.log(
    `| Escalation correctness | ${formatRate(summary.baseline.escalation)} | ${formatRate(summary.agent.escalation)} | ${formatRate(summary.agent.escalation - summary.baseline.escalation)} |`,
  );
  console.log(
    `| Conciseness | ${formatRate(summary.baseline.conciseness)} | ${formatRate(summary.agent.conciseness)} | ${formatRate(summary.agent.conciseness - summary.baseline.conciseness)} |`,
  );
  console.log(`\nTrajectories: ${TRAJECTORY_ROOT}`);
  console.log(`Results: ${RESULTS_FILE}`);
}

export async function runAgentLocalEval(options: {
  model: string;
  caseId?: string;
  compareBaseline?: boolean;
}): Promise<boolean> {
  const compareBaseline = options.compareBaseline ?? true;
  const cases = loadAgentEvalCases().filter(
    (item) => !options.caseId || item.id === options.caseId,
  );
  if (cases.length === 0) {
    throw new Error(
      `No agent cases${options.caseId ? ` matching ${options.caseId}` : ""}`,
    );
  }

  const caseResults: AgentCompareCaseResult[] = [];

  for (const item of cases) {
    console.log(`\n== agent ${item.id} ==`);

    let baselineOutputs: AgentEvalOutputs | undefined;
    let baselineScore: AgentCaseScore | undefined;

    if (compareBaseline) {
      console.log("  baseline…");
      baselineOutputs = await runBaselineEvalTrial(item, options.model);
      baselineScore = scoreAgentCase(baselineOutputs, item.outputs);
      writeTrajectory("baseline", item, baselineOutputs, baselineScore);
      console.log(
        `  baseline ${baselineScore.pass ? "PASS" : "FAIL"}  grounded=${baselineScore.groundedness} safety=${baselineScore.safety} escalation=${baselineScore.escalation} concise=${baselineScore.conciseness}`,
      );
      if (!baselineScore.pass) {
        for (const check of baselineScore.checks.filter((row) => !row.pass)) {
          console.log(`    - ${check.id}: ${check.detail}`);
        }
      }
    }

    console.log("  agent…");
    const agentOutputs = await runAgentEvalTrial(item, options.model);
    const agentScore = scoreAgentCase(agentOutputs, item.outputs);
    writeTrajectory("agent", item, agentOutputs, agentScore);
    console.log(
      `  agent ${agentScore.pass ? "PASS" : "FAIL"}  grounded=${agentScore.groundedness} safety=${agentScore.safety} escalation=${agentScore.escalation} concise=${agentScore.conciseness}  tools=[${(agentOutputs.toolsCalled ?? []).join(", ")}]`,
    );
    if (!agentScore.pass) {
      for (const check of agentScore.checks.filter((row) => !row.pass)) {
        console.log(`    - ${check.id}: ${check.detail}`);
      }
    }

    caseResults.push({
      id: item.id,
      comment: item.inputs.comment,
      baseline: {
        outputs: baselineOutputs ?? {
          text: "",
          toolsCalled: [],
          requestedLoopInTrainer: false,
          loopInTrainerCalls: 0,
        },
        score: baselineScore ?? {
          pass: false,
          groundedness: 0,
          safety: 0,
          escalation: 0,
          conciseness: 0,
          checks: [],
        },
      },
      agent: {
        outputs: agentOutputs,
        score: agentScore,
      },
    });
  }

  const baselineRows = caseResults.map((row) => ({ score: row.baseline.score }));
  const agentRows = caseResults.map((row) => ({ score: row.agent.score }));

  const summary: AgentCompareSummary = {
    model: options.model,
    runAt: new Date().toISOString(),
    caseCount: caseResults.length,
    baseline: summarize(baselineRows),
    agent: summarize(agentRows),
    cases: caseResults,
  };

  mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
  writeFileSync(RESULTS_FILE, `${JSON.stringify(summary, null, 2)}\n`);

  printCompareTable(summary);

  const agentPassed = summary.agent.casesPassed;
  console.log(`\nagent ${agentPassed}/${summary.caseCount} passed`);
  return agentPassed === summary.caseCount;
}
