import "server-only";

import type { SQL } from "drizzle-orm";
import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  isNull,
  max,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import { getUserById } from "@/db/repositories/social.repository";
import { insertWorkoutMembership } from "@/db/repositories/workout-membership.repository";
import {
  exercise,
  workout,
  workoutExercise,
  workoutMembership,
  set as workoutSet,
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

export type WorkoutRow = typeof workout.$inferSelect;

export function sqlContainsPattern(q: string) {
  return `%${q.replace(/[%_]/g, "\\$&")}%`;
}

export function workoutContentSearchCondition(q: string) {
  const pattern = sqlContainsPattern(q);
  return or(
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
  )!;
}

export function workoutMuscleGroupCondition(muscleGroups: MuscleGroup[]) {
  return exists(
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
  );
}

export async function enrichWorkoutsWithStats<T extends WorkoutRow>(
  workouts: T[],
  options?: { viewerId?: string },
) {
  if (workouts.length === 0) return [];

  const ids = workouts.map((item) => item.id);
  const setViewerFilter = options?.viewerId
    ? and(
      inArray(workoutSet.workoutId, ids),
      eq(workoutSet.userId, options.viewerId),
    )
    : inArray(workoutSet.workoutId, ids);

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
      .where(setViewerFilter)
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

  const byOwner = new Map<string, T[]>();
  for (const item of workouts) {
    const ownerKey = item.userId ?? item.id;
    const list = byOwner.get(ownerKey) ?? [];
    list.push(item);
    byOwner.set(ownerKey, list);
  }

  const volumeChangeById = new Map<string, number | null>();
  for (const ownerWorkouts of byOwner.values()) {
    const chronological = [...ownerWorkouts].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
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

function applyListFilters(conditions: SQL[], options?: ListWorkoutsOptions) {
  const q = options?.q?.trim() ?? "";
  const muscleGroups = options?.muscleGroups ?? [];
  if (q) conditions.push(workoutContentSearchCondition(q));
  if (muscleGroups.length > 0) {
    conditions.push(workoutMuscleGroupCondition(muscleGroups));
  }
  return conditions;
}

export async function listMyWorkouts(
  userId: string,
  options?: ListWorkoutsOptions,
) {
  const conditions = [eq(workoutMembership.userId, userId)];
  applyListFilters(conditions, options);

  const workouts = await db
    .select({
      id: workout.id,
      name: workout.name,
      author: workout.author,
      channelUrl: workout.channelUrl,
      youtubeVideoId: workout.youtubeVideoId,
      userId: workout.userId,
      archivedAt: workout.archivedAt,
      createdAt: workout.createdAt,
    })
    .from(workout)
    .innerJoin(
      workoutMembership,
      eq(workoutMembership.workoutId, workout.id),
    )
    .where(and(...conditions))
    .orderBy(desc(workout.createdAt));

  return enrichWorkoutsWithStats(workouts, { viewerId: userId });
}

/** @deprecated use listMyWorkouts */
export async function listWorkoutsForUser(
  userId: string,
  options?: ListWorkoutsOptions,
) {
  return listMyWorkouts(userId, options);
}

export async function listCatalogWorkouts(
  viewerId: string,
  options?: ListWorkoutsOptions,
) {
  const conditions = [isNull(workout.archivedAt)];
  applyListFilters(conditions, options);

  const workouts = await db
    .select()
    .from(workout)
    .where(and(...conditions))
    .orderBy(desc(workout.createdAt));

  return enrichWorkoutsWithStats(workouts, { viewerId });
}

export async function listWorkoutsForProfile(profileUserId: string) {
  const workouts = await db
    .select({
      id: workout.id,
      name: workout.name,
      author: workout.author,
      channelUrl: workout.channelUrl,
      youtubeVideoId: workout.youtubeVideoId,
      userId: workout.userId,
      archivedAt: workout.archivedAt,
      createdAt: workout.createdAt,
    })
    .from(workout)
    .innerJoin(
      workoutMembership,
      eq(workoutMembership.workoutId, workout.id),
    )
    .where(
      and(
        eq(workoutMembership.userId, profileUserId),
        isNull(workout.archivedAt),
      ),
    )
    .orderBy(desc(workout.createdAt));

  return enrichWorkoutsWithStats(workouts, { viewerId: profileUserId });
}

export async function getWorkoutById(id: string) {
  const [row] = await db
    .select()
    .from(workout)
    .where(eq(workout.id, id))
    .limit(1);
  return row ?? null;
}

export async function getWorkoutByYoutubeVideoId(youtubeVideoId: string) {
  const [row] = await db
    .select()
    .from(workout)
    .where(eq(workout.youtubeVideoId, youtubeVideoId))
    .limit(1);
  return row ?? null;
}

export async function getWorkoutByIdForUser(id: string, userId: string) {
  const [row] = await db
    .select()
    .from(workout)
    .where(
      and(eq(workout.id, id), eq(workout.userId, userId), isNull(workout.archivedAt)),
    )
    .limit(1);
  return row ?? null;
}

export async function createWorkout(data: WorkoutInsert) {
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(workout).values(data).returning();
    if (!row) throw new Error("Failed to create workout");
    if (data.userId) {
      await insertWorkoutMembership(
        { workoutId: row.id, userId: data.userId, role: "OWNER" },
        tx,
      );
    }
    return row;
  });
}

export async function updateWorkoutForUser(
  id: string,
  userId: string,
  data: WorkoutUpdate,
) {
  const [row] = await db
    .update(workout)
    .set(data)
    .where(
      and(
        eq(workout.id, id),
        eq(workout.userId, userId),
        isNull(workout.archivedAt),
      ),
    )
    .returning();
  return row ?? null;
}

export async function archiveWorkoutForUser(id: string, userId: string) {
  const [row] = await db
    .update(workout)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(workout.id, id),
        eq(workout.userId, userId),
        isNull(workout.archivedAt),
      ),
    )
    .returning();
  return row ?? null;
}

export async function deleteWorkoutForUser(id: string, userId: string) {
  return archiveWorkoutForUser(id, userId);
}

export async function getWorkoutOwnerPublic(userId: string | null) {
  if (!userId) return null;
  return getUserById(userId);
}
