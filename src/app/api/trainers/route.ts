import { NextResponse } from "next/server";

import { getMyTrainers } from "@/features/social/service";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

export async function GET() {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();

  try {
    const result = await getMyTrainers(session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list trainers";
    return apiError(message, 500);
  }
}
