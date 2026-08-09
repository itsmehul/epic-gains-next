import { NextResponse } from "next/server";

import { getExerciseById } from "@/db/repositories/exercise.repository";
import {
  createWorkoutExercise,
  listWorkoutExercises,
} from "@/db/repositories/workout-exercise.repository";
import { getWorkoutByIdForUser } from "@/db/repositories/workout.repository";
import { createWorkoutExerciseSchema } from "@/features/workouts/schemas";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

export async function GET(req: Request) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(req.url);
    const workoutId = searchParams.get("workoutId") ?? undefined;
    const exerciseId = searchParams.get("exerciseId") ?? undefined;

    if (workoutId) {
      const workout = await getWorkoutByIdForUser(workoutId, session.user.id);
      if (!workout) {
        return apiError("Workout not found", 404);
      }
    }

    const items = await listWorkoutExercises({ workoutId, exerciseId });

    if (!workoutId && exerciseId) {
      const owned: typeof items = [];
      for (const item of items) {
        const workout = await getWorkoutByIdForUser(
          item.workoutId,
          session.user.id,
        );
        if (workout) owned.push(item);
      }
      return NextResponse.json({ items: owned });
    }

    if (!workoutId && !exerciseId) {
      const owned: typeof items = [];
      for (const item of items) {
        const workout = await getWorkoutByIdForUser(
          item.workoutId,
          session.user.id,
        );
        if (workout) owned.push(item);
      }
      return NextResponse.json({ items: owned });
    }

    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to list workout exercises";
    return apiError(message, 500);
  }
}

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const json = await req.json();
    const parsed = createWorkoutExerciseSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("Invalid body", 400);
    }

    const workout = await getWorkoutByIdForUser(
      parsed.data.workoutId,
      session.user.id,
    );
    if (!workout) {
      return apiError("Workout not found", 404);
    }

    const exercise = await getExerciseById(parsed.data.exerciseId);
    if (!exercise) {
      return apiError("Exercise not found", 404);
    }

    const item = await createWorkoutExercise(parsed.data);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create workout exercise";
    return apiError(message, 500);
  }
}
