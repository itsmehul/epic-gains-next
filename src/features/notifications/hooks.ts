"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MarkNotificationsReadInput } from "@/features/notifications/schemas";
import type { ListNotificationsResult } from "@/features/notifications/types";
import { apiFetch } from "@/shared/api";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const,
};

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: () => apiFetch<ListNotificationsResult>("/api/notifications"),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MarkNotificationsReadInput) =>
      apiFetch<ListNotificationsResult>("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(notificationKeys.list(), data);
    },
  });
}
