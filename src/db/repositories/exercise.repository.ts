import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { exercise } from "@/db/schema";

export type ExerciseInsert = typeof exercise.$inferInsert;
export type ExerciseUpdate = Partial<
  Pick<ExerciseInsert, "name" | "videoUrl" | "imageUrl" | "metaData" | "tags">
>;

export async function listExercises() {
  return db.select().from(exercise).orderBy(asc(exercise.name));
}

export async function getExerciseById(id: string) {
  const [row] = await db
    .select()
    .from(exercise)
    .where(eq(exercise.id, id))
    .limit(1);
  return row ?? null;
}

export async function createExercise(data: ExerciseInsert) {
  const [row] = await db.insert(exercise).values(data).returning();
  return row;
}

export async function updateExercise(id: string, data: ExerciseUpdate) {
  const [row] = await db
    .update(exercise)
    .set(data)
    .where(eq(exercise.id, id))
    .returning();
  return row ?? null;
}

export async function deleteExercise(id: string) {
  const [row] = await db
    .delete(exercise)
    .where(eq(exercise.id, id))
    .returning();
  return row ?? null;
}
