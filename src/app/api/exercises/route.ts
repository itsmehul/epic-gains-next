import { NextResponse } from "next/server";

import {
  createExercise,
  listExercises,
  searchExercises,
} from "@/db/repositories/exercise.repository";
import {
  createExerciseSchema,
  listExercisesQuerySchema,
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
    const parsed = listExercisesQuerySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      excludeId: searchParams.get("excludeId") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return apiError("Invalid query", 400);
    }

    if (parsed.data.q || parsed.data.excludeId) {
      const items = await searchExercises({
        q: parsed.data.q,
        excludeExerciseId: parsed.data.excludeId,
        limit: parsed.data.limit,
      });
      return NextResponse.json({ items });
    }

    const items = await listExercises();
    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list exercises";
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
    const parsed = createExerciseSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("Invalid body", 400);
    }

    const item = await createExercise({
      id: crypto.randomUUID(),
      name: parsed.data.name,
      metricProfile: parsed.data.metric_profile ?? "CUSTOM",
      muscleGroup: parsed.data.muscle_group,
      keyMuscles: parsed.data.key_muscles ?? [],
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create exercise";
    return apiError(message, 500);
  }
}
