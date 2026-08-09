import { NextResponse } from "next/server";

import {
  createWorkout,
  listWorkoutsForUser,
} from "@/db/repositories/workout.repository";
import { createWorkoutSchema } from "@/features/workouts/schemas";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

export async function GET() {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const items = await listWorkoutsForUser(session.user.id);
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
      userId: session.user.id,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create workout";
    return apiError(message, 500);
  }
}
