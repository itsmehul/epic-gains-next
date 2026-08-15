import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  set as workoutSet,
  workout,
  workoutMembership,
} from "@/db/schema";
import type { WorkoutMembershipRole } from "@/db/schema/workout-schema";

type DbLike = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function getWorkoutMembership(
  workoutId: string,
  userId: string,
  dbOrTx: DbLike = db,
) {
  const [row] = await dbOrTx
    .select()
    .from(workoutMembership)
    .where(
      and(
        eq(workoutMembership.workoutId, workoutId),
        eq(workoutMembership.userId, userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function isWorkoutOwner(workoutId: string, userId: string) {
  const [row] = await db
    .select({ id: workout.id })
    .from(workout)
    .where(and(eq(workout.id, workoutId), eq(workout.userId, userId)))
    .limit(1);
  return Boolean(row);
}

export async function assertWorkoutOwner(workoutId: string, userId: string) {
  const [row] = await db
    .select()
    .from(workout)
    .where(and(eq(workout.id, workoutId), eq(workout.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function insertWorkoutMembership(
  data: {
    workoutId: string;
    userId: string;
    role: WorkoutMembershipRole;
  },
  dbOrTx: DbLike = db,
) {
  await dbOrTx
    .insert(workoutMembership)
    .values(data)
    .onConflictDoNothing();
}

export async function ensureMemberFromSet(
  workoutId: string,
  userId: string,
  dbOrTx: DbLike = db,
) {
  const owned = await dbOrTx
    .select({ id: workout.id })
    .from(workout)
    .where(and(eq(workout.id, workoutId), eq(workout.userId, userId)))
    .limit(1);
  if (owned[0]) {
    await insertWorkoutMembership(
      { workoutId, userId, role: "OWNER" },
      dbOrTx,
    );
    return;
  }
  await insertWorkoutMembership(
    { workoutId, userId, role: "MEMBER" },
    dbOrTx,
  );
}

export async function dropMemberIfNoSets(
  workoutId: string,
  userId: string,
  dbOrTx: DbLike = db,
) {
  const membership = await getWorkoutMembership(workoutId, userId, dbOrTx);
  if (!membership || membership.role === "OWNER") return;

  const [row] = await dbOrTx
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(workoutSet)
    .where(
      and(eq(workoutSet.workoutId, workoutId), eq(workoutSet.userId, userId)),
    );

  if ((row?.n ?? 0) > 0) return;

  await dbOrTx
    .delete(workoutMembership)
    .where(
      and(
        eq(workoutMembership.workoutId, workoutId),
        eq(workoutMembership.userId, userId),
        eq(workoutMembership.role, "MEMBER"),
      ),
    );
}
