import { NextResponse } from "next/server";

import {
  createWorkout,
  listWorkoutsForUser,
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
    const parsed = listWorkoutsQuerySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
    });
    if (!parsed.success) {
      return apiError("Invalid query", 400);
    }

    const items = await listWorkoutsForUser(session.user.id, {
      q: parsed.data.q,
    });
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
      userId: session.user.id,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create workout";
    return apiError(message, 500);
  }
}
