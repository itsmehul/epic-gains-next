import "server-only";

import {
  acceptAllPendingRequestsForUser,
  createFollow,
  createFollowRequest,
  createTrainerAssignment,
  deleteFollow,
  deleteFollowRequest,
  deleteFollowRequestBetween,
  deleteTrainerAssignment,
  ensureUserSocialProfile,
  getFollowRequest,
  getFollowRequestById,
  getUserById,
  getUserByUsername,
  isFollowing,
  isTrainerOf,
  isUsernameTaken,
  listAthletes,
  listTrainers,
  updateUserSocialProfile,
  countFollowers,
  countFollowing,
  listFollowing,
  type PublicUser,
} from "@/db/repositories/social.repository";
import { getPerformanceMetricsForUser } from "@/db/repositories/set.repository";
import {
  buildCirclePulse,
  toCirclePerformanceMetrics,
} from "@/features/workouts/performance-metrics";
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

  const [
    followersCount,
    followingCount,
    relationship,
    canViewWorkouts,
    isMyTrainer,
    isMyAthlete,
    trainers,
  ] = await Promise.all([
    countFollowers(profile.id),
    countFollowing(profile.id),
    getFollowRelationship(viewerId, profile.id),
    canViewUserWorkouts(viewerId, profile),
    isTrainerOf(profile.id, viewerId),
    isTrainerOf(viewerId, profile.id),
    listTrainers(profile.id),
  ]);

  return {
    ...profile,
    followersCount,
    followingCount,
    relationship,
    canViewWorkouts,
    isMyTrainer,
    isMyAthlete,
    trainers,
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
  await deleteTrainerAssignment(viewerId, target.id);
  return { ok: true, data: { relationship: "none" } };
}

export async function assignTrainer(
  viewerId: string,
  username: string,
): Promise<SocialActionResult<{ isMyTrainer: true }>> {
  await ensureUserSocialProfile(viewerId);
  const target = await getUserByUsername(username);
  if (!target) {
    return { ok: false, error: "User not found", status: 404 };
  }
  if (target.id === viewerId) {
    return { ok: false, error: "Cannot assign yourself as trainer", status: 400 };
  }
  if (!(await isFollowing(viewerId, target.id))) {
    return {
      ok: false,
      error: "Follow this friend before assigning them as trainer",
      status: 400,
    };
  }

  await createTrainerAssignment(viewerId, target.id);
  return { ok: true, data: { isMyTrainer: true } };
}

export async function unassignTrainer(
  viewerId: string,
  username: string,
): Promise<SocialActionResult<{ isMyTrainer: false }>> {
  const target = await getUserByUsername(username);
  if (!target) {
    return { ok: false, error: "User not found", status: 404 };
  }

  await deleteTrainerAssignment(viewerId, target.id);
  return { ok: true, data: { isMyTrainer: false } };
}

export async function getMyTrainers(userId: string) {
  await ensureUserSocialProfile(userId);
  const items = await listTrainers(userId);
  return { items };
}

