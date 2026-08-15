import { NextResponse } from "next/server";

import { listAchievementsForUser } from "@/db/repositories/achievement.repository";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

export async function GET() {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const payload = await listAchievementsForUser(session.user.id);
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list achievements";
    return apiError(message, 500);
  }
}
