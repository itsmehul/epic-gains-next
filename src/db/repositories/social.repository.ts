import "server-only";

import { and, asc, count, eq, ilike, ne, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { follow, followRequest, trainerAssignment, user } from "@/db/schema";
import {
  normalizeUsername,
  usernameBaseFromIdentity,
} from "@/features/social/username";
import { defaultAvatarUrl } from "@/shared/avatar";

export type PublicUser = {
  id: string;
  name: string;
  username: string;
  image: string | null;
  isPrivate: boolean;
};

const publicUserColumns = {
  id: user.id,
  name: user.name,
  username: user.username,
  image: user.image,
  isPrivate: user.isPrivate,
};

export function toPublicUser(row: {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  isPrivate: boolean;
}): PublicUser | null {
  if (!row.username) return null;
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    image: row.image,
    isPrivate: row.isPrivate,
  };
}

export async function isUsernameTaken(
  username: string,
  excludeUserId?: string,
) {
  const normalized = normalizeUsername(username);
  const conditions = [eq(user.username, normalized)];
  if (excludeUserId) {
    conditions.push(ne(user.id, excludeUserId));
  }
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(...conditions))
    .limit(1);
  return Boolean(row);
}

export async function allocateUniqueUsername(name: string, email: string) {
  const base = usernameBaseFromIdentity(name, email);
  for (let i = 0; i < 50; i++) {
    const candidate =
      i === 0 ? base : `${base.slice(0, 24)}_${(i + Math.floor(Math.random() * 9000 + 1000)).toString()}`.slice(0, 30);
    if (!(await isUsernameTaken(candidate))) {
      return candidate;
    }
  }
  return `user_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export async function ensureUserSocialProfile(userId: string) {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      isPrivate: user.isPrivate,
      image: user.image,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!row) return null;

  if (!row.image?.trim()) {
    const image = defaultAvatarUrl(row.email);
    await db.update(user).set({ image }).where(eq(user.id, userId));
    row.image = image;
  }

  if (row.username) {
    return toPublicUser(row);
  }

  const username = await allocateUniqueUsername(row.name, row.email);
  const [updated] = await db
    .update(user)
    .set({ username })
    .where(and(eq(user.id, userId), sql`${user.username} is null`))
    .returning(publicUserColumns);

  if (updated) {
    return toPublicUser(updated);
  }

  const [again] = await db
    .select(publicUserColumns)
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return again ? toPublicUser(again) : null;
}

export async function getUserById(userId: string) {
  const [row] = await db
    .select(publicUserColumns)
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row ? toPublicUser(row) : null;
}

export async function getUserByUsername(username: string) {
  const [row] = await db
    .select(publicUserColumns)
    .from(user)
    .where(eq(user.username, normalizeUsername(username)))
    .limit(1);
  return row ? toPublicUser(row) : null;
}

export async function updateUserSocialProfile(
  userId: string,
  data: { username?: string; isPrivate?: boolean },
) {
  const patch: { username?: string; isPrivate?: boolean } = {};
  if (data.username !== undefined) {
    patch.username = normalizeUsername(data.username);
  }
  if (data.isPrivate !== undefined) {
    patch.isPrivate = data.isPrivate;
  }

  const [row] = await db
    .update(user)
    .set(patch)
    .where(eq(user.id, userId))
    .returning(publicUserColumns);
  return row ? toPublicUser(row) : null;
}

export async function searchUsers(query: string, limit = 20) {
  const q = query.trim();
  if (!q) return [];

  const pattern = `%${q.replace(/[%_]/g, "\\$&")}%`;
  const rows = await db
    .select(publicUserColumns)
    .from(user)
    .where(
      and(
        sql`${user.username} is not null`,
        or(ilike(user.username, pattern), ilike(user.name, pattern)),
      ),
    )
    .limit(limit);

  return rows.flatMap((row) => {
    const publicUser = toPublicUser(row);
    return publicUser ? [publicUser] : [];
  });
}

export async function countFollowers(userId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(follow)
    .where(eq(follow.followingId, userId));
  return row?.value ?? 0;
}

export async function countFollowing(userId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(follow)
    .where(eq(follow.followerId, userId));
  return row?.value ?? 0;
}

export async function countIncomingFollowRequests(userId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(followRequest)
    .where(eq(followRequest.targetId, userId));
  return row?.value ?? 0;
}

export async function isTrainerOf(trainerId: string, athleteId: string) {
  const [row] = await db
    .select({ athleteId: trainerAssignment.athleteId })
    .from(trainerAssignment)
    .where(
      and(
        eq(trainerAssignment.trainerId, trainerId),
        eq(trainerAssignment.athleteId, athleteId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function listTrainers(athleteId: string) {
  const rows = await db
    .select(publicUserColumns)
    .from(trainerAssignment)
    .innerJoin(user, eq(user.id, trainerAssignment.trainerId))
    .where(eq(trainerAssignment.athleteId, athleteId))
    .orderBy(asc(trainerAssignment.createdAt));
  return rows.flatMap((row) => {
    const publicUser = toPublicUser(row);
    return publicUser ? [publicUser] : [];
  });
}

export async function listAthletes(trainerId: string) {
  const rows = await db
    .select(publicUserColumns)
    .from(trainerAssignment)
    .innerJoin(user, eq(user.id, trainerAssignment.athleteId))
    .where(eq(trainerAssignment.trainerId, trainerId))
    .orderBy(asc(trainerAssignment.createdAt));
  return rows.flatMap((row) => {
    const publicUser = toPublicUser(row);
    return publicUser ? [publicUser] : [];
  });
}

export async function createTrainerAssignment(
  athleteId: string,
  trainerId: string,
) {
  const [row] = await db
    .insert(trainerAssignment)
    .values({ athleteId, trainerId })
    .onConflictDoNothing()
    .returning();
  return row ?? null;
}

export async function deleteTrainerAssignment(
  athleteId: string,
  trainerId: string,
) {
  const [row] = await db
    .delete(trainerAssignment)
    .where(
      and(
        eq(trainerAssignment.athleteId, athleteId),
        eq(trainerAssignment.trainerId, trainerId),
      ),
    )
    .returning();
  return row ?? null;
}

export async function isFollowing(followerId: string, followingId: string) {
  const [row] = await db
    .select({ followerId: follow.followerId })
    .from(follow)
    .where(
      and(
        eq(follow.followerId, followerId),
        eq(follow.followingId, followingId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function getFollowRequest(
  requesterId: string,
  targetId: string,
) {
  const [row] = await db
    .select()
    .from(followRequest)
    .where(
      and(
        eq(followRequest.requesterId, requesterId),
        eq(followRequest.targetId, targetId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listFollowers(userId: string) {
  const rows = await db
    .select(publicUserColumns)
    .from(follow)
    .innerJoin(user, eq(user.id, follow.followerId))
    .where(eq(follow.followingId, userId));
  return rows.flatMap((row) => {
    const publicUser = toPublicUser(row);
    return publicUser ? [publicUser] : [];
  });
}

export async function listFollowing(userId: string) {
  const rows = await db
    .select(publicUserColumns)
    .from(follow)
    .innerJoin(user, eq(user.id, follow.followingId))
    .where(eq(follow.followerId, userId));
  return rows.flatMap((row) => {
    const publicUser = toPublicUser(row);
    return publicUser ? [publicUser] : [];
  });
}

export async function createFollow(followerId: string, followingId: string) {
  const [row] = await db
    .insert(follow)
    .values({ followerId, followingId })
    .onConflictDoNothing()
    .returning();
  return row ?? null;
}

export async function deleteFollow(followerId: string, followingId: string) {
  const [row] = await db
    .delete(follow)
    .where(
      and(
        eq(follow.followerId, followerId),
        eq(follow.followingId, followingId),
      ),
    )
    .returning();
  return row ?? null;
}

export async function createFollowRequest(
  requesterId: string,
  targetId: string,
) {
  const [row] = await db
    .insert(followRequest)
    .values({
      id: crypto.randomUUID(),
      requesterId,
      targetId,
    })
    .onConflictDoNothing()
    .returning();
  return row ?? (await getFollowRequest(requesterId, targetId));
}

export async function deleteFollowRequest(id: string) {
  const [row] = await db
    .delete(followRequest)
    .where(eq(followRequest.id, id))
    .returning();
  return row ?? null;
}

export async function deleteFollowRequestBetween(
  requesterId: string,
  targetId: string,
) {
  const [row] = await db
    .delete(followRequest)
    .where(
      and(
        eq(followRequest.requesterId, requesterId),
        eq(followRequest.targetId, targetId),
      ),
    )
    .returning();
  return row ?? null;
}

export async function listIncomingFollowRequests(targetId: string) {
  const rows = await db
    .select({
      id: followRequest.id,
      createdAt: followRequest.createdAt,
      requesterId: user.id,
      requesterName: user.name,
      requesterUsername: user.username,
      requesterImage: user.image,
      requesterIsPrivate: user.isPrivate,
    })
    .from(followRequest)
    .innerJoin(user, eq(user.id, followRequest.requesterId))
    .where(eq(followRequest.targetId, targetId))
    .orderBy(asc(followRequest.createdAt));

  return rows.flatMap((row) => {
    const requester = toPublicUser({
      id: row.requesterId,
      name: row.requesterName,
      username: row.requesterUsername,
      image: row.requesterImage,
      isPrivate: row.requesterIsPrivate,
    });
    if (!requester) return [];
    return [{ id: row.id, createdAt: row.createdAt, requester }];
  });
}

export async function getFollowRequestById(id: string) {
  const [row] = await db
    .select()
    .from(followRequest)
    .where(eq(followRequest.id, id))
    .limit(1);
  return row ?? null;
}

export async function acceptAllPendingRequestsForUser(targetId: string) {
  const pending = await db
    .select()
    .from(followRequest)
    .where(eq(followRequest.targetId, targetId));

  for (const request of pending) {
    await createFollow(request.requesterId, request.targetId);
    await deleteFollowRequest(request.id);
  }

  return pending.length;
}
