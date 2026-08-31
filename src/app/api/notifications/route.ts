import { NextResponse } from "next/server";

import {
  countUnreadNotifications,
  listNotificationsForUser,
  markNotificationsRead,
  markNotificationsReadForComments,
} from "@/db/repositories/notification.repository";
import { markNotificationsReadSchema } from "@/features/notifications/schemas";
import { notificationHref } from "@/features/notifications/types";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

function serializeList(items: Awaited<ReturnType<typeof listNotificationsForUser>>) {
  return items.map((item) => ({
    id: item.id,
    type: item.type,
    readAt: item.readAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    href: notificationHref({
      workoutId: item.comment.workoutId,
      exerciseId: item.comment.exerciseId,
    }),
    actor: item.actor,
    comment: item.comment,
    exercise: item.exercise,
    workout: item.workout,
  }));
}

async function listPayload(userId: string) {
  const [items, unreadCount] = await Promise.all([
    listNotificationsForUser(userId),
    countUnreadNotifications(userId),
  ]);
  return { items: serializeList(items), unreadCount };
}

export async function GET() {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();

  try {
    return NextResponse.json(await listPayload(session.user.id));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list notifications";
    return apiError(message, 500);
  }
}

export async function PATCH(req: Request) {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();

  try {
    const json = await req.json();
    const parsed = markNotificationsReadSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("Invalid body", 400);
    }
    if (
      !parsed.data.all &&
      !parsed.data.ids &&
      !parsed.data.commentIds
    ) {
      return apiError("ids, commentIds, or all is required", 400);
    }

    if (parsed.data.commentIds) {
      await markNotificationsReadForComments(
        session.user.id,
        parsed.data.commentIds,
      );
    } else {
      await markNotificationsRead(session.user.id, parsed.data.ids);
    }
    return NextResponse.json(await listPayload(session.user.id));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update notifications";
    return apiError(message, 500);
  }
}
