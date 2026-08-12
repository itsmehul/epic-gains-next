import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  deleteExerciseForUser,
  getExerciseByIdForUser,
  listExercisesForUser,
} from "@/db/repositories/exercise.repository";
import {
  deleteWorkoutExercise,
  listWorkoutExercises,
  updateWorkoutExercise,
} from "@/db/repositories/workout-exercise.repository";
import {
  deleteWorkoutForUser,
  getWorkoutByIdForUser,
  listWorkoutsForUser,
  updateWorkoutForUser,
} from "@/db/repositories/workout.repository";
import { exercise, workout, workoutExercise } from "@/db/schema";
import {
  exerciseMetaDataSchema,
  importFullWorkoutSchema,
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

          const usedExerciseIds = new Set<string>();

          for (const ex of args.exercises) {
            const [existing] = await tx
              .select({
                exerciseId: workoutExercise.exerciseId,
              })
              .from(workoutExercise)
              .innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
              .where(
                and(
                  eq(exercise.userId, userId),
                  eq(workoutExercise.name, ex.name),
                  eq(workoutExercise.videoUrl, args.sourceVideoUrl),
                  sql`${workoutExercise.metaData}->>'videoStartTime' = ${ex.videoStartTime.toString()}`,
                ),
              )
              .limit(1);

            let exerciseId = existing?.exerciseId;

            if (!exerciseId || usedExerciseIds.has(exerciseId)) {
              exerciseId = crypto.randomUUID();
              await tx.insert(exercise).values({
                id: exerciseId,
                userId,
                name: ex.name,
              });
            }
            usedExerciseIds.add(exerciseId);

            await tx.insert(workoutExercise).values({
              workoutId,
              exerciseId,
              name: ex.name,
              videoUrl: args.sourceVideoUrl,
              metaData: {
                videoStartTime: ex.videoStartTime,
                videoEndTime: ex.videoEndTime,
              },
              tags: ex.tags ?? [],
            });
          }

          return newWorkout;
        });

        return mcpTextResult(result);
      } catch (error) {
        return mcpErrorResult(
          error instanceof Error ? error.message : "Failed to import workout",
        );
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
      description: "List exercises owned by the authenticated user.",
      inputSchema: z.object({}),
    },
    async () => {
      const { userId } = getMcpAuth();
      const items = await listExercisesForUser(userId);
      return mcpTextResult({ items });
    },
  );

  server.registerTool(
    "get_exercise",
    {
      title: "Get exercise",
      description: "Get an exercise owned by the authenticated user by id.",
      inputSchema: z.object({
        exerciseId: z.string().min(1),
      }),
    },
    async ({ exerciseId }) => {
      const { userId } = getMcpAuth();
      const item = await getExerciseByIdForUser(exerciseId, userId);
      if (!item) return mcpErrorResult("Exercise not found");
      return mcpTextResult(item);
    },
  );

  server.registerTool(
    "update_workout_exercise",
    {
      title: "Update workout exercise",
      description:
        "Update a workout exercise appearance (local name, video URL, timings, tags). Canonical exercise names cannot be renamed — merge instead.",
      inputSchema: z.object({
        workoutId: z.string().min(1),
        exerciseId: z.string().min(1),
        name: z.string().trim().min(1).max(200).optional(),
        videoUrl: z.string().url().nullable().optional(),
        imageUrl: z.string().url().nullable().optional(),
        metaData: exerciseMetaDataSchema.nullable().optional(),
        tags: z.array(z.string().trim().min(1).max(64)).max(50).optional(),
      }),
    },
    async ({ workoutId, exerciseId, ...data }) => {
      const { userId } = getMcpAuth();
      const owned = await getWorkoutByIdForUser(workoutId, userId);
      if (!owned) return mcpErrorResult("Workout not found");
      const item = await updateWorkoutExercise(workoutId, exerciseId, data);
      if (!item) return mcpErrorResult("Workout exercise not found");
      return mcpTextResult(item);
    },
  );

  server.registerTool(
    "delete_exercise",
    {
      title: "Delete exercise",
      description:
        "Delete an exercise owned by the authenticated user (removes associations).",
      inputSchema: z.object({
        exerciseId: z.string().min(1),
      }),
    },
    async ({ exerciseId }) => {
      const { userId } = getMcpAuth();
      const item = await deleteExerciseForUser(exerciseId, userId);
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
      const owned = await getWorkoutByIdForUser(workoutId, userId);
      if (!owned) return mcpErrorResult("Workout not found");
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
      const owned = await getWorkoutByIdForUser(workoutId, userId);
      if (!owned) return mcpErrorResult("Workout not found");
      const item = await deleteWorkoutExercise(workoutId, exerciseId);
      if (!item) return mcpErrorResult("Workout exercise not found");
      return mcpTextResult(item);
    },
  );
}
