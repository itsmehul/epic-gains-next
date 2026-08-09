"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateExerciseInput,
  CreateSetInput,
  CreateWorkoutExerciseInput,
  CreateWorkoutInput,
  UpdateExerciseInput,
  UpdateSetInput,
  UpdateWorkoutExerciseInput,
  UpdateWorkoutInput,
} from "@/features/workouts/schemas";
import type {
  Exercise,
  ListExercisesResult,
  ListSetsResult,
  ListWorkoutExercisesResult,
  ListWorkoutsResult,
  Set,
  Workout,
  WorkoutExercise,
} from "@/features/workouts/types";
import { apiFetch } from "@/shared/api";

export const workoutKeys = {
  all: ["workouts"] as const,
  lists: () => [...workoutKeys.all, "list"] as const,
  detail: (id: string) => [...workoutKeys.all, "detail", id] as const,
};

export const exerciseKeys = {
  all: ["exercises"] as const,
  lists: () => [...exerciseKeys.all, "list"] as const,
  detail: (id: string) => [...exerciseKeys.all, "detail", id] as const,
};

export const workoutExerciseKeys = {
  all: ["workout-exercises"] as const,
  lists: (params?: { workoutId?: string; exerciseId?: string }) =>
    [...workoutExerciseKeys.all, "list", params ?? {}] as const,
  detail: (workoutId: string, exerciseId: string) =>
    [...workoutExerciseKeys.all, "detail", workoutId, exerciseId] as const,
};

export const setKeys = {
  all: ["sets"] as const,
  lists: (params?: { workoutId?: string; exerciseId?: string }) =>
    [...setKeys.all, "list", params ?? {}] as const,
  detail: (id: string) => [...setKeys.all, "detail", id] as const,
};

export function useWorkouts() {
  return useQuery({
    queryKey: workoutKeys.lists(),
    queryFn: () => apiFetch<ListWorkoutsResult>("/api/workouts"),
  });
}

export function useWorkout(id: string | null) {
  return useQuery({
    queryKey: workoutKeys.detail(id ?? ""),
    enabled: Boolean(id),
    queryFn: () => apiFetch<Workout>(`/api/workouts/${id}`),
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

export function useExercises() {
  return useQuery({
    queryKey: exerciseKeys.lists(),
    queryFn: () => apiFetch<ListExercisesResult>("/api/exercises"),
  });
}

export function useExercise(id: string | null) {
  return useQuery({
    queryKey: exerciseKeys.detail(id ?? ""),
    enabled: Boolean(id),
    queryFn: () => apiFetch<Exercise>(`/api/exercises/${id}`),
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

export function useUpdateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateExerciseInput & { id: string }) =>
      apiFetch<Exercise>(`/api/exercises/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (item) => {
      void queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
      void queryClient.invalidateQueries({
        queryKey: exerciseKeys.detail(item.id),
      });
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
  workoutId: string | null,
  exerciseId: string | null,
) {
  return useQuery({
    queryKey: workoutExerciseKeys.detail(workoutId ?? "", exerciseId ?? ""),
    enabled: Boolean(workoutId && exerciseId),
    queryFn: () =>
      apiFetch<WorkoutExercise>(
        `/api/workout-exercises/${workoutId}/${exerciseId}`,
      ),
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
    },
  });
}

export function useUpdateWorkoutExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workoutId,
      exerciseId,
      ...input
    }: UpdateWorkoutExerciseInput & {
      workoutId: string;
      exerciseId: string;
    }) =>
      apiFetch<WorkoutExercise>(
        `/api/workout-exercises/${workoutId}/${exerciseId}`,
        {
          method: "PATCH",
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workoutExerciseKeys.all,
      });
    },
  });
}

export function useDeleteWorkoutExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workoutId,
      exerciseId,
    }: {
      workoutId: string;
      exerciseId: string;
    }) =>
      apiFetch<WorkoutExercise>(
        `/api/workout-exercises/${workoutId}/${exerciseId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workoutExerciseKeys.all,
      });
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
  });
}

export function useSet(id: string | null) {
  return useQuery({
    queryKey: setKeys.detail(id ?? ""),
    enabled: Boolean(id),
    queryFn: () => apiFetch<Set>(`/api/sets/${id}`),
  });
}

export function useCreateSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSetInput) =>
      apiFetch<Set>("/api/sets", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: setKeys.all });
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
    },
  });
}
