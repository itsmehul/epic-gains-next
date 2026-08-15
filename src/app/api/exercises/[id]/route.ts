import { NextResponse } from "next/server";

import {
  deleteExercise,
  getExerciseById,
} from "@/db/repositories/exercise.repository";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";
import { isCatalogAdmin } from "@/shared/env";

type RouteParams = {
  id: string;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;
    const item = await getExerciseById(id);
    if (!item) {
      return apiError("Exercise not found", 404);
    }
    return NextResponse.json(item);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch exercise";
    return apiError(message, 500);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }
  if (!isCatalogAdmin(session.user.id)) {
    return apiError("Forbidden", 403);
  }

  try {
    const { id } = await params;
    const item = await deleteExercise(id);
    if (!item) {
      return apiError("Exercise not found", 404);
    }
    return NextResponse.json(item);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete exercise";
    return apiError(message, 500);
  }
}
