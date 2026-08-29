import "server-only";

import {
  acceptAllPendingRequestsForUser,
  createFollow,
  createFollowRequest,
  deleteFollow,
  deleteFollowRequest,
  deleteFollowRequestBetween,
  ensureUserSocialProfile,
  getFollowRequest,
  getFollowRequestById,
  getUserById,
  getUserByUsername,
  isFollowing,
  isUsernameTaken,
  updateUserSocialProfile,
  countFollowers,
  countFollowing,
  listFollowing,
} from "@/db/repositories/social.repository";
import { getPerformanceMetricsForUser } from "@/db/repositories/set.repository";
import type { MuscleGroup } from "@/db/schema/workout-schema";
import { canViewUserWorkouts } from "@/features/social/privacy";
import { isValidUsername, normalizeUsername } from "@/features/social/username";
import { localDateString } from "@/features/workouts/set-day";

export type FollowRelationship =
  | "self"
  | "none"
  | "following"
  | "requested";

export type SocialActionError = {
  ok: false;
  error: string;
  status: 400 | 404 | 409 | 500;
};

export type SocialActionOk<T> = {
  ok: true;
  data: T;
};

export type SocialActionResult<T> = SocialActionOk<T> | SocialActionError;

export { canViewUserWorkouts };

export async function getFollowRelationship(
  viewerId: string,
  targetId: string,
): Promise<FollowRelationship> {
  if (viewerId === targetId) return "self";
  if (await isFollowing(viewerId, targetId)) return "following";
  if (await getFollowRequest(viewerId, targetId)) return "requested";
  return "none";
}

export async function buildProfilePayload(
  viewerId: string,
  username: string,
) {
  await ensureUserSocialProfile(viewerId);
  const profile = await getUserByUsername(username);
  if (!profile) return null;

  const [followersCount, followingCount, relationship, canViewWorkouts] =
    await Promise.all([
      countFollowers(profile.id),
      countFollowing(profile.id),
      getFollowRelationship(viewerId, profile.id),
      canViewUserWorkouts(viewerId, profile),
    ]);

  return {
    ...profile,
    followersCount,
    followingCount,
    relationship,
    canViewWorkouts,
  };
}

export async function followUser(
  viewerId: string,
  username: string,
): Promise<SocialActionResult<{ relationship: FollowRelationship }>> {
  await ensureUserSocialProfile(viewerId);
  const target = await getUserByUsername(username);
  if (!target) {
    return { ok: false, error: "User not found", status: 404 };
  }
  if (target.id === viewerId) {
    return { ok: false, error: "Cannot follow yourself", status: 400 };
  }

  if (await isFollowing(viewerId, target.id)) {
    return { ok: true, data: { relationship: "following" } };
  }

  if (!target.isPrivate) {
    await createFollow(viewerId, target.id);
    await deleteFollowRequestBetween(viewerId, target.id);
    return { ok: true, data: { relationship: "following" } };
  }

  await createFollowRequest(viewerId, target.id);
  return { ok: true, data: { relationship: "requested" } };
}

export async function unfollowUser(
  viewerId: string,
  username: string,
): Promise<SocialActionResult<{ relationship: FollowRelationship }>> {
  const target = await getUserByUsername(username);
  if (!target) {
    return { ok: false, error: "User not found", status: 404 };
  }

  await deleteFollow(viewerId, target.id);
  await deleteFollowRequestBetween(viewerId, target.id);
  return { ok: true, data: { relationship: "none" } };
}

export async function acceptFollowRequest(
  viewerId: string,
  requestId: string,
): Promise<SocialActionResult<{ ok: true }>> {
  const request = await getFollowRequestById(requestId);
  if (!request || request.targetId !== viewerId) {
    return { ok: false, error: "Request not found", status: 404 };
  }

  await createFollow(request.requesterId, request.targetId);
  await deleteFollowRequest(request.id);
  return { ok: true, data: { ok: true } };
}

export async function rejectFollowRequest(
  viewerId: string,
  requestId: string,
): Promise<SocialActionResult<{ ok: true }>> {
  const request = await getFollowRequestById(requestId);
  if (!request || request.targetId !== viewerId) {
    return { ok: false, error: "Request not found", status: 404 };
  }

  await deleteFollowRequest(request.id);
  return { ok: true, data: { ok: true } };
}

export async function updateMySocialSettings(
  userId: string,
  input: { username?: string; isPrivate?: boolean },
) {
  await ensureUserSocialProfile(userId);
  const current = await getUserById(userId);
  if (!current) {
    return { ok: false as const, error: "User not found", status: 404 as const };
  }

  if (input.username !== undefined) {
    const normalized = normalizeUsername(input.username);
    if (!isValidUsername(normalized)) {
      return {
        ok: false as const,
        error: "Username must be 3–30 chars: a-z, 0-9, underscore",
        status: 400 as const,
      };
    }

    if (await isUsernameTaken(normalized, userId)) {
      return {
        ok: false as const,
        error: "Username is taken",
        status: 409 as const,
      };
    }
  }

  const becomingPublic =
    input.isPrivate === false && current.isPrivate === true;

  const updated = await updateUserSocialProfile(userId, {
    username: input.username,
    isPrivate: input.isPrivate,
  });

  if (!updated) {
    return {
      ok: false as const,
      error: "Failed to update profile",
      status: 500 as const,
    };
  }

  if (becomingPublic) {
    await acceptAllPendingRequestsForUser(userId);
  }

  return { ok: true as const, data: updated };
}

const FOLLOWING_PERFORMANCE_LIMIT = 50;

export async function getFollowingPerformanceMetrics(
  viewerId: string,
  options: {
    date?: Date;
    muscleGroup?: MuscleGroup;
    keyMuscle?: string;
  } = {},
) {
  await ensureUserSocialProfile(viewerId);
  const following = await listFollowing(viewerId);
  const asOf = options.date ?? new Date();
  const selected = following.slice(0, FOLLOWING_PERFORMANCE_LIMIT);

  const friends = await Promise.all(
    selected.map(async (friend) => {
      const canViewWorkouts = await canViewUserWorkouts(viewerId, friend);
      if (!canViewWorkouts) {
        return {
          username: friend.username,
          name: friend.name,
          isPrivate: friend.isPrivate,
          canViewWorkouts: false as const,
          reason: "Workouts are not visible for this user",
        };
      }

      const metrics = await getPerformanceMetricsForUser(friend.id, {
        date: asOf,
        muscleGroup: options.muscleGroup,
        keyMuscle: options.keyMuscle,
        viewerId,
      });

      return {
        username: friend.username,
        name: friend.name,
        isPrivate: friend.isPrivate,
        canViewWorkouts: true as const,
        metrics,
      };
    }),
  );

  return {
    asOf: localDateString(asOf),
    followingCount: following.length,
    returnedCount: friends.length,
    truncated: following.length > FOLLOWING_PERFORMANCE_LIMIT,
    friends,
  };
}
