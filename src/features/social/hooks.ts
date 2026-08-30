"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ProfileInsights } from "@/features/social/profile-insights";
import type { UpdateSocialProfileInput } from "@/features/social/schemas";
import type {
  FollowRelationship,
  ListFeedResult,
  ListFollowRequestsResult,
  ListProfileWorkoutsResult,
  ListUsersResult,
  SocialProfile,
  SocialUser,
} from "@/features/social/types";
import { apiFetch } from "@/shared/api";

export const socialKeys = {
  all: ["social"] as const,
  me: () => [...socialKeys.all, "me"] as const,
  search: (q: string) => [...socialKeys.all, "search", q] as const,
  profile: (username: string) => [...socialKeys.all, "profile", username] as const,
  followers: (username: string) =>
    [...socialKeys.all, "followers", username] as const,
  following: (username: string) =>
    [...socialKeys.all, "following", username] as const,
  trainers: () => [...socialKeys.all, "trainers"] as const,
  athletes: () => [...socialKeys.all, "athletes"] as const,
  profileWorkouts: (username: string) =>
    [...socialKeys.all, "profile-workouts", username] as const,
  profileInsights: (username: string) =>
    [...socialKeys.all, "profile-insights", username] as const,
  requests: () => [...socialKeys.all, "requests"] as const,
  feed: (params?: { q?: string; muscleGroups?: string[] }) =>
    [...socialKeys.all, "feed", params ?? {}] as const,
};

export type MeSocialProfile = SocialUser & { pendingRequestCount: number };

export function useMeSocial() {
  return useQuery({
    queryKey: socialKeys.me(),
    queryFn: () => apiFetch<MeSocialProfile>("/api/users/me"),
  });
}

export function useUpdateMeSocial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSocialProfileInput) =>
      apiFetch<SocialUser>("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: socialKeys.all });
    },
  });
}

export function useSearchUsers(q: string) {
  return useQuery({
    queryKey: socialKeys.search(q),
    enabled: q.trim().length > 0,
    queryFn: () =>
      apiFetch<ListUsersResult>(
        `/api/users/search?q=${encodeURIComponent(q.trim())}`,
      ),
  });
}

export function useSocialProfile(username: string) {
  return useQuery({
    queryKey: socialKeys.profile(username),
    enabled: Boolean(username),
    queryFn: () => apiFetch<SocialProfile>(`/api/users/${username}`),
  });
}

export function useFollowers(username: string) {
  return useQuery({
    queryKey: socialKeys.followers(username),
    enabled: Boolean(username),
    queryFn: () =>
      apiFetch<ListUsersResult>(`/api/users/${username}/followers`),
  });
}

export function useFollowing(username: string) {
  return useQuery({
    queryKey: socialKeys.following(username),
    enabled: Boolean(username),
    queryFn: () =>
      apiFetch<ListUsersResult>(`/api/users/${username}/following`),
  });
}

export function useProfileWorkouts(username: string, enabled: boolean) {
  return useQuery({
    queryKey: socialKeys.profileWorkouts(username),
    enabled: Boolean(username) && enabled,
    queryFn: () =>
      apiFetch<ListProfileWorkoutsResult>(`/api/users/${username}/workouts`),
  });
}

export function useProfileInsights(username: string, enabled: boolean) {
  return useQuery({
    queryKey: socialKeys.profileInsights(username),
    enabled: Boolean(username) && enabled,
    queryFn: () =>
      apiFetch<ProfileInsights>(`/api/users/${username}/insights`),
  });
}

export function useFollowRequests() {
  return useQuery({
    queryKey: socialKeys.requests(),
    queryFn: () => apiFetch<ListFollowRequestsResult>("/api/follow-requests"),
  });
}

export function useFollowingFeed(options?: {
  q?: string;
  muscleGroups?: string[];
  enabled?: boolean;
}) {
  const q = options?.q?.trim() ?? "";
  const muscleGroups = [...(options?.muscleGroups ?? [])].sort();

  return useQuery({
    queryKey: socialKeys.feed({ q, muscleGroups }),
    enabled: options?.enabled ?? true,
    queryFn: () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      for (const group of muscleGroups) {
        params.append("muscleGroup", group);
      }
      const query = params.toString();
      return apiFetch<ListFeedResult>(`/api/feed${query ? `?${query}` : ""}`);
    },
    placeholderData: (previousData) => previousData,
  });
}

export function useMyTrainers() {
  return useQuery({
    queryKey: socialKeys.trainers(),
    queryFn: () => apiFetch<ListUsersResult>("/api/trainers"),
  });
}

export function useMyAthletes() {
  return useQuery({
    queryKey: socialKeys.athletes(),
    queryFn: () => apiFetch<ListUsersResult>("/api/athletes"),
  });
}

export function useAssignTrainer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (username: string) =>
      apiFetch<{ isMyTrainer: boolean }>(`/api/users/${username}/trainer`, {
        method: "POST",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: socialKeys.all });
    },
  });
}

export function useUnassignTrainer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (username: string) =>
      apiFetch<{ isMyTrainer: boolean }>(`/api/users/${username}/trainer`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: socialKeys.all });
    },
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (username: string) =>
      apiFetch<{ relationship: FollowRelationship }>(
        `/api/users/${username}/follow`,
        { method: "POST" },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: socialKeys.all });
    },
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (username: string) =>
      apiFetch<{ relationship: FollowRelationship }>(
        `/api/users/${username}/follow`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: socialKeys.all });
    },
  });
}

export function useRespondFollowRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: "accept" | "reject";
    }) =>
      apiFetch<{ ok: true }>(
        `/api/follow-requests/${id}?action=${action}`,
        { method: "POST" },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: socialKeys.all });
    },
  });
}
