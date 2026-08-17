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
  min,
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
import type { MetricProfile, MuscleGroup } from "@/db/schema/workout-schema";
import {
  communityWorkoutTierProgress,
  prescribedSetsFromTargets,
  workoutTierProgress,
  type WorkoutRosterExercise,
} from "@/features/achievements/evaluate";
import { dayKey, lastTwoIsoWeeksLogged } from "@/features/workouts/set-day";
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
  options?: {
    viewerId?: string;
    includeSetStats?: boolean;
    includeCommunityStats?: boolean;
  },
) {
  if (workouts.length === 0) return [];

  const ids = workouts.map((item) => item.id);
  const includeSetStats = options?.includeSetStats !== false;
  const includeCommunityStats = options?.includeCommunityStats === true;
  const setViewerFilter = options?.viewerId
    ? and(
      inArray(workoutSet.workoutId, ids),
      eq(workoutSet.userId, options.viewerId),
    )
    : inArray(workoutSet.workoutId, ids);

  const emptySetQuery = Promise.resolve(
    [] as {
      workoutId: string;
      setCount: number;
      loggedExerciseCount: number;
      volume: number;
      lastLoggedAt: Date | null;
    }[],
  );
  const emptyDayQuery = Promise.resolve(
    [] as { workoutId: string; loggedAt: Date }[],
  );
  const emptyLadderQuery = Promise.resolve(
    [] as {
      workoutId: string;
      exerciseId: string;
      updatedAt: Date;
      metricProfile: MetricProfile | null;
      reps: number | null;
      weight: number | null;
      time: number | null;
      distance: number | null;
    }[],
  );
  const emptyCommunitySetQuery = Promise.resolve(
    [] as {
      workoutId: string;
      userId: string;
      exerciseId: string;
      updatedAt: Date;
      metricProfile: MetricProfile | null;
      reps: number | null;
      weight: number | null;
      time: number | null;
      distance: number | null;
    }[],
  );
  const emptyMemberQuery = Promise.resolve(
    [] as { workoutId: string; memberCount: number }[],
  );

  const [
    exerciseRows,
    setRows,
    dayRows,
    ladderSetRows,
    communitySetRows,
    memberRows,
  ] = await Promise.all([
    db
      .select({
        workoutId: workoutExercise.workoutId,
        exerciseId: workoutExercise.exerciseId,
        name: workoutExercise.name,
        tags: workoutExercise.tags,
        videoUrl: workoutExercise.videoUrl,
        metaData: workoutExercise.metaData,
        metricProfile: exercise.metricProfile,
      })
      .from(workoutExercise)
      .innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
      .where(inArray(workoutExercise.workoutId, ids)),
    includeSetStats
      ? db
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
        .groupBy(workoutSet.workoutId)
      : emptySetQuery,
    includeSetStats
      ? db
        .select({
          workoutId: workoutSet.workoutId,
          loggedAt: min(workoutSet.createdAt),
        })
        .from(workoutSet)
        .where(setViewerFilter)
        .groupBy(
          workoutSet.workoutId,
          sql`date_trunc('day', ${workoutSet.createdAt})`,
        )
      : emptyDayQuery,
    includeSetStats && options?.viewerId
      ? db
        .select({
          workoutId: workoutSet.workoutId,
          exerciseId: workoutSet.exerciseId,
          updatedAt: workoutSet.updatedAt,
          metricProfile: exercise.metricProfile,
          reps: workoutSet.reps,
          weight: workoutSet.weight,
          time: workoutSet.time,
          distance: workoutSet.distance,
        })
        .from(workoutSet)
        .innerJoin(exercise, eq(exercise.id, workoutSet.exerciseId))
        .where(setViewerFilter)
      : emptyLadderQuery,
    includeCommunityStats
      ? db
        .select({
          workoutId: workoutSet.workoutId,
          userId: workoutSet.userId,
          exerciseId: workoutSet.exerciseId,
          updatedAt: workoutSet.updatedAt,
          metricProfile: exercise.metricProfile,
          reps: workoutSet.reps,
          weight: workoutSet.weight,
          time: workoutSet.time,
          distance: workoutSet.distance,
        })
        .from(workoutSet)
        .innerJoin(exercise, eq(exercise.id, workoutSet.exerciseId))
        .where(inArray(workoutSet.workoutId, ids))
      : emptyCommunitySetQuery,
    includeCommunityStats
      ? db
        .select({
          workoutId: workoutMembership.workoutId,
          memberCount: count(),
        })
        .from(workoutMembership)
        .where(inArray(workoutMembership.workoutId, ids))
        .groupBy(workoutMembership.workoutId)
      : emptyMemberQuery,
  ]);

  const exerciseByWorkout = new Map<string, number>();
  const rosterByWorkout = new Map<string, WorkoutRosterExercise[]>();
  const videoUrlByWorkout = new Map<string, string | null>();
  for (const row of exerciseRows) {
    if (isRestWorkoutItem(row)) continue;
    exerciseByWorkout.set(
      row.workoutId,
      (exerciseByWorkout.get(row.workoutId) ?? 0) + 1,
    );
    const roster = rosterByWorkout.get(row.workoutId) ?? [];
    roster.push({
      exerciseId: row.exerciseId,
      metricProfile: row.metricProfile,
      prescribedSets: prescribedSetsFromTargets(row.metaData?.targets),
    });
    rosterByWorkout.set(row.workoutId, roster);
    if (!videoUrlByWorkout.has(row.workoutId) && row.videoUrl) {
      videoUrlByWorkout.set(row.workoutId, row.videoUrl);
    }
  }
  const ladderRowsByWorkout = new Map<
    string,
    {
      workoutId: string;
      exerciseId: string;
      updatedAt: Date | string;
      metricProfile: MetricProfile | null;
      reps: number | null;
      weight: number | null;
      time: number | null;
      distance: number | null;
    }[]
  >();
  for (const row of ladderSetRows) {
    const list = ladderRowsByWorkout.get(row.workoutId) ?? [];
    list.push(row);
    ladderRowsByWorkout.set(row.workoutId, list);
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
  const daysByWorkout = new Map<string, string[]>();
  for (const row of dayRows) {
    if (!row.loggedAt) continue;
    const days = daysByWorkout.get(row.workoutId) ?? [];
    days.push(dayKey(row.loggedAt));
    daysByWorkout.set(row.workoutId, days);
  }
  const memberCountByWorkout = new Map(
    memberRows.map((row) => [row.workoutId, Number(row.memberCount)]),
  );
  const communityRowsByWorkoutUser = new Map<
    string,
    Map<
      string,
      {
        workoutId: string;
        exerciseId: string;
        updatedAt: Date | string;
        metricProfile: MetricProfile | null;
        reps: number | null;
        weight: number | null;
        time: number | null;
        distance: number | null;
      }[]
    >
  >();
  for (const row of communitySetRows) {
    const byUser = communityRowsByWorkoutUser.get(row.workoutId) ?? new Map();
    const list = byUser.get(row.userId) ?? [];
    list.push(row);
    byUser.set(row.userId, list);
    communityRowsByWorkoutUser.set(row.workoutId, byUser);
  }

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
    const ladderRows = (ladderRowsByWorkout.get(item.id) ?? []).map((row) => ({
      workoutId: row.workoutId,
      exerciseId: row.exerciseId,
      muscleGroup: null,
      keyMuscles: [],
      metricProfile: row.metricProfile,
      reps: row.reps,
      weight: row.weight,
      time: row.time,
      distance: row.distance,
      updatedAt: row.updatedAt,
    }));
    const roster = rosterByWorkout.get(item.id) ?? [];
    const viewerTiers = workoutTierProgress(ladderRows, roster);
    const communityUsers = [
      ...(communityRowsByWorkoutUser.get(item.id)?.values() ?? []),
    ].map((rows) =>
      rows.map((row) => ({
        workoutId: row.workoutId,
        exerciseId: row.exerciseId,
        muscleGroup: null,
        keyMuscles: [],
        metricProfile: row.metricProfile,
        reps: row.reps,
        weight: row.weight,
        time: row.time,
        distance: row.distance,
        updatedAt: row.updatedAt,
      })),
    );
    const community = includeCommunityStats
      ? communityWorkoutTierProgress(communityUsers, roster)
      : null;
    const achievementTiers = community?.tiers ?? viewerTiers;
    const bronze = achievementTiers.find((tier) => tier.tier === "bronze");
    return {
      ...item,
      videoUrl: videoUrlByWorkout.get(item.id) ?? null,
      stats: {
        exerciseCount: exerciseByWorkout.get(item.id) ?? 0,
        setCount: setStats?.setCount ?? 0,
        loggedExerciseCount: setStats?.loggedExerciseCount ?? 0,
        volume: setStats?.volume ?? 0,
        lastLoggedAt: setStats?.lastLoggedAt ?? null,
        loggedDayCount: daysByWorkout.get(item.id)?.length ?? 0,
        loggedLast14Days: lastTwoIsoWeeksLogged(
          daysByWorkout.get(item.id) ?? [],
        ),
        volumeChangePct: volumeChangeById.get(item.id) ?? null,
        achievementUnlockedCount: bronze?.unlocked ?? 0,
        achievementTotalCount: bronze?.total ?? 0,
        achievementTiers,
        memberCount: memberCountByWorkout.get(item.id) ?? 0,
        completedCount: community?.completedCount ?? 0,
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
  _viewerId: string,
  options?: ListWorkoutsOptions,
) {
  const conditions = [isNull(workout.archivedAt)];
  applyListFilters(conditions, options);

  const workouts = await db
    .select()
    .from(workout)
    .where(and(...conditions))
    .orderBy(desc(workout.createdAt));

  return enrichWorkoutsWithStats(workouts, {
    includeSetStats: false,
    includeCommunityStats: true,
  });
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
