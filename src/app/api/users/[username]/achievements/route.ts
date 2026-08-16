import { NextResponse } from "next/server";

import { listAchievementsForUser } from "@/db/repositories/achievement.repository";
import { getUserByUsername } from "@/db/repositories/social.repository";
import { canViewUserWorkouts } from "@/features/social/privacy";
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
    if (!(await canViewUserWorkouts(session.user.id, profile))) {
      return apiError("This account is private", 403);
    }

    const persistUnlocks = session.user.id === profile.id;
    const payload = await listAchievementsForUser(profile.id, {
      persistUnlocks,
    });
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list achievements";
    return apiError(message, 500);
  }
}
