import "server-only";

import { and, asc, eq, exists, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { comments, exercise, follow, user, workout } from "@/db/schema";
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

export function commentVisibleToViewer(viewerId: string) {
  return or(
    eq(comments.authorId, viewerId),
    exists(
      db
        .select({ one: sql`1` })
        .from(follow)
        .where(
          and(
            eq(follow.followerId, viewerId),
            eq(follow.followingId, comments.authorId),
          ),
        ),
    ),
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
      createdAt: comments.createdAt,
      authorId: comments.authorId,
      author: authorColumns,
    })
    .from(comments)
    .innerJoin(user, eq(user.id, comments.authorId))
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
        createdAt: row.createdAt,
        authorId: row.authorId,
        author,
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
    createdAt: row.createdAt,
    authorId: row.authorId,
    author,
  };
}
