import { NextResponse } from "next/server";

import { assignTrainer, unassignTrainer } from "@/features/social/service";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

type RouteParams = { username: string };

export async function POST(
  _req: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();

  try {
    const { username } = await params;
    const result = await assignTrainer(session.user.id, username);
    if (!result.ok) {
      return apiError(result.error, result.status);
    }
    return NextResponse.json(result.data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to assign trainer";
    return apiError(message, 500);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();

  try {
    const { username } = await params;
    const result = await unassignTrainer(session.user.id, username);
    if (!result.ok) {
      return apiError(result.error, result.status);
    }
    return NextResponse.json(result.data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove trainer";
    return apiError(message, 500);
  }
}
