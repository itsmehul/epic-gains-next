import { NextResponse } from "next/server";

import {
  importSharedWorkout,
  parseImportWorkoutBody,
  WorkoutImportConflictError,
  WorkoutImportRejectedError,
} from "@/features/workouts/import-workout";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const json = await req.json();
    const args = parseImportWorkoutBody(json);
    if (!args) {
      return apiError("Invalid import workout data", 400);
    }

    const result = await importSharedWorkout(session.user.id, args);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof WorkoutImportConflictError) {
      return NextResponse.json(
        {
          error: error.message,
          existingWorkoutId: error.existingWorkoutId,
        },
        { status: 409 },
      );
    }
    if (error instanceof WorkoutImportRejectedError) {
      return apiError(error.message, 422);
    }
    const message =
      error instanceof Error ? error.message : "Failed to import workout";
    return apiError(message, 500);
  }
}
