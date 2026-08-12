import { NextResponse } from "next/server";

import {
  countIncomingFollowRequests,
  ensureUserSocialProfile,
} from "@/db/repositories/social.repository";
import { updateSocialProfileSchema } from "@/features/social/schemas";
import { updateMySocialSettings } from "@/features/social/service";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

export async function GET() {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();

  try {
    const profile = await ensureUserSocialProfile(session.user.id);
    if (!profile) return apiError("User not found", 404);
    const pendingRequestCount = await countIncomingFollowRequests(
      session.user.id,
    );
    return NextResponse.json({ ...profile, pendingRequestCount });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load profile";
    return apiError(message, 500);
  }
}

export async function PATCH(req: Request) {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();

  try {
    const json = await req.json();
    const parsed = updateSocialProfileSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("Invalid body", 400);
    }

    const result = await updateMySocialSettings(session.user.id, parsed.data);
    if (!result.ok) {
      return apiError(result.error, result.status);
    }
    return NextResponse.json(result.data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update profile";
    return apiError(message, 500);
  }
}
