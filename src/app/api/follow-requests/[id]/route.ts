import { NextResponse } from "next/server";

import {
  acceptFollowRequest,
  rejectFollowRequest,
} from "@/features/social/service";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

type RouteParams = { id: string };

export async function POST(
  req: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "accept") {
      const result = await acceptFollowRequest(session.user.id, id);
      if (!result.ok) return apiError(result.error, result.status);
      return NextResponse.json(result.data);
    }

    if (action === "reject") {
      const result = await rejectFollowRequest(session.user.id, id);
      if (!result.ok) return apiError(result.error, result.status);
      return NextResponse.json(result.data);
    }

    return apiError("action must be accept or reject", 400);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to handle request";
    return apiError(message, 500);
  }
}
