import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  deleteExerciseForUser,
  getExerciseByIdForUser,
  listExercisesForUser,
} from "@/db/repositories/exercise.repository";
import {
  deleteWorkoutExercise,
  getWorkoutExerciseById,
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
import { normalizeExerciseName } from "@/features/workouts/exercise-name";
import { isRestWorkoutItem } from "@/features/workouts/workout-item";
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
        "Import a full follow-along video workout. Include rest periods as items named Rest with timestamps — they are timeline markers, not exercises, and are not merged or logged. Reuses an existing exercise when the name already exists for this user (canonical name or prior workout alias); otherwise creates one. The same exercise may appear more than once in the workout. Provide exact timestamps for each move.",
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

          const existingExercises = await tx
            .select()
            .from(exercise)
            .where(eq(exercise.userId, userId));

          const exerciseIdByName = new Map<string, string>();
          for (const item of existingExercises) {
            if (isRestWorkoutItem(item)) continue;
            const key = normalizeExerciseName(item.name);
            if (key && !exerciseIdByName.has(key)) {
              exerciseIdByName.set(key, item.id);
            }
          }

          if (existingExercises.length > 0) {
            const aliasRows = await tx
              .select({
                exerciseId: workoutExercise.exerciseId,
                name: workoutExercise.name,
              })
              .from(workoutExercise)
              .where(
                inArray(
                  workoutExercise.exerciseId,
                  existingExercises.map((item) => item.id),
                ),
              );

            for (const row of aliasRows) {
              if (isRestWorkoutItem(row)) continue;
              const key = normalizeExerciseName(row.name);
              if (key && !exerciseIdByName.has(key)) {
                exerciseIdByName.set(key, row.exerciseId);
              }
            }
          }

          for (const ex of args.exercises) {
            const tags = [...(ex.tags ?? [])];
            const isRest = isRestWorkoutItem({ name: ex.name, tags });

            if (isRest) {
              if (!tags.some((tag) => normalizeExerciseName(tag) === "rest")) {
                tags.push("rest");
              }
              const restExerciseId = crypto.randomUUID();
              await tx.insert(exercise).values({
                id: restExerciseId,
                userId,
                name: ex.name,
              });
              await tx.insert(workoutExercise).values({
                id: crypto.randomUUID(),
                workoutId,
                exerciseId: restExerciseId,
                name: ex.name,
                videoUrl: args.sourceVideoUrl,
                metaData: {
                  videoStartTime: ex.videoStartTime,
                  videoEndTime: ex.videoEndTime,
                },
                tags,
              });
              continue;
            }

            const key = normalizeExerciseName(ex.name);
            let exerciseId = key ? exerciseIdByName.get(key) : undefined;

            if (!exerciseId) {
              exerciseId = crypto.randomUUID();
              await tx.insert(exercise).values({
                id: exerciseId,
                userId,
                name: ex.name,
              });
              if (key) exerciseIdByName.set(key, exerciseId);
            }

            await tx.insert(workoutExercise).values({
              id: crypto.randomUUID(),
              workoutId,
              exerciseId,
              name: ex.name,
              videoUrl: args.sourceVideoUrl,
              metaData: {
                videoStartTime: ex.videoStartTime,
                videoEndTime: ex.videoEndTime,
              },
              tags,
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
        id: z.string().min(1).describe("Workout exercise appearance id."),
        name: z.string().trim().min(1).max(200).optional(),
        videoUrl: z.string().url().nullable().optional(),
        imageUrl: z.string().url().nullable().optional(),
        metaData: exerciseMetaDataSchema.nullable().optional(),
        tags: z.array(z.string().trim().min(1).max(64)).max(50).optional(),
      }),
    },
    async ({ id, ...data }) => {
      const { userId } = getMcpAuth();
      const existing = await getWorkoutExerciseById(id);
      if (!existing) return mcpErrorResult("Workout exercise not found");
      const owned = await getWorkoutByIdForUser(existing.workoutId, userId);
      if (!owned) return mcpErrorResult("Workout not found");
      const item = await updateWorkoutExercise(id, data);
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
        id: z.string().min(1).describe("Workout exercise appearance id."),
      }),
    },
    async ({ id }) => {
      const { userId } = getMcpAuth();
      const existing = await getWorkoutExerciseById(id);
      if (!existing) return mcpErrorResult("Workout exercise not found");
      const owned = await getWorkoutByIdForUser(existing.workoutId, userId);
      if (!owned) return mcpErrorResult("Workout not found");
      const item = await deleteWorkoutExercise(id);
      if (!item) return mcpErrorResult("Workout exercise not found");
      return mcpTextResult(item);
    },
  );
}
