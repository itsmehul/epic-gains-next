"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ListWorkflowRunsResult } from "@/features/workflows/types";
import { apiFetch } from "@/shared/api";
import { isBrowserTabVisible } from "@/shared/browser";

export const workflowKeys = {
  all: ["workflows"] as const,
  runs: (params?: Record<string, string | undefined>) =>
    [...workflowKeys.all, "runs", params ?? {}] as const,
  run: (runId: string) => [...workflowKeys.all, "run", runId] as const,
};

type StartWorkflowInput = {
  workflowId: string;
  input?: Record<string, unknown>;
  resourceId?: string;
};

type StartWorkflowResult = {
  runId: string;
  status: string;
  workflowId: string;
};

type WorkflowRunDetail = {
  run: {
    id: string;
    workflowId: string;
    status: string;
    input: unknown;
    output: unknown;
    error: string | null;
    currentStepId: string;
    timeline: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  };
  progress: {
    completedSteps: number;
    totalSteps: number;
    completionPercentage: number;
  };
};

export function useWorkflowRuns(options?: {
  workflowId?: string;
  limit?: number;
  pollingEnabled?: boolean;
}) {
  const params = new URLSearchParams();
  params.set("limit", String(options?.limit ?? 50));
  if (options?.workflowId) {
    params.set("workflowId", options.workflowId);
  }

  return useQuery({
    queryKey: workflowKeys.runs({
      workflowId: options?.workflowId,
      limit: String(options?.limit ?? 50),
    }),
    queryFn: () =>
      apiFetch<ListWorkflowRunsResult>(`/api/workflows/runs?${params}`),
    refetchInterval: () => {
      if (!options?.pollingEnabled) return false;
      if (!isBrowserTabVisible()) return false;
      return 3_000;
    },
  });
}

export function useWorkflowRun(
  runId: string | null,
  options?: { pollingEnabled?: boolean },
) {
  return useQuery({
    queryKey: workflowKeys.run(runId ?? ""),
    enabled: Boolean(runId),
    queryFn: () =>
      apiFetch<WorkflowRunDetail>(`/api/workflows/${runId}`),
    refetchInterval: (query) => {
      if (!options?.pollingEnabled || !runId) return false;
      if (!isBrowserTabVisible()) return false;
      const status = query.state.data?.run.status;
      if (status === "completed" || status === "failed" || status === "cancelled") {
        return false;
      }
      return 2_000;
    },
  });
}

export function useStartWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StartWorkflowInput) =>
      apiFetch<StartWorkflowResult>("/api/workflows/runs", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.all });
    },
  });
}
