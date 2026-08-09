import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import {
  createExercise,
  deleteExercise,
  getExerciseById,
  listExercises,
  updateExercise,
} from "@/db/repositories/exercise.repository";
import {
  createWorkoutExercise,
  deleteWorkoutExercise,
  listWorkoutExercises,
} from "@/db/repositories/workout-exercise.repository";
import {
  createWorkout,
  deleteWorkoutForUser,
  getWorkoutByIdForUser,
  listWorkoutsForUser,
  updateWorkoutForUser,
} from "@/db/repositories/workout.repository";
import {
  createExerciseSchema,
  createWorkoutSchema,
  updateExerciseSchema,
  updateWorkoutSchema,
} from "@/features/workouts/schemas";
import { getMcpAuth } from "@/infrastructure/mcp/context";
import {
  mcpErrorResult,
  mcpTextResult,
} from "@/infrastructure/mcp/tool-helpers";

export function registerWorkoutMcpTools(server: McpServer) {
  server.registerTool(
    "list_workouts",
    {
      title: "List workouts",
      description: "List workouts for the authenticated user.",
      inputSchema: z.object({}),
    },
    async () => {
      const { userId } = getMcpAuth();
      const items = await listWorkoutsForUser(userId);
      return mcpTextResult({ items });
    },
  );

  server.registerTool(
    "get_workout",
    {
      title: "Get workout",
      description: "Get a workout by id (must belong to the authenticated user).",
      inputSchema: z.object({
        workoutId: z.string().min(1),
      }),
    },
    async ({ workoutId }) => {
      const { userId } = getMcpAuth();
      const item = await getWorkoutByIdForUser(workoutId, userId);
      if (!item) return mcpErrorResult("Workout not found");
      return mcpTextResult(item);
    },
  );

  server.registerTool(
    "create_workout",
    {
      title: "Create workout",
      description: "Create a workout for the authenticated user.",
      inputSchema: createWorkoutSchema,
    },
    async (args) => {
      const { userId } = getMcpAuth();
      const item = await createWorkout({
        id: crypto.randomUUID(),
        name: args.name,
        userId,
      });
      return mcpTextResult(item);
    },
  );

  server.registerTool(
    "update_workout",
    {
      title: "Update workout",
      description: "Update a workout owned by the authenticated user.",
      inputSchema: z.object({
        workoutId: z.string().min(1),
        name: updateWorkoutSchema.shape.name,
      }),
    },
    async ({ workoutId, name }) => {
      const { userId } = getMcpAuth();
      if (!name) return mcpErrorResult("name is required");
      const item = await updateWorkoutForUser(workoutId, userId, { name });
      if (!item) return mcpErrorResult("Workout not found");
      return mcpTextResult(item);
    },
  );

  server.registerTool(
    "delete_workout",
    {
      title: "Delete workout",
      description: "Delete a workout owned by the authenticated user.",
      inputSchema: z.object({
        workoutId: z.string().min(1),
      }),
    },
    async ({ workoutId }) => {
      const { userId } = getMcpAuth();
      const item = await deleteWorkoutForUser(workoutId, userId);
      if (!item) return mcpErrorResult("Workout not found");
      return mcpTextResult(item);
    },
  );

  server.registerTool(
    "list_exercises",
    {
      title: "List exercises",
      description: "List the shared exercise catalog.",
      inputSchema: z.object({}),
    },
    async () => {
      getMcpAuth();
      const items = await listExercises();
      return mcpTextResult({ items });
    },
  );

  server.registerTool(
    "get_exercise",
    {
      title: "Get exercise",
      description: "Get an exercise from the shared catalog by id.",
      inputSchema: z.object({
        exerciseId: z.string().min(1),
      }),
    },
    async ({ exerciseId }) => {
      getMcpAuth();
      const item = await getExerciseById(exerciseId);
      if (!item) return mcpErrorResult("Exercise not found");
      return mcpTextResult(item);
    },
  );

  server.registerTool(
    "create_exercise",
    {
      title: "Create exercise",
      description: "Create an exercise in the shared catalog.",
      inputSchema: createExerciseSchema,
    },
    async (args) => {
      getMcpAuth();
      const item = await createExercise({
        id: crypto.randomUUID(),
        name: args.name,
        videoUrl: args.videoUrl ?? null,
        imageUrl: args.imageUrl ?? null,
        metaData: args.metaData ?? null,
        tags: args.tags ?? [],
      });
      return mcpTextResult(item);
    },
  );

  server.registerTool(
    "update_exercise",
    {
      title: "Update exercise",
      description: "Update an exercise in the shared catalog.",
      inputSchema: z
        .object({
          exerciseId: z.string().min(1),
        })
        .merge(updateExerciseSchema),
    },
    async ({ exerciseId, ...data }) => {
      getMcpAuth();
      const item = await updateExercise(exerciseId, data);
      if (!item) return mcpErrorResult("Exercise not found");
      return mcpTextResult(item);
    },
  );

  server.registerTool(
    "delete_exercise",
    {
      title: "Delete exercise",
      description:
        "Delete an exercise from the shared catalog (removes associations).",
      inputSchema: z.object({
        exerciseId: z.string().min(1),
      }),
    },
    async ({ exerciseId }) => {
      getMcpAuth();
      const item = await deleteExercise(exerciseId);
      if (!item) return mcpErrorResult("Exercise not found");
      return mcpTextResult(item);
    },
  );

  server.registerTool(
    "list_workout_exercises",
    {
      title: "List workout exercises",
      description:
        "List exercises associated with a workout owned by the authenticated user.",
      inputSchema: z.object({
        workoutId: z.string().min(1),
      }),
    },
    async ({ workoutId }) => {
      const { userId } = getMcpAuth();
      const workout = await getWorkoutByIdForUser(workoutId, userId);
      if (!workout) return mcpErrorResult("Workout not found");
      const items = await listWorkoutExercises({ workoutId });
      return mcpTextResult({ items });
    },
  );

  server.registerTool(
    "add_exercise_to_workout",
    {
      title: "Add exercise to workout",
      description:
        "Associate a shared exercise with a workout owned by the authenticated user.",
      inputSchema: z.object({
        workoutId: z.string().min(1),
        exerciseId: z.string().min(1),
      }),
    },
    async ({ workoutId, exerciseId }) => {
      const { userId } = getMcpAuth();
      const workout = await getWorkoutByIdForUser(workoutId, userId);
      if (!workout) return mcpErrorResult("Workout not found");
      const exercise = await getExerciseById(exerciseId);
      if (!exercise) return mcpErrorResult("Exercise not found");
      const item = await createWorkoutExercise({ workoutId, exerciseId });
      return mcpTextResult(item);
    },
  );

  server.registerTool(
    "remove_exercise_from_workout",
    {
      title: "Remove exercise from workout",
      description:
        "Remove an exercise association from a workout owned by the authenticated user.",
      inputSchema: z.object({
        workoutId: z.string().min(1),
        exerciseId: z.string().min(1),
      }),
    },
    async ({ workoutId, exerciseId }) => {
      const { userId } = getMcpAuth();
      const workout = await getWorkoutByIdForUser(workoutId, userId);
      if (!workout) return mcpErrorResult("Workout not found");
      const item = await deleteWorkoutExercise(workoutId, exerciseId);
      if (!item) return mcpErrorResult("Workout exercise not found");
      return mcpTextResult(item);
    },
  );
}
