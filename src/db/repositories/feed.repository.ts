import "server-only";

import { and, desc, eq, ilike, inArray, isNull, or } from "drizzle-orm";

import { db } from "@/db";
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
import { follow, user, workout, workoutMembership } from "@/db/schema";

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

  const uniqueMemberships = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!row.ownerUsername) continue;
    uniqueMemberships.set(`${row.id}:${row.memberUserId}`, row);
  }
  const visible = [...uniqueMemberships.values()];
  if (visible.length === 0) return [];

  const byMember = new Map<string, typeof visible>();
  for (const row of visible) {
    const list = byMember.get(row.memberUserId) ?? [];
    list.push(row);
    byMember.set(row.memberUserId, list);
  }

  const sections = await Promise.all(
    [...byMember.entries()].map(async ([memberUserId, memberRows]) => {
      const enriched = await enrichWorkoutsWithStats(
        memberRows.map((row) => ({
          id: row.id,
          name: row.name,
          author: row.author,
          channelUrl: row.channelUrl,
          youtubeVideoId: row.youtubeVideoId,
          userId: memberUserId,
          archivedAt: row.archivedAt,
          createdAt: row.createdAt,
        })),
        { viewerId: memberUserId },
      );

      return enriched.map((item, index) => {
        const row = memberRows[index]!;
        return {
          ...item,
          owner: {
            id: memberUserId,
            name: row.ownerName,
            username: row.ownerUsername!,
            image: row.ownerImage,
            isPrivate: row.ownerIsPrivate,
          },
        };
      });
    }),
  );

  return sections.flat();
}
