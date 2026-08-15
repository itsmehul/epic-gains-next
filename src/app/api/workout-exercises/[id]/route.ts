import { NextResponse } from "next/server";

import { getExerciseById } from "@/db/repositories/exercise.repository";
import { getVisibleWorkoutById } from "@/db/repositories/feed.repository";
import {
  deleteWorkoutExercise,
  getWorkoutExerciseById,
  updateWorkoutExercise,
} from "@/db/repositories/workout-exercise.repository";
import { getWorkoutByIdForUser } from "@/db/repositories/workout.repository";
import { updateWorkoutExerciseSchema } from "@/features/workouts/schemas";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

type RouteParams = {
  id: string;
};

async function assertOwnsWorkout(workoutId: string, userId: string) {
  return getWorkoutByIdForUser(workoutId, userId);
}

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
    const item = await getWorkoutExerciseById(id);
    if (!item) {
      return apiError("Workout exercise not found", 404);
    }

    const workout = await getVisibleWorkoutById(session.user.id, item.workoutId);
    if (!workout) {
      return apiError("Workout not found", 404);
    }

    return NextResponse.json(item);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch workout exercise";
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
    const existing = await getWorkoutExerciseById(id);
    if (!existing) {
      return apiError("Workout exercise not found", 404);
    }

    const workout = await assertOwnsWorkout(
      existing.workoutId,
      session.user.id,
    );
    if (!workout) {
      return apiError("Workout not found", 404);
    }

    const json = await req.json();
    const parsed = updateWorkoutExerciseSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("Invalid body", 400);
    }

    if (parsed.data.workoutId) {
      const nextWorkout = await assertOwnsWorkout(
        parsed.data.workoutId,
        session.user.id,
      );
      if (!nextWorkout) {
        return apiError("Target workout not found", 404);
      }
    }

    if (parsed.data.exerciseId) {
      const exercise = await getExerciseById(
        parsed.data.exerciseId,
      );
      if (!exercise) {
        return apiError("Exercise not found", 404);
      }
    }

    const item = await updateWorkoutExercise(id, {
      workoutId: parsed.data.workoutId,
      exerciseId: parsed.data.exerciseId,
      name: parsed.data.name,
      videoUrl: parsed.data.videoUrl,
      imageUrl: parsed.data.imageUrl,
      metaData: parsed.data.metaData,
      tags: parsed.data.tags,
    });
    if (!item) {
      return apiError("Workout exercise not found", 404);
    }
    return NextResponse.json(item);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update workout exercise";
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
    const existing = await getWorkoutExerciseById(id);
    if (!existing) {
      return apiError("Workout exercise not found", 404);
    }

    const workout = await assertOwnsWorkout(
      existing.workoutId,
      session.user.id,
    );
    if (!workout) {
      return apiError("Workout not found", 404);
    }

    const item = await deleteWorkoutExercise(id);
    if (!item) {
      return apiError("Workout exercise not found", 404);
    }
    return NextResponse.json(item);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete workout exercise";
    return apiError(message, 500);
  }
}
