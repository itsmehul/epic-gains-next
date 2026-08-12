import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import { db } from "@/db";
import { exercise, workout, workoutExercise } from "@/db/schema";
import {
  deleteExercise,
  getExerciseById,
  listExercises,
  updateExercise,
} from "@/db/repositories/exercise.repository";
import {
  deleteWorkoutExercise,
  listWorkoutExercises,
} from "@/db/repositories/workout-exercise.repository";
import {
  deleteWorkoutForUser,
  getWorkoutByIdForUser,
  listWorkoutsForUser,
  updateWorkoutForUser,
} from "@/db/repositories/workout.repository";
import {
  importFullWorkoutSchema,
  updateExerciseSchema,
  updateWorkoutSchema,
} from "@/features/workouts/schemas";
import { getMcpAuth } from "@/infrastructure/mcp/context";
import {
  mcpErrorResult,
  mcpTextResult,
} from "@/infrastructure/mcp/tool-helpers";
import { and, eq, sql } from "drizzle-orm";

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
    "import_full_workout",
    {
      title: "Import full workout",
      description:
        "Import a full follow-along video workout. Extracts all exercises and associates them with a new workout in a single transaction. Provide exact timestamps for each move.",
      inputSchema: importFullWorkoutSchema,
    },
    async (args) => {
      const { userId } = getMcpAuth();

      try {
        const result = await db.transaction(async (tx) => {
          // 1. Create the workout shell
          const workoutId = crypto.randomUUID();
          const [newWorkout] = await tx
            .insert(workout)
            .values({
              id: workoutId,
              name: args.workoutName,
              author: args.author ?? null,
              userId,
            })
            .returning();

          // 2. Loop over exercises
          for (const ex of args.exercises) {
            // Check for duplicates
            const [existing] = await tx
              .select()
              .from(exercise)
              .where(
                and(
                  eq(exercise.name, ex.name),
                  eq(exercise.videoUrl, args.sourceVideoUrl),
                  sql`${exercise.metaData}->>'videoStartTime' = ${ex.videoStartTime.toString()}`
                )
              )
              .limit(1);

            if (existing) {
              throw new Error(`Exercise already exists: ${ex.name} at ${ex.videoStartTime}s`);
            }

            // Create exercise
            const exerciseId = crypto.randomUUID();
            await tx.insert(exercise).values({
              id: exerciseId,
              name: ex.name,
              videoUrl: args.sourceVideoUrl,
              metaData: {
                videoStartTime: ex.videoStartTime,
                videoEndTime: ex.videoEndTime,
              },
              tags: ex.tags ?? [],
            });

            // Associate with workout
            await tx.insert(workoutExercise).values({
              workoutId,
              exerciseId,
            });
          }

          return newWorkout;
        });

        return mcpTextResult(result);
      } catch (error) {
        return mcpErrorResult(error instanceof Error ? error.message : "Failed to import workout");
      }
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
        author: updateWorkoutSchema.shape.author,
      }),
    },
    async ({ workoutId, name, author }) => {
      const { userId } = getMcpAuth();
      if (name === undefined && author === undefined) {
        return mcpErrorResult("At least one of name or author is required");
      }
      const item = await updateWorkoutForUser(workoutId, userId, {
        ...(name !== undefined ? { name } : {}),
        ...(author !== undefined ? { author } : {}),
      });
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
    "update_exercise",
    {
      title: "Update exercise",
      description:
        "Update an exercise in the shared catalog. Use this to correct names or replace approximate section timings with exact per-move videoStartTime/videoEndTime seconds.",
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
