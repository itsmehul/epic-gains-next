import { NextResponse } from "next/server";

import {
  deleteExercise,
  getExerciseById,
  updateExercise,
} from "@/db/repositories/exercise.repository";
import { updateExerciseSchema } from "@/features/workouts/schemas";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;
    const json = await req.json();
    const parsed = updateExerciseSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("Invalid body", 400);
    }

    const item = await updateExercise(id, {
      ...parsed.data,
      videoUrl: parsed.data.videoUrl,
      imageUrl: parsed.data.imageUrl,
      metaData: parsed.data.metaData,
    });
    if (!item) {
      return apiError("Exercise not found", 404);
    }
    return NextResponse.json(item);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update exercise";
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
