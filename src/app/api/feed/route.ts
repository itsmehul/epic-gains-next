import { NextResponse } from "next/server";

import { listFollowingFeed } from "@/db/repositories/feed.repository";
import { ensureUserSocialProfile } from "@/db/repositories/social.repository";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

export async function GET() {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();

  try {
    await ensureUserSocialProfile(session.user.id);
    const items = await listFollowingFeed(session.user.id);
    return NextResponse.json({
      items: items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load feed";
    return apiError(message, 500);
  }
}
