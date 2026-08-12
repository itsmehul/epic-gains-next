import { NextResponse } from "next/server";

import { buildProfilePayload } from "@/features/social/service";
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
    const profile = await buildProfilePayload(session.user.id, username);
    if (!profile) return apiError("User not found", 404);
    return NextResponse.json(profile);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load profile";
    return apiError(message, 500);
  }
}
