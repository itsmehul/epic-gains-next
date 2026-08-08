import { NextResponse } from "next/server";
import { WorkflowStatus } from "pg-workflows/client";

import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";
import { getWorkflowClient } from "@/infrastructure/workflows/client";
import { getInvocableWorkflow } from "@/features/workflows/invocable";
import { listWorkflowRunSummaries } from "@/features/workflows/runs";
import { checkRateLimit } from "@/infrastructure/security/rate-limit";

const VALID_STATUSES = new Set<string>(Object.values(WorkflowStatus));

function parseStatuses(value: string | null): WorkflowStatus[] | undefined {
  if (!value) return undefined;

  const statuses = value
    .split(",")
    .map((status) => status.trim())
    .filter((status): status is WorkflowStatus => VALID_STATUSES.has(status));

  return statuses.length > 0 ? statuses : undefined;
}

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const limited = checkRateLimit(`workflows:start:${session.user.id}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return apiError("Too many requests", 429);
  }

  try {
    const body = (await req.json()) as {
      workflowId?: string;
      input?: Record<string, unknown>;
      resourceId?: string;
    };

    if (!body.workflowId) {
      return apiError("workflowId is required", 400);
    }

    const invocable = getInvocableWorkflow(body.workflowId);
    if (!invocable) {
      return apiError("Workflow is not invocable", 400);
    }

    const client = await getWorkflowClient();
    const run = await client.startWorkflow({
      workflowId: body.workflowId,
      input: body.input ?? {},
      resourceId: body.resourceId ?? session.user.id,
    });

    return NextResponse.json({
      runId: run.id,
      status: run.status,
      workflowId: run.workflowId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start workflow";
    return apiError(message, 500);
  }
}

export async function GET(req: Request) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1),
      100,
    );
    const startingAfter = searchParams.get("startingAfter");
    const endingBefore = searchParams.get("endingBefore");
    const workflowId = searchParams.get("workflowId") ?? undefined;
    const resourceId =
      searchParams.get("resourceId") ??
      searchParams.get("userId") ??
      undefined;
    const statuses = parseStatuses(searchParams.get("statuses"));

    const result = await listWorkflowRunSummaries({
      limit,
      startingAfter,
      endingBefore,
      workflowId,
      resourceId,
      statuses,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch workflow runs";
    return apiError(message, 500);
  }
}
