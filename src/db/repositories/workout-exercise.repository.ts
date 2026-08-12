import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { workoutExercise } from "@/db/schema";
import type { ExerciseMetaData } from "@/db/schema/workout-schema";

export type WorkoutExerciseInsert = typeof workoutExercise.$inferInsert;

export type WorkoutExerciseUpdate = Partial<{
  workoutId: string;
  exerciseId: string;
  name: string;
  videoUrl: string | null;
  imageUrl: string | null;
  metaData: ExerciseMetaData | null;
  tags: string[];
}>;

export async function listWorkoutExercises(filters?: {
  workoutId?: string;
  exerciseId?: string;
}) {
  const conditions = [];
  if (filters?.workoutId) {
    conditions.push(eq(workoutExercise.workoutId, filters.workoutId));
  }
  if (filters?.exerciseId) {
    conditions.push(eq(workoutExercise.exerciseId, filters.exerciseId));
  }

  const query = db.select().from(workoutExercise);
  if (conditions.length === 0) {
    return query;
  }
  return query.where(and(...conditions));
}

export async function getWorkoutExercise(
  workoutId: string,
  exerciseId: string,
) {
  const [row] = await db
    .select()
    .from(workoutExercise)
    .where(
      and(
        eq(workoutExercise.workoutId, workoutId),
        eq(workoutExercise.exerciseId, exerciseId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createWorkoutExercise(data: WorkoutExerciseInsert) {
  const [row] = await db.insert(workoutExercise).values(data).returning();
  return row;
}

export async function updateWorkoutExercise(
  workoutId: string,
  exerciseId: string,
  data: WorkoutExerciseUpdate,
) {
  const nextWorkoutId = data.workoutId ?? workoutId;
  const nextExerciseId = data.exerciseId ?? exerciseId;
  const keysChanged =
    nextWorkoutId !== workoutId || nextExerciseId !== exerciseId;

  const presentation = {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.videoUrl !== undefined ? { videoUrl: data.videoUrl } : {}),
    ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
    ...(data.metaData !== undefined ? { metaData: data.metaData } : {}),
    ...(data.tags !== undefined ? { tags: data.tags } : {}),
  };

  if (!keysChanged) {
    if (Object.keys(presentation).length === 0) {
      return getWorkoutExercise(workoutId, exerciseId);
    }
    const [row] = await db
      .update(workoutExercise)
      .set(presentation)
      .where(
        and(
          eq(workoutExercise.workoutId, workoutId),
          eq(workoutExercise.exerciseId, exerciseId),
        ),
      )
      .returning();
    return row ?? null;
  }

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(workoutExercise)
      .where(
        and(
          eq(workoutExercise.workoutId, workoutId),
          eq(workoutExercise.exerciseId, exerciseId),
        ),
      )
      .limit(1);

    if (!existing) return null;

    await tx
      .delete(workoutExercise)
      .where(
        and(
          eq(workoutExercise.workoutId, workoutId),
          eq(workoutExercise.exerciseId, exerciseId),
        ),
      );

    const [row] = await tx
      .insert(workoutExercise)
      .values({
        workoutId: nextWorkoutId,
        exerciseId: nextExerciseId,
        name: data.name ?? existing.name,
        videoUrl:
          data.videoUrl !== undefined ? data.videoUrl : existing.videoUrl,
        imageUrl:
          data.imageUrl !== undefined ? data.imageUrl : existing.imageUrl,
        metaData:
          data.metaData !== undefined ? data.metaData : existing.metaData,
        tags: data.tags ?? existing.tags,
      })
      .returning();

    return row;
  });
}

export async function deleteWorkoutExercise(
  workoutId: string,
  exerciseId: string,
) {
  const [row] = await db
    .delete(workoutExercise)
    .where(
      and(
        eq(workoutExercise.workoutId, workoutId),
        eq(workoutExercise.exerciseId, exerciseId),
      ),
    )
    .returning();
  return row ?? null;
}
