import { NextResponse } from "next/server";

import {
  createExercise,
  listExercises,
} from "@/db/repositories/exercise.repository";
import { createExerciseSchema } from "@/features/workouts/schemas";
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
      videoUrl: parsed.data.videoUrl ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
      metaData: parsed.data.metaData ?? null,
      tags: parsed.data.tags ?? [],
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create exercise";
    return apiError(message, 500);
  }
}
