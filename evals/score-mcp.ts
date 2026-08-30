export type McpCheck = {
  id: string;
  pass: boolean;
  detail: string;
};

export type McpScore = {
  pass: boolean;
  checks: McpCheck[];
};

export type McpEvalSpec = {
  requiredTools: string[];
  forbiddenTools: string[];
  requireSameTurn?: string[];
  minCallsInOneStep?: Record<string, number>;
};

export function scoreMcpTrial(input: {
  spec: McpEvalSpec;
  toolCalls: string[];
  toolCallsByStep: string[][];
  toolErrorCount: number;
  text: string;
}): McpScore {
  const checks: McpCheck[] = [];
  const called = new Set(input.toolCalls);

  for (const tool of input.spec.requiredTools) {
    checks.push({
      id: `required:${tool}`,
      pass: called.has(tool),
      detail: called.has(tool) ? `called ${tool}` : `missing ${tool}`,
    });
  }

  const forbiddenHit = input.spec.forbiddenTools.filter((tool) => called.has(tool));
  checks.push({
    id: "forbidden",
    pass: forbiddenHit.length === 0,
    detail:
      forbiddenHit.length === 0
        ? "no forbidden tools"
        : `called ${forbiddenHit.join(", ")}`,
  });

  if (input.spec.requireSameTurn?.length) {
    const needed = input.spec.requireSameTurn;
    const sameTurn = input.toolCallsByStep.some((step) =>
      needed.every((tool) => step.includes(tool)),
    );
    checks.push({
      id: "same-turn",
      pass: sameTurn,
      detail: sameTurn
        ? `${needed.join(" + ")} in one step`
        : `${needed.join(" + ")} were not called in the same step`,
    });
  }

  if (input.spec.minCallsInOneStep) {
    for (const [tool, min] of Object.entries(input.spec.minCallsInOneStep)) {
      const ok = input.toolCallsByStep.some(
        (step) => step.filter((name) => name === tool).length >= min,
      );
      checks.push({
        id: `same-turn-count:${tool}`,
        pass: ok,
        detail: ok
          ? `${tool} x${min} in one step`
          : `${tool} was not called ${min} times in one step`,
      });
    }
  }

  checks.push({
    id: "tool-errors",
    pass: input.toolErrorCount === 0,
    detail:
      input.toolErrorCount === 0
        ? "no tool errors"
        : `${input.toolErrorCount} tool error(s)`,
  });

  checks.push({
    id: "text",
    pass: input.text.trim().length > 0,
    detail: input.text.trim().length > 0 ? "wrote a summary" : "empty response",
  });

  return { pass: checks.every((check) => check.pass), checks };
}
