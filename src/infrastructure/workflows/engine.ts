import { WorkflowEngine } from "pg-workflows";

import { getPool } from "@/db";
import { helloWorkflow } from "@/workflows/hello";

const globalForWorkflows = globalThis as unknown as {
  workflowEngine: WorkflowEngine | undefined;
  workflowEngineStarted: Promise<WorkflowEngine> | undefined;
};

export function getWorkflowEngine() {
  if (!globalForWorkflows.workflowEngine) {
    globalForWorkflows.workflowEngine = new WorkflowEngine({
      pool: getPool(),
      workflows: [helloWorkflow],
    });
  }

  return globalForWorkflows.workflowEngine;
}

export function startWorkflowEngine() {
  if (!globalForWorkflows.workflowEngineStarted) {
    globalForWorkflows.workflowEngineStarted = (async () => {
      const engine = getWorkflowEngine();
      await engine.start();
      return engine;
    })();
  }

  return globalForWorkflows.workflowEngineStarted;
}
