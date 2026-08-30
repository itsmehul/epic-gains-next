"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import {
  achievementKeys,
  emitAchievementUnlocks,
} from "@/features/achievements/hooks";
import type { UnlockedAchievement } from "@/features/achievements/types";
import type {
  CreateExerciseInput,
  CreateSetInput,
  CreateWorkoutExerciseInput,
  CreateWorkoutInput,
  ImportFullWorkoutInput,
  ImportWorkoutStructureInput,
  CreateImportPromptFeedbackInput,
  MergeExerciseInput,
  UpdateSetInput,
  UpdateWorkoutExerciseInput,
  UpdateWorkoutInput,
} from "@/features/workouts/schemas";
import type {
  Exercise,
  ListExerciseSearchResult,
  ListExercisesResult,
  ListSetsResult,
  ListSimilarExercisesResult,
  ListWorkoutExercisesResult,
  ListWorkoutsResult,
  MergeExerciseImpact,
  MergeExerciseResult,
  Set,
  Workout,
  WorkoutDetail,
  WorkoutExercise,
} from "@/features/workouts/types";
import { apiFetch } from "@/shared/api";

export const workoutKeys = {
  all: ["workouts"] as const,
  lists: () => [...workoutKeys.all, "list"] as const,
  list: (params?: { q?: string; muscleGroups?: string[]; scope?: string }) =>
    [...workoutKeys.lists(), params ?? {}] as const,
  detail: (id: string) => [...workoutKeys.all, "detail", id] as const,
};

export const exerciseKeys = {
  all: ["exercises"] as const,
  lists: () => [...exerciseKeys.all, "list"] as const,
  list: (params?: { q?: string; excludeId?: string }) =>
    [...exerciseKeys.lists(), params ?? {}] as const,
  detail: (id: string) => [...exerciseKeys.all, "detail", id] as const,
  similar: (id: string, workoutId?: string, workoutExerciseId?: string) =>
    [
      ...exerciseKeys.all,
      "similar",
      id,
      workoutId ?? "",
      workoutExerciseId ?? "",
    ] as const,
  mergeImpact: (id: string, targetExerciseId: string, workoutId: string) =>
    [
      ...exerciseKeys.all,
      "merge-impact",
      id,
      targetExerciseId,
      workoutId,
    ] as const,
};

export const workoutExerciseKeys = {
  all: ["workout-exercises"] as const,
  lists: (params?: { workoutId?: string; exerciseId?: string }) =>
    [...workoutExerciseKeys.all, "list", params ?? {}] as const,
  detail: (id: string) => [...workoutExerciseKeys.all, "detail", id] as const,
};

export const setKeys = {
  all: ["sets"] as const,
  lists: (params?: { workoutId?: string; exerciseId?: string }) =>
    [...setKeys.all, "list", params ?? {}] as const,
  detail: (id: string) => [...setKeys.all, "detail", id] as const,
};

export const importPromptFeedbackKeys = {
  all: ["import-prompt-feedback"] as const,
  latest: (workoutId: string) =>
    [...importPromptFeedbackKeys.all, "latest", workoutId] as const,
};

export type ImportPromptFeedback = {
  id: string;
  workoutId: string;
  promptVersion: string;
  annotations: CreateImportPromptFeedbackInput["annotations"];
  comment: string | null;
  videoTimestamp: number;
  createdAt: string;
};

export function useWorkouts(options?: {
  q?: string;
  muscleGroups?: string[];
  scope?: "mine" | "catalog";
  enabled?: boolean;
}) {
  const q = options?.q?.trim() ?? "";
  const muscleGroups = [...(options?.muscleGroups ?? [])].sort();
  const scope = options?.scope ?? "mine";

  return useQuery({
    queryKey: workoutKeys.list({ q, muscleGroups, scope }),
    enabled: options?.enabled ?? true,
    queryFn: () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (scope) params.set("scope", scope);
      for (const group of muscleGroups) {
        params.append("muscleGroup", group);
      }
      const query = params.toString();
      return apiFetch<ListWorkoutsResult>(
        `/api/workouts${query ? `?${query}` : ""}`,
      );
    },
    placeholderData: (previousData) => previousData,
  });
}

