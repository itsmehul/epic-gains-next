import { NextResponse } from "next/server";

import {
  getMergeExerciseImpact,
  mergeExerciseInto,
} from "@/db/repositories/exercise.repository";
import { getWorkoutByIdForUser } from "@/db/repositories/workout.repository";
import { mergeExerciseSchema } from "@/features/workouts/schemas";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";
import { isCatalogAdmin } from "@/shared/env";

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
    const { searchParams } = new URL(req.url);
    const targetExerciseId = searchParams.get("targetExerciseId");
    const workoutId = searchParams.get("workoutId") ?? undefined;
    if (!targetExerciseId) {
      return apiError("targetExerciseId is required", 400);
    }

    if (workoutId) {
      const workout = await getWorkoutByIdForUser(workoutId, session.user.id);
      if (!workout && !isCatalogAdmin(session.user.id)) {
        return apiError("Workout not found", 404);
      }
    } else if (!isCatalogAdmin(session.user.id)) {
      return apiError("Forbidden", 403);
    }

    const impact = await getMergeExerciseImpact({
      sourceExerciseId: id,
      targetExerciseId,
      workoutId,
    });
    if (!impact) {
      return apiError("Exercise not found", 404);
    }

    return NextResponse.json(impact);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to preview exercise merge";
    return apiError(message, 500);
  }
}

export async function POST(
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
    const parsed = mergeExerciseSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("Invalid body", 400);
    }

    const admin = isCatalogAdmin(session.user.id);
    const workout = await getWorkoutByIdForUser(
      parsed.data.workoutId,
      session.user.id,
    );
    if (!workout && !admin) {
      return apiError("Workout not found", 404);
    }

    const result = await mergeExerciseInto({
      userId: session.user.id,
      sourceExerciseId: id,
      targetExerciseId: parsed.data.targetExerciseId,
      workoutId: parsed.data.workoutId,
      workoutExerciseId: parsed.data.workoutExerciseId,
      global: admin && !workout,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to merge exercise";
    const status =
      message.includes("not found") || message.includes("only available")
        ? 400
        : 500;
    return apiError(message, status);
  }
}
