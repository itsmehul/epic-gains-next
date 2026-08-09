import { NextResponse } from "next/server";

import {
  deleteWorkoutForUser,
  getWorkoutByIdForUser,
  updateWorkoutForUser,
} from "@/db/repositories/workout.repository";
import { updateWorkoutSchema } from "@/features/workouts/schemas";
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
    const item = await getWorkoutByIdForUser(id, session.user.id);
    if (!item) {
      return apiError("Workout not found", 404);
    }
    return NextResponse.json(item);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch workout";
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
    const parsed = updateWorkoutSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("Invalid body", 400);
    }

    const item = await updateWorkoutForUser(id, session.user.id, parsed.data);
    if (!item) {
      return apiError("Workout not found", 404);
    }
    return NextResponse.json(item);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update workout";
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
    const item = await deleteWorkoutForUser(id, session.user.id);
    if (!item) {
      return apiError("Workout not found", 404);
    }
    return NextResponse.json(item);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete workout";
    return apiError(message, 500);
  }
}
