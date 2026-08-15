import { NextResponse } from "next/server";

import {
  findSimilarExercises,
  getExerciseById,
} from "@/db/repositories/exercise.repository";
import {
  getWorkoutExercise,
  getWorkoutExerciseById,
} from "@/db/repositories/workout-exercise.repository";
import { similarExercisesQuerySchema } from "@/features/workouts/schemas";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

type RouteParams = {
  id: string;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;
    const exercise = await getExerciseById(id);
    if (!exercise) {
      return apiError("Exercise not found", 404);
    }

    const { searchParams } = new URL(req.url);
    const parsed = similarExercisesQuerySchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
      workoutId: searchParams.get("workoutId") ?? undefined,
      workoutExerciseId: searchParams.get("workoutExerciseId") ?? undefined,
    });
    if (!parsed.success) {
      return apiError("Invalid query", 400);
    }

    let queryName = exercise.name;
    if (parsed.data.workoutExerciseId) {
      const link = await getWorkoutExerciseById(parsed.data.workoutExerciseId);
      if (link?.name && link.exerciseId === id) queryName = link.name;
    } else if (parsed.data.workoutId) {
      const link = await getWorkoutExercise(parsed.data.workoutId, id);
      if (link?.name) queryName = link.name;
    }

    const items = await findSimilarExercises({
      query: queryName,
      excludeExerciseId: id,
      limit: parsed.data.limit ?? 3,
    });

    return NextResponse.json({ items, query: queryName });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to find similar exercises";
    return apiError(message, 500);
  }
}
