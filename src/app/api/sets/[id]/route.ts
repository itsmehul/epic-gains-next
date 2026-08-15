import { NextResponse } from "next/server";

import { getExerciseById } from "@/db/repositories/exercise.repository";
import {
  deleteSet,
  getSetById,
  updateSet,
} from "@/db/repositories/set.repository";
import { dropMemberIfNoSets } from "@/db/repositories/workout-membership.repository";
import { getWorkoutById } from "@/db/repositories/workout.repository";
import { updateSetSchema } from "@/features/workouts/schemas";
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
    const item = await getSetById(id);
    if (!item || item.userId !== session.user.id) {
      return apiError("Set not found", 404);
    }

    return NextResponse.json(item);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch set";
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
    const existing = await getSetById(id);
    if (!existing || existing.userId !== session.user.id) {
      return apiError("Set not found", 404);
    }

    const json = await req.json();
    const parsed = updateSetSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("Invalid body", 400);
    }

    const nextWorkoutId = parsed.data.workoutId ?? existing.workoutId;
    const nextExerciseId = parsed.data.exerciseId ?? existing.exerciseId;

    const nextWorkout = await getWorkoutById(nextWorkoutId);
    if (!nextWorkout) {
      return apiError("Workout not found", 404);
    }

    if (parsed.data.exerciseId) {
      const exercise = await getExerciseById(nextExerciseId);
      if (!exercise) {
        return apiError("Exercise not found", 404);
      }
    }

    const item = await updateSet(id, parsed.data);
    if (!item) {
      return apiError("Set not found", 404);
    }
    return NextResponse.json(item);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update set";
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
    const existing = await getSetById(id);
    if (!existing || existing.userId !== session.user.id) {
      return apiError("Set not found", 404);
    }

    const item = await deleteSet(id);
    if (!item) {
      return apiError("Set not found", 404);
    }
    await dropMemberIfNoSets(existing.workoutId, session.user.id);
    return NextResponse.json(item);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete set";
    return apiError(message, 500);
  }
}
