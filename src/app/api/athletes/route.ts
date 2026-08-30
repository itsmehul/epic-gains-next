import { NextResponse } from "next/server";

import { getMyAthletes } from "@/features/social/service";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

export async function GET() {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();

  try {
    const result = await getMyAthletes(session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list athletes";
    return apiError(message, 500);
  }
}
