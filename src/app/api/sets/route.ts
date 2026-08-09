import { NextResponse } from "next/server";

import { getExerciseById } from "@/db/repositories/exercise.repository";
import { createSet, listSets } from "@/db/repositories/set.repository";
import { getWorkoutByIdForUser } from "@/db/repositories/workout.repository";
import { createSetSchema } from "@/features/workouts/schemas";
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

    const items = await listSets({ workoutId, exerciseId });

    if (!workoutId) {
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
      error instanceof Error ? error.message : "Failed to list sets";
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
    const parsed = createSetSchema.safeParse(json);
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

    const item = await createSet({
      id: crypto.randomUUID(),
      reps: parsed.data.reps ?? null,
      weight: parsed.data.weight ?? null,
      time: parsed.data.time ?? null,
      distance: parsed.data.distance ?? null,
      workoutId: parsed.data.workoutId,
      exerciseId: parsed.data.exerciseId,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create set";
    return apiError(message, 500);
  }
}
