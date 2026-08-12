import { NextResponse } from "next/server";

import { followUser, unfollowUser } from "@/features/social/service";
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
    const result = await followUser(session.user.id, username);
    if (!result.ok) {
      return apiError(result.error, result.status);
    }
    return NextResponse.json(result.data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to follow user";
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
    const result = await unfollowUser(session.user.id, username);
    if (!result.ok) {
      return apiError(result.error, result.status);
    }
    return NextResponse.json(result.data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to unfollow user";
    return apiError(message, 500);
  }
}
