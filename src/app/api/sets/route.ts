import { NextResponse } from "next/server";

import { unlockNewAchievementsForUser } from "@/db/repositories/achievement.repository";
import { getExerciseById } from "@/db/repositories/exercise.repository";
import { getVisibleWorkoutById } from "@/db/repositories/feed.repository";
import { createSet, listSets } from "@/db/repositories/set.repository";
import { ensureMemberFromSet } from "@/db/repositories/workout-membership.repository";
import { getWorkoutById } from "@/db/repositories/workout.repository";
import {
  createSetSchema,
  listSetsQuerySchema,
} from "@/features/workouts/schemas";
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
    const parsed = listSetsQuerySchema.safeParse({
      workoutId: searchParams.get("workoutId") ?? undefined,
      exerciseId: searchParams.get("exerciseId") ?? undefined,
    });
    if (!parsed.success) {
      return apiError("Invalid query", 400);
    }
    const { workoutId, exerciseId } = parsed.data;

    if (workoutId) {
      const workout = await getVisibleWorkoutById(session.user.id, workoutId);
      if (!workout) {
        return apiError("Workout not found", 404);
      }
    }

    const items = await listSets({
      workoutId,
      exerciseId,
      viewerId: session.user.id,
    });

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

    const workout = await getWorkoutById(parsed.data.workoutId);
    if (!workout) {
      return apiError("Workout not found", 404);
    }

    const exercise = await getExerciseById(parsed.data.exerciseId);
    if (!exercise) {
      return apiError("Exercise not found", 404);
    }

    const item = await createSet({
      id: crypto.randomUUID(),
      userId: session.user.id,
      reps: parsed.data.reps ?? null,
      weight: parsed.data.weight ?? null,
      time: parsed.data.time ?? null,
      distance: parsed.data.distance ?? null,
      workoutId: parsed.data.workoutId,
      exerciseId: parsed.data.exerciseId,
    });

    await ensureMemberFromSet(parsed.data.workoutId, session.user.id);

    const unlockedAchievements = await unlockNewAchievementsForUser(
      session.user.id,
      { createdSetId: item.id },
    );

    return NextResponse.json(
      { ...item, unlockedAchievements },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create set";
    return apiError(message, 500);
  }
}
