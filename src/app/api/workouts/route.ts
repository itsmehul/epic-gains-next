import { NextResponse } from "next/server";

import {
  createWorkout,
  listCatalogWorkouts,
  listMyWorkouts,
} from "@/db/repositories/workout.repository";
import {
  createWorkoutSchema,
  listWorkoutsQuerySchema,
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
    const muscleGroup = searchParams.getAll("muscleGroup");
    const parsed = listWorkoutsQuerySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      scope: searchParams.get("scope") ?? undefined,
      muscleGroup: muscleGroup.length > 0 ? muscleGroup : undefined,
    });
    if (!parsed.success) {
      return apiError("Invalid query", 400);
    }

    const options = {
      q: parsed.data.q,
      muscleGroups: parsed.data.muscleGroup,
    };
    const items =
      parsed.data.scope === "catalog"
        ? await listCatalogWorkouts(session.user.id, options)
        : await listMyWorkouts(session.user.id, options);
    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list workouts";
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
    const parsed = createWorkoutSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("Invalid body", 400);
    }

    const item = await createWorkout({
      id: crypto.randomUUID(),
      name: parsed.data.name,
      author: parsed.data.author ?? null,
      channelUrl: parsed.data.channelUrl ?? null,
      userId: session.user.id,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create workout";
    return apiError(message, 500);
  }
}
