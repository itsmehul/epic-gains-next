import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { follow, user, workout } from "@/db/schema";
import { canViewUserWorkouts } from "@/features/social/privacy";
import type { PublicUser } from "@/db/repositories/social.repository";
import {
  getUserById,
  listFollowing,
} from "@/db/repositories/social.repository";

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

export async function listFollowingFeed(viewerId: string, limit = 50) {
  const following = await listFollowing(viewerId);
  if (following.length === 0) return [];

  const followingIds = following.map((u) => u.id);
  const rows = await db
    .select({
      id: workout.id,
      name: workout.name,
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
    .where(inArray(workout.userId, followingIds))
    .orderBy(desc(workout.createdAt))
    .limit(limit);

  return rows.flatMap((row) => {
    if (!row.ownerUsername) return [];
    return [
      {
        id: row.id,
        name: row.name,
        userId: row.userId,
        createdAt: row.createdAt,
        author: {
          id: row.userId,
          name: row.ownerName,
          username: row.ownerUsername,
          image: row.ownerImage,
          isPrivate: row.ownerIsPrivate,
        },
      },
    ];
  });
}
