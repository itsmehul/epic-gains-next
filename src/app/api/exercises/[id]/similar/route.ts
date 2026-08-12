import { NextResponse } from "next/server";

import {
  findSimilarExercisesForUser,
  getExerciseByIdForUser,
} from "@/db/repositories/exercise.repository";
import { getWorkoutExercise } from "@/db/repositories/workout-exercise.repository";
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
    const exercise = await getExerciseByIdForUser(id, session.user.id);
    if (!exercise) {
      return apiError("Exercise not found", 404);
    }

    const { searchParams } = new URL(req.url);
    const parsed = similarExercisesQuerySchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return apiError("Invalid query", 400);
    }

    const workoutId = searchParams.get("workoutId");
    let queryName = exercise.name;
    if (workoutId) {
      const link = await getWorkoutExercise(workoutId, id);
      if (link?.name) queryName = link.name;
    }

    const items = await findSimilarExercisesForUser({
      userId: session.user.id,
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
