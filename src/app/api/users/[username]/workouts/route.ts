import { NextResponse } from "next/server";

import { listVisibleWorkoutsForUser } from "@/db/repositories/feed.repository";
import { getUserByUsername } from "@/db/repositories/social.repository";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

type RouteParams = { username: string };

export async function GET(
  _req: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();

  try {
    const { username } = await params;
    const profile = await getUserByUsername(username);
    if (!profile) return apiError("User not found", 404);

    const items = await listVisibleWorkoutsForUser(session.user.id, profile);
    if (items === null) {
      return apiError("This account is private", 403);
    }

    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list workouts";
    return apiError(message, 500);
  }
}
