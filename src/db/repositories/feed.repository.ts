import "server-only";

import { and, desc, eq, ilike, inArray, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { follow, user, workout, workoutMembership } from "@/db/schema";
import {
  getUserById,
  listFollowing,
} from "@/db/repositories/social.repository";
import {
  enrichWorkoutsWithStats,
  getWorkoutById,
  sqlContainsPattern,
  workoutContentSearchCondition,
  workoutMuscleGroupCondition,
  type ListWorkoutsOptions,
} from "@/db/repositories/workout.repository";

export async function listVisibleWorkoutsForUser(
  _viewerId: string,
  owner: { id: string },
) {
  const rows = await db
    .select({
      id: workout.id,
      name: workout.name,
      userId: workout.userId,
      createdAt: workout.createdAt,
    })
    .from(workout)
    .innerJoin(
      workoutMembership,
      eq(workoutMembership.workoutId, workout.id),
    )
    .where(eq(workoutMembership.userId, owner.id))
    .orderBy(desc(workout.createdAt));
  return rows;
}

export async function getVisibleWorkoutById(
  _viewerId: string,
  workoutId: string,
) {
  const row = await getWorkoutById(workoutId);
  if (!row) return null;

  const owner = row.userId ? await getUserById(row.userId) : null;
  return {
    ...row,
    owner: owner ?? {
      id: row.userId ?? "",
      name: "Unknown",
      username: "",
      image: null,
      isPrivate: false,
    },
  };
}

export async function listFollowingFeed(
  viewerId: string,
  options?: ListWorkoutsOptions & { limit?: number },
) {
  const following = await listFollowing(viewerId);
  if (following.length === 0) return [];

  const followingIds = following.map((u) => u.id);
  const q = options?.q?.trim() ?? "";
  const muscleGroups = options?.muscleGroups ?? [];
  const conditions = [
    isNull(workout.archivedAt),
    inArray(workoutMembership.userId, followingIds),
  ];

  if (q) {
    const pattern = sqlContainsPattern(q);
    conditions.push(
      or(
        workoutContentSearchCondition(q),
        ilike(user.name, pattern),
        ilike(user.username, pattern),
      )!,
    );
  }
  if (muscleGroups.length > 0) {
    conditions.push(workoutMuscleGroupCondition(muscleGroups));
  }

  const query = db
    .select({
      id: workout.id,
      name: workout.name,
      author: workout.author,
      channelUrl: workout.channelUrl,
      youtubeVideoId: workout.youtubeVideoId,
      userId: workout.userId,
      archivedAt: workout.archivedAt,
      createdAt: workout.createdAt,
      memberUserId: workoutMembership.userId,
      ownerName: user.name,
      ownerUsername: user.username,
      ownerImage: user.image,
      ownerIsPrivate: user.isPrivate,
    })
    .from(workout)
    .innerJoin(
      workoutMembership,
      eq(workoutMembership.workoutId, workout.id),
    )
    .innerJoin(user, eq(user.id, workoutMembership.userId))
    .innerJoin(
      follow,
      and(
        eq(follow.followingId, workoutMembership.userId),
        eq(follow.followerId, viewerId),
      ),
    )
    .where(and(...conditions))
    .orderBy(desc(workout.createdAt));

  const rows = options?.limit ? await query.limit(options.limit) : await query;

  const uniqueWorkouts = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!row.ownerUsername) continue;
    if (!uniqueWorkouts.has(row.id)) uniqueWorkouts.set(row.id, row);
  }
  const visible = [...uniqueWorkouts.values()];
  if (visible.length === 0) return [];

  const enriched = await enrichWorkoutsWithStats(
    visible.map((row) => ({
      id: row.id,
      name: row.name,
      author: row.author,
      channelUrl: row.channelUrl,
      youtubeVideoId: row.youtubeVideoId,
      userId: row.userId,
      archivedAt: row.archivedAt,
      createdAt: row.createdAt,
    })),
    { viewerId },
  );

  const ownerById = new Map(
    visible.map((row) => [
      row.id,
      {
        id: row.userId ?? row.memberUserId,
        name: row.ownerName,
        username: row.ownerUsername!,
        image: row.ownerImage,
        isPrivate: row.ownerIsPrivate,
      },
    ]),
  );

  return enriched.flatMap((item) => {
    const owner = ownerById.get(item.id);
    if (!owner) return [];
    return [{ ...item, owner }];
  });
}
