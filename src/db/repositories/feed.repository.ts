import "server-only";

import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";

import { db } from "@/db";
import { follow, user, workout } from "@/db/schema";
import { canViewUserWorkouts } from "@/features/social/privacy";
import type { PublicUser } from "@/db/repositories/social.repository";
import {
  getUserById,
  listFollowing,
} from "@/db/repositories/social.repository";
import {
  enrichWorkoutsWithStats,
  sqlContainsPattern,
  workoutContentSearchCondition,
  workoutMuscleGroupCondition,
  type ListWorkoutsOptions,
} from "@/db/repositories/workout.repository";

export async function listVisibleWorkoutsForUser(
  viewerId: string,
  owner: PublicUser,
) {
  if (!(await canViewUserWorkouts(viewerId, owner))) {
    return null;
  }

  return db
    .select({
      id: workout.id,
      name: workout.name,
      userId: workout.userId,
      createdAt: workout.createdAt,
    })
    .from(workout)
    .where(eq(workout.userId, owner.id))
    .orderBy(desc(workout.createdAt));
}

export async function getVisibleWorkoutById(
  viewerId: string,
  workoutId: string,
) {
  const [row] = await db
    .select({
      id: workout.id,
      name: workout.name,
      author: workout.author,
      channelUrl: workout.channelUrl,
      userId: workout.userId,
      createdAt: workout.createdAt,
    })
    .from(workout)
    .where(eq(workout.id, workoutId))
    .limit(1);

  if (!row) return null;

  const owner = await getUserById(row.userId);
  if (!owner) return null;
  if (!(await canViewUserWorkouts(viewerId, owner))) {
    return null;
  }

  return { ...row, owner };
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
  const conditions = [inArray(workout.userId, followingIds)];

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
      userId: workout.userId,
      createdAt: workout.createdAt,
      ownerName: user.name,
      ownerUsername: user.username,
      ownerImage: user.image,
      ownerIsPrivate: user.isPrivate,
    })
    .from(workout)
    .innerJoin(user, eq(user.id, workout.userId))
    .innerJoin(
      follow,
      and(
        eq(follow.followingId, workout.userId),
        eq(follow.followerId, viewerId),
      ),
    )
    .where(and(...conditions))
    .orderBy(desc(workout.createdAt));

  const rows = options?.limit ? await query.limit(options.limit) : await query;

  const visible = rows.flatMap((row) => {
    if (!row.ownerUsername) return [];
    return [row];
  });
  if (visible.length === 0) return [];

  const enriched = await enrichWorkoutsWithStats(
    visible.map((row) => ({
      id: row.id,
      name: row.name,
      author: row.author,
      channelUrl: row.channelUrl,
      userId: row.userId,
      createdAt: row.createdAt,
    })),
  );

  const ownerById = new Map(
    visible.map((row) => [
      row.id,
      {
        id: row.userId,
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
