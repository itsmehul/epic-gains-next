import { NextResponse } from "next/server";

import { getExerciseByIdForUser } from "@/db/repositories/exercise.repository";
import {
  deleteWorkoutExercise,
  getWorkoutExercise,
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
  workoutId: string;
  exerciseId: string;
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
    const { workoutId, exerciseId } = await params;
    const workout = await assertOwnsWorkout(workoutId, session.user.id);
    if (!workout) {
      return apiError("Workout not found", 404);
    }

    const item = await getWorkoutExercise(workoutId, exerciseId);
    if (!item) {
      return apiError("Workout exercise not found", 404);
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
    const { workoutId, exerciseId } = await params;
    const workout = await assertOwnsWorkout(workoutId, session.user.id);
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
      const exercise = await getExerciseByIdForUser(
        parsed.data.exerciseId,
        session.user.id,
      );
      if (!exercise) {
        return apiError("Exercise not found", 404);
      }
    }

    const item = await updateWorkoutExercise(workoutId, exerciseId, {
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
    const { workoutId, exerciseId } = await params;
    const workout = await assertOwnsWorkout(workoutId, session.user.id);
    if (!workout) {
      return apiError("Workout not found", 404);
    }

    const item = await deleteWorkoutExercise(workoutId, exerciseId);
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
