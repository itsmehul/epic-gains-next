import { NextResponse } from "next/server";

import {
  countIncomingFollowRequests,
  ensureUserSocialProfile,
  listIncomingFollowRequests,
} from "@/db/repositories/social.repository";
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
    const items = await listIncomingFollowRequests(session.user.id);
    const count = await countIncomingFollowRequests(session.user.id);
    return NextResponse.json({
      items: items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      count,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list requests";
    return apiError(message, 500);
  }
}
