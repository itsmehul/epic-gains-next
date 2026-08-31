import "server-only";

import { and, asc, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { comments, exercise, notification, user, workout } from "@/db/schema";
import type { MuscleGroup } from "@/db/schema/workout-schema";
import { toPublicUser } from "@/db/repositories/social.repository";

export type CommentInsert = typeof comments.$inferInsert;

const authorColumns = {
  id: user.id,
  name: user.name,
  username: user.username,
  image: user.image,
  isPrivate: user.isPrivate,
};

/** Author plus anyone @mentioned. Followers do not see the thread otherwise. */
export function commentVisibleToViewer(viewerId: string) {
  return or(
    eq(comments.authorId, viewerId),
    sql`exists (
      select 1
      from jsonb_array_elements(${comments.mentions}) as mention
      where mention->>'kind' = 'user'
        and mention->>'userId' = ${viewerId}
    )`,
  )!;
}

export async function listVisibleComments(options: {
  viewerId: string;
  exerciseId: string;
  workoutId?: string;
}) {
  const conditions = [
    eq(comments.exerciseId, options.exerciseId),
    commentVisibleToViewer(options.viewerId),
  ];

  if (options.workoutId) {
    conditions.push(
      or(
        eq(comments.workoutId, options.workoutId),
        isNull(comments.workoutId),
      )!,
    );
  }

  const rows = await db
    .select({
      id: comments.id,
      exerciseId: comments.exerciseId,
      workoutId: comments.workoutId,
      text: comments.text,
      role: comments.role,
      mentions: comments.mentions,
      meta: comments.meta,
      createdAt: comments.createdAt,
      parentId: comments.parentId,
      authorId: comments.authorId,
      author: authorColumns,
      mentionNotificationId: notification.id,
      mentionReadAt: notification.readAt,
    })
    .from(comments)
    .innerJoin(user, eq(user.id, comments.authorId))
    .leftJoin(
      notification,
      and(
        eq(notification.commentId, comments.id),
        eq(notification.recipientId, options.viewerId),
      ),
    )
    .where(and(...conditions))
    .orderBy(asc(comments.createdAt));

  return rows.flatMap((row) => {
    const author = toPublicUser(row.author);
    if (!author) return [];
    return [
      {
        id: row.id,
        exerciseId: row.exerciseId,
        workoutId: row.workoutId,
        text: row.text,
        role: row.role,
        mentions: row.mentions ?? [],
        meta: row.meta ?? {},
        createdAt: row.createdAt,
        parentId: row.parentId,
        authorId: row.authorId,
        author,
        unread: Boolean(row.mentionNotificationId && row.mentionReadAt == null),
      },
    ];
  });
}

export async function listVisibleCommentsForOwner(options: {
  ownerId: string;
  viewerId: string;
  muscleGroup?: MuscleGroup;
  keyMuscle?: string;
}) {
  const conditions = [
    eq(comments.authorId, options.ownerId),
    commentVisibleToViewer(options.viewerId),
  ];

  if (options.muscleGroup) {
    conditions.push(eq(exercise.muscleGroup, options.muscleGroup));
  }

  const keyMuscle = options.keyMuscle?.trim();
  if (keyMuscle) {
    const pattern = `%${keyMuscle.replace(/[%_]/g, "\\$&")}%`;
    conditions.push(
      sql`exists (
        select 1
        from unnest(${exercise.keyMuscles}) as muscle
        where muscle ilike ${pattern} escape '\\'
      )`,
    );
  }

  const rows = await db
    .select({
      id: comments.id,
      text: comments.text,
      createdAt: comments.createdAt,
      authorId: comments.authorId,
      author: authorColumns,
      exercise: {
        id: exercise.id,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        keyMuscles: exercise.keyMuscles,
      },
      workout: {
        id: workout.id,
        name: workout.name,
      },
      workoutId: comments.workoutId,
    })
    .from(comments)
    .innerJoin(user, eq(user.id, comments.authorId))
    .innerJoin(exercise, eq(exercise.id, comments.exerciseId))
    .leftJoin(workout, eq(workout.id, comments.workoutId))
    .where(and(...conditions))
    .orderBy(asc(comments.createdAt));

  return rows.flatMap((row) => {
    const author = toPublicUser(row.author);
    if (!author) return [];
    return [
      {
        id: row.id,
        text: row.text,
        createdAt: row.createdAt,
        author: {
          id: author.id,
          name: author.name,
          username: author.username,
          image: author.image,
        },
        exercise: row.exercise,
        workout:
          row.workoutId && row.workout?.id
            ? { id: row.workout.id, name: row.workout.name }
            : null,
      },
    ];
  });
}

export async function createComment(data: CommentInsert) {
  const [row] = await db.insert(comments).values(data).returning();
  if (!row) return null;

  const [authorRow] = await db
    .select(authorColumns)
    .from(user)
    .where(eq(user.id, row.authorId))
    .limit(1);

  const author = authorRow ? toPublicUser(authorRow) : null;
  if (!author) return null;

  return {
    id: row.id,
    exerciseId: row.exerciseId,
    workoutId: row.workoutId,
    text: row.text,
    role: row.role,
    mentions: row.mentions ?? [],
    meta: row.meta ?? {},
    createdAt: row.createdAt,
    parentId: row.parentId,
    authorId: row.authorId,
    author,
    unread: false,
  };
}

export async function getCommentById(id: string) {
  const [row] = await db
    .select({
      id: comments.id,
      exerciseId: comments.exerciseId,
      workoutId: comments.workoutId,
      text: comments.text,
      role: comments.role,
      mentions: comments.mentions,
      meta: comments.meta,
      createdAt: comments.createdAt,
      parentId: comments.parentId,
      authorId: comments.authorId,
    })
    .from(comments)
    .where(eq(comments.id, id))
    .limit(1);
  return row ?? null;
}

export async function updateCommentMeta(
  id: string,
  meta: NonNullable<CommentInsert["meta"]>,
) {
  const [row] = await db
    .update(comments)
    .set({ meta })
    .where(eq(comments.id, id))
    .returning();
  return row ?? null;
}
