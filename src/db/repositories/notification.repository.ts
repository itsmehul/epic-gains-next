import "server-only";

import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { comments, exercise, notification, user, workout } from "@/db/schema";
import type { NotificationType } from "@/db/schema/social-schema";
import { toPublicUser } from "@/db/repositories/social.repository";
import { mentionedUserIds } from "@/features/agent/mentions";
import type { CommentMention } from "@/db/schema/workout-schema";

const actor = alias(user, "notification_actor");

const actorColumns = {
  id: actor.id,
  name: actor.name,
  username: actor.username,
  image: actor.image,
  isPrivate: actor.isPrivate,
};

export async function createMentionNotifications(options: {
  commentId: string;
  authorId: string;
  mentions: CommentMention[] | null | undefined;
}) {
  const recipientIds = mentionedUserIds(options.mentions, options.authorId);
  if (recipientIds.length === 0) return;

  await db
    .insert(notification)
    .values(
      recipientIds.map((recipientId) => ({
        id: crypto.randomUUID(),
        recipientId,
        actorId: options.authorId,
        commentId: options.commentId,
        type: "mention" as const,
      })),
    )
    .onConflictDoNothing();
}

export async function listNotificationsForUser(recipientId: string, limit = 50) {
  const rows = await db
    .select({
      id: notification.id,
      type: notification.type,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      comment: {
        id: comments.id,
        text: comments.text,
        exerciseId: comments.exerciseId,
        workoutId: comments.workoutId,
      },
      exercise: {
        id: exercise.id,
        name: exercise.name,
      },
      workout: {
        id: workout.id,
        name: workout.name,
      },
      actor: actorColumns,
    })
    .from(notification)
    .innerJoin(comments, eq(comments.id, notification.commentId))
    .innerJoin(exercise, eq(exercise.id, comments.exerciseId))
    .innerJoin(actor, eq(actor.id, notification.actorId))
    .leftJoin(workout, eq(workout.id, comments.workoutId))
    .where(eq(notification.recipientId, recipientId))
    .orderBy(desc(notification.createdAt))
    .limit(limit);

  return rows.flatMap((row) => {
    const actorUser = toPublicUser(row.actor);
    if (!actorUser) return [];
    return [
      {
        id: row.id,
        type: row.type as NotificationType,
        readAt: row.readAt,
        createdAt: row.createdAt,
        comment: row.comment,
        exercise: row.exercise,
        workout:
          row.comment.workoutId && row.workout?.id
            ? { id: row.workout.id, name: row.workout.name }
            : null,
        actor: actorUser,
      },
    ];
  });
}

export async function countUnreadNotifications(recipientId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(notification)
    .where(
      and(
        eq(notification.recipientId, recipientId),
        isNull(notification.readAt),
      ),
    );
  return row?.value ?? 0;
}

export async function markNotificationsRead(
  recipientId: string,
  ids?: string[],
) {
  const conditions = [
    eq(notification.recipientId, recipientId),
    isNull(notification.readAt),
  ];
  if (ids && ids.length > 0) {
    conditions.push(inArray(notification.id, ids));
  }

  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(...conditions));
}
