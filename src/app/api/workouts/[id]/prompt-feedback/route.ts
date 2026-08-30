import { NextResponse } from "next/server";

import { getVisibleWorkoutById } from "@/db/repositories/feed.repository";
import {
  getLatestImportPromptFeedbackForUser,
  insertImportPromptFeedback,
} from "@/db/repositories/import-prompt-feedback.repository";
import { IMPORT_PROMPT_VERSION } from "@/features/workouts/import-prompt-instructions";
import { createImportPromptFeedbackSchema } from "@/features/workouts/schemas";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

type RouteParams = {
  id: string;
};

function serializeFeedback(item: {
  id: string;
  workoutId: string;
  promptVersion: string;
  annotations: unknown;
  comment: string | null;
  videoTimestamp: number;
  createdAt: Date;
}) {
  return {
    id: item.id,
    workoutId: item.workoutId,
    promptVersion: item.promptVersion,
    annotations: item.annotations,
    comment: item.comment,
    videoTimestamp: item.videoTimestamp,
    createdAt: item.createdAt.toISOString(),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;
    const workout = await getVisibleWorkoutById(session.user.id, id);
    if (!workout) {
      return apiError("Workout not found", 404);
    }

    const item = await getLatestImportPromptFeedbackForUser({
      workoutId: id,
      userId: session.user.id,
    });

    return NextResponse.json({
      item: item ? serializeFeedback(item) : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load feedback";
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
    const workout = await getVisibleWorkoutById(session.user.id, id);
    if (!workout) {
      return apiError("Workout not found", 404);
    }

    const json = await req.json();
    const parsed = createImportPromptFeedbackSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("Invalid body", 400);
    }

    const item = await insertImportPromptFeedback({
      workoutId: id,
      userId: session.user.id,
      promptVersion: IMPORT_PROMPT_VERSION,
      annotations: parsed.data.annotations,
      comment: parsed.data.comment?.trim() || null,
      videoTimestamp: parsed.data.videoTimestamp,
    });
    if (!item) {
      return apiError("Failed to save feedback", 500);
    }

    return NextResponse.json(serializeFeedback(item), { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save feedback";
    return apiError(message, 500);
  }
}