export async function getMyAthletes(userId: string) {
  await ensureUserSocialProfile(userId);
  const items = await listAthletes(userId);
  return { items };
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

const CIRCLE_PERFORMANCE_LIMIT = 50;

type CirclePerformanceOptions = {
  date?: Date;
  muscleGroup?: MuscleGroup;
  keyMuscle?: string;
};

async function loadCircleMemberMetrics(
  viewerId: string,
  member: PublicUser,
  asOf: Date,
  options: CirclePerformanceOptions,
) {
  const canViewWorkouts = await canViewUserWorkouts(viewerId, member);
  if (!canViewWorkouts) {
    return {
      username: member.username,
      name: member.name,
      isPrivate: member.isPrivate,
      canViewWorkouts: false as const,
      reason: "Workouts are not visible for this user",
    };
  }

  const metrics = await getPerformanceMetricsForUser(member.id, {
    date: asOf,
    muscleGroup: options.muscleGroup,
    keyMuscle: options.keyMuscle,
    viewerId,
  });

  return {
    username: member.username,
    name: member.name,
    isPrivate: member.isPrivate,
    canViewWorkouts: true as const,
    metrics: toCirclePerformanceMetrics(metrics),
  };
}

export async function getFollowingPerformanceMetrics(
  viewerId: string,
  options: CirclePerformanceOptions = {},
) {
  await ensureUserSocialProfile(viewerId);
  const following = await listFollowing(viewerId);
  const asOf = options.date ?? new Date();
  const selected = following.slice(0, CIRCLE_PERFORMANCE_LIMIT);
  const friends = await Promise.all(
    selected.map((friend) =>
      loadCircleMemberMetrics(viewerId, friend, asOf, options),
    ),
  );

  return {
    asOf: localDateString(asOf),
    followingCount: following.length,
    returnedCount: friends.length,
    truncated: following.length > CIRCLE_PERFORMANCE_LIMIT,
    pulse: buildCirclePulse(friends),
    friends,
  };
}

export async function getAthletesPerformanceMetrics(
  viewerId: string,
  options: CirclePerformanceOptions = {},
) {
  await ensureUserSocialProfile(viewerId);
  const roster = await listAthletes(viewerId);
  const asOf = options.date ?? new Date();
  const selected = roster.slice(0, CIRCLE_PERFORMANCE_LIMIT);
  const athletes = await Promise.all(
    selected.map((athlete) =>
      loadCircleMemberMetrics(viewerId, athlete, asOf, options),
    ),
  );

  return {
    asOf: localDateString(asOf),
    athleteCount: roster.length,
    returnedCount: athletes.length,
    truncated: roster.length > CIRCLE_PERFORMANCE_LIMIT,
    pulse: buildCirclePulse(athletes),
    athletes,
  };
}

export async function getComparePerformanceMetrics(
  viewerId: string,
  options: {
    username: string;
    leftUsername?: string;
    date?: Date;
    muscleGroup?: MuscleGroup;
    keyMuscle?: string;
  },
) {
  const asOf = options.date ?? new Date();
  const left = await resolveCompareAthlete(viewerId, options.leftUsername);
  const right = await resolveCompareAthlete(viewerId, options.username);

  if (
    left.ok &&
    right.ok &&
    left.ownerId === right.ownerId
  ) {
    return {
      asOf: localDateString(asOf),
      left: { username: left.username, error: "Cannot compare an athlete to themselves" },
      right: { username: right.username, error: "Cannot compare an athlete to themselves" },
    };
  }

  const [leftSide, rightSide] = await Promise.all([
    loadCompareSide(viewerId, left, asOf, options),
    loadCompareSide(viewerId, right, asOf, options),
  ]);

  return {
    asOf: localDateString(asOf),
    left: leftSide,
    right: rightSide,
  };
}

async function resolveCompareAthlete(
  viewerId: string,
  username?: string,
): Promise<
  | { ok: true; ownerId: string; username: string | null }
  | { ok: false; username: string | null; error: string }
> {
  if (!username) {
    return { ok: true, ownerId: viewerId, username: null };
  }
  const owner = await getUserByUsername(username);
  if (!owner) {
    return { ok: false, username, error: "User not found" };
  }
  if (!(await canViewUserWorkouts(viewerId, owner))) {
    return {
      ok: false,
      username: owner.username,
      error: "Workouts are not visible for this user",
    };
  }
  return { ok: true, ownerId: owner.id, username: owner.username };
}

async function loadCompareSide(
  viewerId: string,
  athlete:
    | { ok: true; ownerId: string; username: string | null }
    | { ok: false; username: string | null; error: string },
  asOf: Date,
  options: { muscleGroup?: MuscleGroup; keyMuscle?: string },
) {
  if (!athlete.ok) {
    return { username: athlete.username, error: athlete.error };
  }
  const metrics = await getPerformanceMetricsForUser(athlete.ownerId, {
    date: asOf,
    muscleGroup: options.muscleGroup,
    keyMuscle: options.keyMuscle,
    viewerId,
  });
  return { username: athlete.username, metrics };
}
