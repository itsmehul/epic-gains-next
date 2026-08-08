import "server-only";

import type { WorkflowRun } from "pg-workflows/client";
import {
  WorkflowRunNotFoundError,
  WorkflowStatus,
} from "pg-workflows/client";

import { getPool } from "@/db";

type WorkflowRunRow = Record<string, unknown>;

export type WorkflowRunSummary = Pick<
  WorkflowRun,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "resourceId"
  | "workflowId"
  | "status"
  | "currentStepId"
  | "error"
  | "retryCount"
  | "maxRetries"
  | "jobId"
> & {
  userEmail: string | null;
};

export type WorkflowRunProgress = WorkflowRun & {
  completedSteps: number;
  totalSteps: number;
  completionPercentage: number;
};

export type ListWorkflowRunsResult = {
  items: WorkflowRunSummary[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  hasPrev: boolean;
};

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function mapRowToWorkflowRun(row: WorkflowRunRow): WorkflowRun {
  return {
    id: String(row.id),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
    resourceId: (row.resource_id as string | null) ?? null,
    workflowId: String(row.workflow_id),
    status: row.status as WorkflowRun["status"],
    input: parseJsonValue(row.input),
    output: row.output == null ? null : parseJsonValue(row.output),
    error: (row.error as string | null) ?? null,
    currentStepId: String(row.current_step_id ?? ""),
    timeline:
      typeof row.timeline === "string"
        ? (JSON.parse(row.timeline) as Record<string, unknown>)
        : ((row.timeline as Record<string, unknown>) ?? {}),
    pausedAt: row.paused_at ? new Date(String(row.paused_at)) : null,
    resumedAt: row.resumed_at ? new Date(String(row.resumed_at)) : null,
    completedAt: row.completed_at ? new Date(String(row.completed_at)) : null,
    timeoutAt: row.timeout_at ? new Date(String(row.timeout_at)) : null,
    retryCount: Number(row.retry_count ?? 0),
    maxRetries: Number(row.max_retries ?? 0),
    priority: Number(row.priority ?? 0),
    jobId: (row.job_id as string | null) ?? null,
    idempotencyKey: (row.idempotency_key as string | null) ?? null,
    parentRunId: (row.parent_run_id as string | null) ?? null,
    parentStepId: (row.parent_step_id as string | null) ?? null,
    parentResourceId: (row.parent_resource_id as string | null) ?? null,
    scheduledAt: row.scheduled_at ? new Date(String(row.scheduled_at)) : null,
  };
}

function mapRowToWorkflowRunSummary(row: WorkflowRunRow): WorkflowRunSummary {
  return {
    id: String(row.id),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
    resourceId: (row.resource_id as string | null) ?? null,
    workflowId: String(row.workflow_id),
    status: row.status as WorkflowRun["status"],
    currentStepId: String(row.current_step_id ?? ""),
    error: (row.error as string | null) ?? null,
    retryCount: Number(row.retry_count ?? 0),
    maxRetries: Number(row.max_retries ?? 0),
    jobId: (row.job_id as string | null) ?? null,
    userEmail: (row.user_email as string | null) ?? null,
  };
}

function countCompletedTimelineSteps(timeline: Record<string, unknown>) {
  return Object.values(timeline).filter(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      "output" in entry &&
      entry.output !== undefined,
  ).length;
}

const WORKFLOW_RUN_SUMMARY_SELECT_SQL = `
  wr.id,
  wr.created_at,
  wr.updated_at,
  wr.resource_id,
  wr.workflow_id,
  wr.status,
  wr.current_step_id,
  wr.error,
  wr.retry_count,
  wr.max_retries,
  wr.job_id,
  u.email AS user_email
`;

const WORKFLOW_RUN_SUMMARY_JOINS_SQL = `
  FROM workflow_runs wr
  LEFT JOIN "user" u
    ON u.id = COALESCE(
      NULLIF(wr.input->>'userId', ''),
      wr.resource_id
    )
`;

export async function getWorkflowRun(input: {
  runId: string;
  resourceId?: string;
}): Promise<WorkflowRun> {
  const pool = getPool();
  const result = input.resourceId
    ? await pool.query(
        `SELECT * FROM workflow_runs
         WHERE id = $1 AND resource_id = $2`,
        [input.runId, input.resourceId],
      )
    : await pool.query(`SELECT * FROM workflow_runs WHERE id = $1`, [
        input.runId,
      ]);

  const row = result.rows[0];
  if (!row) {
    throw new WorkflowRunNotFoundError(input.runId, undefined);
  }

  return mapRowToWorkflowRun(row);
}

export async function getWorkflowRunSummary(input: {
  runId: string;
  resourceId?: string;
}): Promise<WorkflowRunSummary> {
  const pool = getPool();
  const conditions = ["wr.id = $1"];
  const values: unknown[] = [input.runId];

  if (input.resourceId) {
    conditions.push("wr.resource_id = $2");
    values.push(input.resourceId);
  }

  const result = await pool.query(
    `SELECT ${WORKFLOW_RUN_SUMMARY_SELECT_SQL}
     ${WORKFLOW_RUN_SUMMARY_JOINS_SQL}
     WHERE ${conditions.join(" AND ")}`,
    values,
  );

  const row = result.rows[0];
  if (!row) {
    throw new WorkflowRunNotFoundError(input.runId, undefined);
  }

  return mapRowToWorkflowRunSummary(row);
}

export async function checkWorkflowRunProgress(input: {
  runId: string;
  resourceId?: string;
}): Promise<WorkflowRunProgress> {
  const run = await getWorkflowRun(input);
  const completedSteps = countCompletedTimelineSteps(run.timeline);

  return {
    ...run,
    completedSteps,
    totalSteps: run.status === "completed" ? completedSteps : 0,
    completionPercentage:
      run.status === "completed"
        ? 100
        : run.status === "failed" || run.status === "cancelled"
          ? 0
          : 0,
  };
}

export async function listWorkflowRunSummaries(input: {
  resourceId?: string;
  startingAfter?: string | null;
  endingBefore?: string | null;
  limit?: number;
  statuses?: WorkflowStatus[];
  workflowId?: string;
}): Promise<ListWorkflowRunsResult> {
  const pool = getPool();
  const limit = input.limit ?? 20;
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.resourceId) {
    conditions.push(`wr.resource_id = $${paramIndex}`);
    values.push(input.resourceId);
    paramIndex += 1;
  }

  if (input.statuses && input.statuses.length > 0) {
    conditions.push(`wr.status = ANY($${paramIndex})`);
    values.push(input.statuses);
    paramIndex += 1;
  }

  if (input.workflowId) {
    conditions.push(`wr.workflow_id = $${paramIndex}`);
    values.push(input.workflowId);
    paramIndex += 1;
  }

  const cursorIds = [input.startingAfter, input.endingBefore].filter(
    Boolean,
  ) as string[];

  if (cursorIds.length > 0) {
    const cursorResult = await pool.query(
      "SELECT id, created_at FROM workflow_runs WHERE id = ANY($1)",
      [cursorIds],
    );
    const cursorMap = new Map<string, Date>();
    for (const row of cursorResult.rows) {
      cursorMap.set(String(row.id), new Date(String(row.created_at)));
    }

    if (input.startingAfter) {
      const cursor = cursorMap.get(input.startingAfter);
      if (cursor) {
        conditions.push(`wr.created_at < $${paramIndex}`);
        values.push(cursor);
        paramIndex += 1;
      }
    }

    if (input.endingBefore) {
      const cursor = cursorMap.get(input.endingBefore);
      if (cursor) {
        conditions.push(`wr.created_at > $${paramIndex}`);
        values.push(cursor);
        paramIndex += 1;
      }
    }
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const actualLimit = Math.min(Math.max(limit, 1), 100) + 1;
  const isBackward = Boolean(input.endingBefore && !input.startingAfter);

  const query = `
    SELECT
      ${WORKFLOW_RUN_SUMMARY_SELECT_SQL}
    ${WORKFLOW_RUN_SUMMARY_JOINS_SQL}
    ${whereClause}
    ORDER BY wr.created_at ${isBackward ? "ASC" : "DESC"}
    LIMIT $${paramIndex}
  `;
  values.push(actualLimit);

  const result = await pool.query(query, values);
  const rows = result.rows;
  const hasExtraRow = rows.length > limit;
  const rawItems = hasExtraRow ? rows.slice(0, limit) : rows;

  if (isBackward) {
    rawItems.reverse();
  }

  const items = rawItems.map((row) => mapRowToWorkflowRunSummary(row));
  const hasMore = isBackward ? items.length > 0 : hasExtraRow;
  const hasPrev =
    isBackward ? hasExtraRow : Boolean(input.startingAfter) && items.length > 0;
  const nextCursor =
    hasMore && items.length > 0 ? (items[items.length - 1]?.id ?? null) : null;
  const prevCursor =
    hasPrev && items.length > 0 ? (items[0]?.id ?? null) : null;

  return { items, nextCursor, prevCursor, hasMore, hasPrev };
}

export { WorkflowRunNotFoundError };
