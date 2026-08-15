import { NextResponse } from "next/server";

import { listWorkoutsForProfile } from "@/db/repositories/workout.repository";
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

    const items = await listWorkoutsForProfile(profile.id);
    return NextResponse.json({
      items: items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list workouts";
    return apiError(message, 500);
  }
}
