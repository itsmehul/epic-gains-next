import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { workout } from "@/db/schema";

export type WorkoutInsert = typeof workout.$inferInsert;
export type WorkoutUpdate = Partial<Pick<WorkoutInsert, "name">>;

export async function listWorkoutsForUser(userId: string) {
  return db
    .select()
    .from(workout)
    .where(eq(workout.userId, userId))
    .orderBy(asc(workout.name));
}

export async function getWorkoutByIdForUser(id: string, userId: string) {
  const [row] = await db
    .select()
    .from(workout)
    .where(and(eq(workout.id, id), eq(workout.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function createWorkout(data: WorkoutInsert) {
  const [row] = await db.insert(workout).values(data).returning();
  return row;
}

export async function updateWorkoutForUser(
  id: string,
  userId: string,
  data: WorkoutUpdate,
) {
  const [row] = await db
    .update(workout)
    .set(data)
    .where(and(eq(workout.id, id), eq(workout.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteWorkoutForUser(id: string, userId: string) {
  const [row] = await db
    .delete(workout)
    .where(and(eq(workout.id, id), eq(workout.userId, userId)))
    .returning();
  return row ?? null;
}
