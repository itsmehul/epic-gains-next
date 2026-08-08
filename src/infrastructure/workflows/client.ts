import "server-only";

import { WorkflowClient } from "pg-workflows/client";

import { getPool } from "@/db";

let client: WorkflowClient | null = null;
let clientStartPromise: Promise<WorkflowClient> | null = null;

export async function getWorkflowClient(): Promise<WorkflowClient> {
  if (client) {
    return client;
  }

  if (!clientStartPromise) {
    clientStartPromise = (async () => {
      const workflowClient = new WorkflowClient({
        pool: getPool(),
      });
      await workflowClient.start();
      client = workflowClient;
      return workflowClient;
    })();
  }

  return clientStartPromise;
}
