import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { workoutExercise } from "@/db/schema";

export type WorkoutExerciseInsert = typeof workoutExercise.$inferInsert;

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
  data: { workoutId?: string; exerciseId?: string },
) {
  const nextWorkoutId = data.workoutId ?? workoutId;
  const nextExerciseId = data.exerciseId ?? exerciseId;

  if (nextWorkoutId === workoutId && nextExerciseId === exerciseId) {
    return getWorkoutExercise(workoutId, exerciseId);
  }

  return db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(workoutExercise)
      .where(
        and(
          eq(workoutExercise.workoutId, workoutId),
          eq(workoutExercise.exerciseId, exerciseId),
        ),
      )
      .returning();

    if (!deleted) {
      return null;
    }

    const [row] = await tx
      .insert(workoutExercise)
      .values({
        workoutId: nextWorkoutId,
        exerciseId: nextExerciseId,
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
