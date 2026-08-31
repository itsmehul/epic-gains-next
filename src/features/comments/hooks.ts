"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateCommentInput } from "@/features/comments/schemas";
import type { Comment, ListCommentsResult } from "@/features/comments/types";
import { notificationKeys } from "@/features/notifications/hooks";
import { apiFetch } from "@/shared/api";

export const commentKeys = {
  all: ["comments"] as const,
  lists: (params?: { exerciseId?: string; workoutId?: string }) =>
    [...commentKeys.all, "list", params ?? {}] as const,
};

export function useComments(options: {
  exerciseId: string | null;
  workoutId?: string;
  enabled?: boolean;
}) {
  const exerciseId = options.exerciseId ?? "";
  const workoutId = options.workoutId;

  return useQuery({
    queryKey: commentKeys.lists({ exerciseId, workoutId }),
    enabled: Boolean(exerciseId) && (options.enabled ?? true),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("exerciseId", exerciseId);
      if (workoutId) params.set("workoutId", workoutId);
      return apiFetch<ListCommentsResult>(`/api/comments?${params}`);
    },
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommentInput) =>
      apiFetch<Comment>("/api/comments", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commentKeys.all });
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
