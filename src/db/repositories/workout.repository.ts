import "server-only";

import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  max,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import {
  exercise,
  set as workoutSet,
  workout,
  workoutExercise,
} from "@/db/schema";
import type { MuscleGroup } from "@/db/schema/workout-schema";
import { isRestWorkoutItem } from "@/features/workouts/workout-item";

export type WorkoutInsert = typeof workout.$inferInsert;
export type WorkoutUpdate = Partial<
  Pick<WorkoutInsert, "name" | "author" | "channelUrl">
>;

export type ListWorkoutsOptions = {
  q?: string;
  muscleGroups?: MuscleGroup[];
};

export async function listWorkoutsForUser(
  userId: string,
  options?: ListWorkoutsOptions,
) {
  const q = options?.q?.trim() ?? "";
  const muscleGroups = options?.muscleGroups ?? [];
  const conditions = [eq(workout.userId, userId)];

  if (q) {
    const pattern = `%${q.replace(/[%_]/g, "\\$&")}%`;
    conditions.push(
      or(
        ilike(workout.name, pattern),
        ilike(workout.author, pattern),
        exists(
          db
            .select({ one: sql`1` })
            .from(workoutExercise)
            .innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
            .where(
              and(
                eq(workoutExercise.workoutId, workout.id),
                or(
                  sql`${exercise.muscleGroup}::text ilike ${pattern} escape '\\'`,
                  sql`exists (
                    select 1
                    from unnest(${exercise.keyMuscles}) as muscle
                    where muscle ilike ${pattern} escape '\\'
                  )`,
                ),
              ),
            ),
        ),
      )!,
    );
  }

  if (muscleGroups.length > 0) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(workoutExercise)
          .innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
          .where(
            and(
              eq(workoutExercise.workoutId, workout.id),
              inArray(exercise.muscleGroup, muscleGroups),
            ),
          ),
      ),
    );
  }

  const workouts = await db
    .select()
    .from(workout)
    .where(and(...conditions))
    .orderBy(desc(workout.createdAt));

  if (workouts.length === 0) return [];

  const ids = workouts.map((item) => item.id);

  const [exerciseRows, setRows] = await Promise.all([
    db
      .select({
        workoutId: workoutExercise.workoutId,
        name: workoutExercise.name,
        tags: workoutExercise.tags,
        videoUrl: workoutExercise.videoUrl,
      })
      .from(workoutExercise)
      .where(inArray(workoutExercise.workoutId, ids)),
    db
      .select({
        workoutId: workoutSet.workoutId,
        setCount: count(),
        loggedExerciseCount: countDistinct(workoutSet.exerciseId),
        volume: sql<number>`coalesce(sum(
          case
            when ${workoutSet.weight} is not null and ${workoutSet.reps} is not null
            then ${workoutSet.weight} * ${workoutSet.reps}
            else 0
          end
        ), 0)`.mapWith(Number),
        lastLoggedAt: max(workoutSet.createdAt),
      })
      .from(workoutSet)
      .where(inArray(workoutSet.workoutId, ids))
      .groupBy(workoutSet.workoutId),
  ]);

  const exerciseByWorkout = new Map<string, number>();
  const videoUrlByWorkout = new Map<string, string | null>();
  for (const row of exerciseRows) {
    if (isRestWorkoutItem(row)) continue;
    exerciseByWorkout.set(
      row.workoutId,
      (exerciseByWorkout.get(row.workoutId) ?? 0) + 1,
    );
    if (!videoUrlByWorkout.has(row.workoutId) && row.videoUrl) {
      videoUrlByWorkout.set(row.workoutId, row.videoUrl);
    }
  }
  const setByWorkout = new Map(
    setRows.map((row) => [
      row.workoutId,
      {
        setCount: Number(row.setCount),
        loggedExerciseCount: Number(row.loggedExerciseCount),
        volume: Number(row.volume) || 0,
        lastLoggedAt: row.lastLoggedAt ?? null,
      },
    ]),
  );

  // Chronological order (oldest → newest) for volume progression vs prior session.
  const chronological = [...workouts].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const volumeChangeById = new Map<string, number | null>();
  let previousVolume: number | null = null;

  for (const item of chronological) {
    const volume = setByWorkout.get(item.id)?.volume ?? 0;
    if (previousVolume != null && previousVolume > 0 && volume > 0) {
      volumeChangeById.set(
        item.id,
        ((volume - previousVolume) / previousVolume) * 100,
      );
    } else {
      volumeChangeById.set(item.id, null);
    }
    if (volume > 0) previousVolume = volume;
  }

  return workouts.map((item) => {
    const setStats = setByWorkout.get(item.id);
    return {
      ...item,
      videoUrl: videoUrlByWorkout.get(item.id) ?? null,
      stats: {
        exerciseCount: exerciseByWorkout.get(item.id) ?? 0,
        setCount: setStats?.setCount ?? 0,
        loggedExerciseCount: setStats?.loggedExerciseCount ?? 0,
        volume: setStats?.volume ?? 0,
        lastLoggedAt: setStats?.lastLoggedAt ?? null,
        volumeChangePct: volumeChangeById.get(item.id) ?? null,
      },
    };
  });
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
