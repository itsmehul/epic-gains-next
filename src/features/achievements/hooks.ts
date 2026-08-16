"use client";

import { useQuery } from "@tanstack/react-query";

import type {
  ListAchievementsResult,
  UnlockedAchievement,
} from "@/features/achievements/types";
import { apiFetch } from "@/shared/api";

export const achievementKeys = {
  all: ["achievements"] as const,
  list: () => [...achievementKeys.all, "list"] as const,
  profile: (username: string) =>
    [...achievementKeys.all, "profile", username] as const,
};

export const ACHIEVEMENT_UNLOCKED_EVENT = "epic-gains:achievement-unlocked";

export function emitAchievementUnlocks(items: UnlockedAchievement[]) {
  if (typeof window === "undefined" || items.length === 0) return;
  window.dispatchEvent(
    new CustomEvent(ACHIEVEMENT_UNLOCKED_EVENT, { detail: items }),
  );
}

export function useAchievements() {
  return useQuery({
    queryKey: achievementKeys.list(),
    queryFn: () => apiFetch<ListAchievementsResult>("/api/achievements"),
  });
}

export function useProfileAchievements(username: string, enabled: boolean) {
  return useQuery({
    queryKey: achievementKeys.profile(username),
    enabled: Boolean(username) && enabled,
    queryFn: () =>
      apiFetch<ListAchievementsResult>(`/api/users/${username}/achievements`),
  });
}