export function useWorkout(id: string | null) {
  return useQuery({
    queryKey: workoutKeys.detail(id ?? ""),
    enabled: Boolean(id),
    queryFn: () => apiFetch<WorkoutDetail>(`/api/workouts/${id}`),
  });
}

export function useImportFullWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ImportFullWorkoutInput | ImportWorkoutStructureInput) =>
      apiFetch<Workout>("/api/workouts/import", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workoutKeys.all });
    },
  });
}

export function useCreateWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkoutInput) =>
      apiFetch<Workout>("/api/workouts", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workoutKeys.all });
    },
  });
}

export function useUpdateWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateWorkoutInput & { id: string }) =>
      apiFetch<Workout>(`/api/workouts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (item) => {
      void queryClient.invalidateQueries({ queryKey: workoutKeys.all });
      void queryClient.invalidateQueries({
        queryKey: workoutKeys.detail(item.id),
      });
    },
  });
}

export function useDeleteWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Workout>(`/api/workouts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workoutKeys.all });
    },
  });
}

export function useExercises(): UseQueryResult<ListExercisesResult>;
export function useExercises(options: {
  q?: string;
  excludeId?: string;
}): UseQueryResult<ListExercisesResult | ListExerciseSearchResult>;
export function useExercises(options?: { q?: string; excludeId?: string }) {
  const q = options?.q?.trim() ?? "";
  const excludeId = options?.excludeId;

  return useQuery({
    queryKey: exerciseKeys.list({ q, excludeId }),
    queryFn: () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (excludeId) params.set("excludeId", excludeId);
      const query = params.toString();
      return apiFetch<ListExercisesResult | ListExerciseSearchResult>(
        `/api/exercises${query ? `?${query}` : ""}`,
      );
    },
  });
}

export function useExercise(id: string | null) {
  return useQuery({
    queryKey: exerciseKeys.detail(id ?? ""),
    enabled: Boolean(id),
    queryFn: () => apiFetch<Exercise>(`/api/exercises/${id}`),
  });
}

export function useSimilarExercises(
  exerciseId: string | null,
  options?: {
    workoutId?: string;
    workoutExerciseId?: string;
    enabled?: boolean;
  },
) {
  const workoutId = options?.workoutId;
  const workoutExerciseId = options?.workoutExerciseId;
  return useQuery({
    queryKey: exerciseKeys.similar(
      exerciseId ?? "",
      workoutId,
      workoutExerciseId,
    ),
    enabled: Boolean(exerciseId) && (options?.enabled ?? true),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("limit", "3");
      if (workoutId) params.set("workoutId", workoutId);
      if (workoutExerciseId) params.set("workoutExerciseId", workoutExerciseId);
      return apiFetch<ListSimilarExercisesResult>(
        `/api/exercises/${exerciseId}/similar?${params}`,
      );
    },
  });
}

export function useMergeExerciseImpact(
  sourceExerciseId: string | null,
  targetExerciseId: string | null,
  workoutId: string | null,
) {
  return useQuery({
    queryKey: exerciseKeys.mergeImpact(
      sourceExerciseId ?? "",
      targetExerciseId ?? "",
      workoutId ?? "",
    ),
    enabled: Boolean(sourceExerciseId && targetExerciseId && workoutId),
    queryFn: () => {
      const params = new URLSearchParams({
        targetExerciseId: targetExerciseId!,
        workoutId: workoutId!,
      });
      return apiFetch<MergeExerciseImpact>(
        `/api/exercises/${sourceExerciseId}/merge?${params}`,
      );
    },
  });
}

export function useCreateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExerciseInput) =>
      apiFetch<Exercise>("/api/exercises", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
    },
  });
}

