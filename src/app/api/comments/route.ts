import { NextResponse } from "next/server";

import { getExerciseById } from "@/db/repositories/exercise.repository";
import { getVisibleWorkoutById } from "@/db/repositories/feed.repository";
import {
  createComment,
  getCommentById,
  listVisibleComments,
} from "@/db/repositories/comment.repository";
import { listFollowing } from "@/db/repositories/social.repository";
import { resolveMentions } from "@/features/agent/mentions";
import {
  createCommentSchema,
  listCommentsQuerySchema,
} from "@/features/comments/schemas";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

function serializeComment(item: {
  id: string;
  exerciseId: string;
  workoutId: string | null;
  text: string;
  role: "user" | "agent";
  mentions: unknown;
  createdAt: Date;
  parentId: string | null;
  authorId: string;
  author: {
    id: string;
    name: string;
    username: string;
    image: string | null;
    isPrivate: boolean;
  };
}) {
  return {
    ...item,
    mentions: Array.isArray(item.mentions) ? item.mentions : [],
    createdAt: item.createdAt.toISOString(),
  };
}

export async function GET(req: Request) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(req.url);
    const parsed = listCommentsQuerySchema.safeParse({
      exerciseId: searchParams.get("exerciseId") ?? undefined,
      workoutId: searchParams.get("workoutId") ?? undefined,
    });
    if (!parsed.success) {
      return apiError("exerciseId is required", 400);
    }

    if (parsed.data.workoutId) {
      const workout = await getVisibleWorkoutById(
        session.user.id,
        parsed.data.workoutId,
      );
      if (!workout) {
        return apiError("Workout not found", 404);
      }
    } else {
      const exercise = await getExerciseById(parsed.data.exerciseId);
      if (!exercise) {
        return apiError("Exercise not found", 404);
      }
    }

    const items = await listVisibleComments({
      viewerId: session.user.id,
      exerciseId: parsed.data.exerciseId,
      workoutId: parsed.data.workoutId,
    });

    return NextResponse.json({ items: items.map(serializeComment) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list comments";
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
    const parsed = createCommentSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("Invalid body", 400);
    }

    const exercise = await getExerciseById(parsed.data.exerciseId);
    if (!exercise) {
      return apiError("Exercise not found", 404);
    }

    const workoutId = parsed.data.workoutId ?? null;
    if (workoutId) {
      const workout = await getVisibleWorkoutById(session.user.id, workoutId);
      if (!workout) {
        return apiError("Workout not found", 404);
      }
    }

    let parentId: string | null = parsed.data.parentId ?? null;
    if (parentId) {
      const parent = await getCommentById(parentId);
      if (!parent || parent.exerciseId !== parsed.data.exerciseId) {
        return apiError("Parent comment not found", 404);
      }
      parentId = parent.parentId ?? parent.id;
    }

    const following = await listFollowing(session.user.id);
    const mentions = resolveMentions(
      parsed.data.text,
      following.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
      })),
    );

    const item = await createComment({
      id: crypto.randomUUID(),
      exerciseId: parsed.data.exerciseId,
      workoutId,
      text: parsed.data.text,
      role: "user",
      mentions,
      parentId,
      authorId: session.user.id,
    });
    if (!item) {
      return apiError("Failed to create comment", 500);
    }

    return NextResponse.json(serializeComment(item), { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create comment";
    return apiError(message, 500);
  }
}
