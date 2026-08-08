import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";
import {
  checkWorkflowRunProgress,
  getWorkflowRun,
  WorkflowRunNotFoundError,
} from "@/features/workflows/runs";
import { NextResponse } from "next/server";

type RouteParams = { runId: string };

export async function GET(
  req: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { runId } = await params;
    const { searchParams } = new URL(req.url);
    const scopedResourceId =
      searchParams.get("resourceId") ?? searchParams.get("accountId");
    const lookup = scopedResourceId
      ? { runId, resourceId: scopedResourceId }
      : { runId };

    const [run, progress] = await Promise.all([
      getWorkflowRun(lookup),
      checkWorkflowRunProgress(lookup),
    ]);

    return NextResponse.json({
      run,
      progress,
    });
  } catch (error) {
    if (error instanceof WorkflowRunNotFoundError) {
      return apiError("Workflow run not found", 404);
    }

    const message =
      error instanceof Error ? error.message : "Failed to fetch workflow run";
    return apiError(message, 500);
  }
}
