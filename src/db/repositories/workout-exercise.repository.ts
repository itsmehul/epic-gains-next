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

export async function getWorkoutExerciseById(id: string) {
  const [row] = await db
    .select()
    .from(workoutExercise)
    .where(eq(workoutExercise.id, id))
    .limit(1);
  return row ?? null;
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
  const [row] = await db
    .insert(workoutExercise)
    .values({
      ...data,
      id: data.id ?? crypto.randomUUID(),
    })
    .returning();
  return row;
}

export async function updateWorkoutExercise(
  id: string,
  data: WorkoutExerciseUpdate,
) {
  if (Object.keys(data).length === 0) {
    return getWorkoutExerciseById(id);
  }

  const [row] = await db
    .update(workoutExercise)
    .set(data)
    .where(eq(workoutExercise.id, id))
    .returning();
  return row ?? null;
}

export async function deleteWorkoutExercise(id: string) {
  const [row] = await db
    .delete(workoutExercise)
    .where(eq(workoutExercise.id, id))
    .returning();
  return row ?? null;
}
