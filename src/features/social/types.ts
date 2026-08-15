import type { WorkoutWithStats } from "@/features/workouts/types";

export type SocialUser = {
  id: string;
  name: string;
  username: string;
  image: string | null;
  isPrivate: boolean;
};

export type FollowRelationship = "self" | "none" | "following" | "requested";

export type SocialProfile = SocialUser & {
  followersCount: number;
  followingCount: number;
  relationship: FollowRelationship;
  canViewWorkouts: boolean;
};

export type FollowRequestItem = {
  id: string;
  createdAt: string;
  requester: SocialUser;
};

export type FeedWorkoutItem = WorkoutWithStats & {
  owner: SocialUser;
};

export type ListUsersResult = { items: SocialUser[] };
export type ListFollowRequestsResult = { items: FollowRequestItem[]; count: number };
export type ListFeedResult = { items: FeedWorkoutItem[] };
export type ListProfileWorkoutsResult = {
  items: Array<{
    id: string;
    name: string;
    userId: string;
    createdAt: string;
  }>;
};
