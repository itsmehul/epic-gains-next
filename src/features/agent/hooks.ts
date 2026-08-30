"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/shared/api";

export const geminiKeyKeys = {
  all: ["gemini-key"] as const,
  status: () => [...geminiKeyKeys.all, "status"] as const,
};

export type GeminiKeyStatus = { configured: boolean };

export function useGeminiKeyStatus() {
  return useQuery({
    queryKey: geminiKeyKeys.status(),
    queryFn: () => apiFetch<GeminiKeyStatus>("/api/integrations/gemini"),
  });
}

export function useUpsertGeminiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (apiKey: string) =>
      apiFetch<GeminiKeyStatus>("/api/integrations/gemini", {
        method: "PUT",
        body: JSON.stringify({ apiKey }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: geminiKeyKeys.all });
    },
  });
}

export function useDeleteGeminiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<GeminiKeyStatus>("/api/integrations/gemini", {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: geminiKeyKeys.all });
    },
  });
}
