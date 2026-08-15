import { NextResponse } from "next/server";

import { listFollowingFeed } from "@/db/repositories/feed.repository";
import { ensureUserSocialProfile } from "@/db/repositories/social.repository";
import { listWorkoutsQuerySchema } from "@/features/workouts/schemas";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

export async function GET(req: Request) {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const muscleGroup = searchParams.getAll("muscleGroup");
    const parsed = listWorkoutsQuerySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      muscleGroup: muscleGroup.length > 0 ? muscleGroup : undefined,
    });
    if (!parsed.success) {
      return apiError("Invalid query", 400);
    }

    await ensureUserSocialProfile(session.user.id);
    const items = await listFollowingFeed(session.user.id, {
      q: parsed.data.q,
      muscleGroups: parsed.data.muscleGroup,
    });
    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load feed";
    return apiError(message, 500);
  }
}