export function useDeleteExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Exercise>(`/api/exercises/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
    },
  });
}

export function useMergeExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sourceExerciseId,
      ...input
    }: MergeExerciseInput & { sourceExerciseId: string }) =>
      apiFetch<MergeExerciseResult>(`/api/exercises/${sourceExerciseId}/merge`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
      void queryClient.invalidateQueries({
        queryKey: workoutExerciseKeys.all,
      });
      void queryClient.invalidateQueries({ queryKey: setKeys.all });
      void queryClient.invalidateQueries({ queryKey: workoutKeys.lists() });
    },
  });
}

export function useWorkoutExercises(options?: {
  workoutId?: string;
  exerciseId?: string;
}) {
  const params = new URLSearchParams();
  if (options?.workoutId) params.set("workoutId", options.workoutId);
  if (options?.exerciseId) params.set("exerciseId", options.exerciseId);
  const query = params.toString();

  return useQuery({
    queryKey: workoutExerciseKeys.lists(options),
    queryFn: () =>
      apiFetch<ListWorkoutExercisesResult>(
        `/api/workout-exercises${query ? `?${query}` : ""}`,
      ),
  });
}

export function useWorkoutExercise(
  id: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: workoutExerciseKeys.detail(id ?? ""),
    enabled: Boolean(id) && (options?.enabled ?? true),
    queryFn: () => apiFetch<WorkoutExercise>(`/api/workout-exercises/${id}`),
  });
}

export function useCreateWorkoutExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkoutExerciseInput) =>
      apiFetch<WorkoutExercise>("/api/workout-exercises", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workoutExerciseKeys.all,
      });
      void queryClient.invalidateQueries({ queryKey: workoutKeys.lists() });
    },
  });
}

export function useUpdateWorkoutExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: UpdateWorkoutExerciseInput & {
      id: string;
    }) =>
      apiFetch<WorkoutExercise>(`/api/workout-exercises/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workoutExerciseKeys.all,
      });
      void queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
    },
  });
}

export function useDeleteWorkoutExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<WorkoutExercise>(`/api/workout-exercises/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workoutExerciseKeys.all,
      });
      void queryClient.invalidateQueries({ queryKey: workoutKeys.lists() });
    },
  });
}

export function useSets(options?: {
  workoutId?: string;
  exerciseId?: string;
}) {
  const params = new URLSearchParams();
  if (options?.workoutId) params.set("workoutId", options.workoutId);
  if (options?.exerciseId) params.set("exerciseId", options.exerciseId);
  const query = params.toString();

  return useQuery({
    queryKey: setKeys.lists(options),
    queryFn: () =>
      apiFetch<ListSetsResult>(`/api/sets${query ? `?${query}` : ""}`),
    placeholderData: (previousData) => previousData,
  });
}

export function useSet(id: string | null) {
  return useQuery({
    queryKey: setKeys.detail(id ?? ""),
    enabled: Boolean(id),
    queryFn: () => apiFetch<Set>(`/api/sets/${id}`),
  });
}

export type CreateSetResult = Set & {
  unlockedAchievements?: UnlockedAchievement[];
};

export function useCreateSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSetInput) =>
      apiFetch<CreateSetResult>("/api/sets", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (item) => {
      emitAchievementUnlocks(item.unlockedAchievements ?? []);
      queryClient.setQueryData<ListSetsResult>(
        setKeys.lists({ workoutId: item.workoutId }),
        (previous) => {
          const items = previous?.items ?? [];
          if (items.some((set) => set.id === item.id)) {
            return previous ?? { items };
          }
          return { items: [...items, item] };
        },
      );
      void queryClient.invalidateQueries({ queryKey: setKeys.all });
      void queryClient.invalidateQueries({ queryKey: workoutKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: achievementKeys.all });
    },
  });
}

export function useUpdateSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateSetInput & { id: string }) =>
      apiFetch<Set>(`/api/sets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (item) => {
      void queryClient.invalidateQueries({ queryKey: setKeys.all });
      void queryClient.invalidateQueries({ queryKey: setKeys.detail(item.id) });
      void queryClient.invalidateQueries({ queryKey: workoutKeys.lists() });
    },
  });
}

export function useDeleteSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Set>(`/api/sets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: setKeys.all });
      void queryClient.invalidateQueries({ queryKey: workoutKeys.lists() });
    },
  });
}

export function useCreateImportPromptFeedback(workoutId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateImportPromptFeedbackInput) =>
      apiFetch<ImportPromptFeedback>(
        `/api/workouts/${workoutId}/prompt-feedback`,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: importPromptFeedbackKeys.latest(workoutId),
      });
    },
  });
}
