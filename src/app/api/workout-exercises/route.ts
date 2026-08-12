import { NextResponse } from "next/server";

import { getExerciseByIdForUser } from "@/db/repositories/exercise.repository";
import { getVisibleWorkoutById } from "@/db/repositories/feed.repository";
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
      const workout = await getVisibleWorkoutById(session.user.id, workoutId);
      if (!workout) {
        return apiError("Workout not found", 404);
      }
    }

    const items = await listWorkoutExercises({ workoutId, exerciseId });

    if (!workoutId && exerciseId) {
      const visible: typeof items = [];
      for (const item of items) {
        const workout = await getVisibleWorkoutById(
          session.user.id,
          item.workoutId,
        );
        if (workout) visible.push(item);
      }
      return NextResponse.json({ items: visible });
    }

    if (!workoutId && !exerciseId) {
      const visible: typeof items = [];
      for (const item of items) {
        const workout = await getVisibleWorkoutById(
          session.user.id,
          item.workoutId,
        );
        if (workout) visible.push(item);
      }
      return NextResponse.json({ items: visible });
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

    const exercise = await getExerciseByIdForUser(
      parsed.data.exerciseId,
      session.user.id,
    );
    if (!exercise) {
      return apiError("Exercise not found", 404);
    }

    const item = await createWorkoutExercise({
      workoutId: parsed.data.workoutId,
      exerciseId: parsed.data.exerciseId,
      name: parsed.data.name,
      videoUrl: parsed.data.videoUrl ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
      metaData: parsed.data.metaData ?? null,
      tags: parsed.data.tags ?? [],
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create workout exercise";
    return apiError(message, 500);
  }
}
