import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { set as workoutSet } from "@/db/schema";

export type SetInsert = typeof workoutSet.$inferInsert;
export type SetUpdate = Partial<
  Pick<
    SetInsert,
    "reps" | "weight" | "time" | "distance" | "workoutId" | "exerciseId"
  >
>;

export async function listSets(filters?: {
  workoutId?: string;
  exerciseId?: string;
}) {
  const conditions = [];
  if (filters?.workoutId) {
    conditions.push(eq(workoutSet.workoutId, filters.workoutId));
  }
  if (filters?.exerciseId) {
    conditions.push(eq(workoutSet.exerciseId, filters.exerciseId));
  }

  const query = db.select().from(workoutSet);
  if (conditions.length === 0) {
    return query;
  }
  return query.where(and(...conditions));
}

export async function getSetById(id: string) {
  const [row] = await db
    .select()
    .from(workoutSet)
    .where(eq(workoutSet.id, id))
    .limit(1);
  return row ?? null;
}

export async function createSet(data: SetInsert) {
  const [row] = await db.insert(workoutSet).values(data).returning();
  return row;
}

export async function updateSet(id: string, data: SetUpdate) {
  const [row] = await db
    .update(workoutSet)
    .set(data)
    .where(eq(workoutSet.id, id))
    .returning();
  return row ?? null;
}

export async function deleteSet(id: string) {
  const [row] = await db
    .delete(workoutSet)
    .where(eq(workoutSet.id, id))
    .returning();
  return row ?? null;
}
