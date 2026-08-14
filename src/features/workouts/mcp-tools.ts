import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { count, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  consolidateDuplicateExercisesForUser,
  deleteExerciseForUser,
  fillMissingExerciseCatalogFields,
  getExerciseByIdForUser,
  listExercisesForUser,
  resolveCanonicalRestExercise,
} from "@/db/repositories/exercise.repository";
import {
  deleteWorkoutExercise,
  getWorkoutExerciseById,
  listWorkoutExercises,
  updateWorkoutExercise,
} from "@/db/repositories/workout-exercise.repository";
import { listSetsByPeriodForUser, getPerformanceMetricsForUser } from "@/db/repositories/set.repository";
import { getUserByUsername } from "@/db/repositories/social.repository";
import {
  deleteWorkoutForUser,
  getWorkoutByIdForUser,
  listWorkoutsForUser,
  updateWorkoutForUser,
} from "@/db/repositories/workout.repository";
import { canViewUserWorkouts } from "@/features/social/privacy";
import { exercise, workout, workoutExercise } from "@/db/schema";
import { exerciseNameLookupKeys } from "@/features/workouts/exercise-name";
import {
  resolveImportKeyMuscles,
  resolveImportMetricProfile,
  resolveImportMuscleGroup,
} from "@/features/workouts/import-structure";
import {
  exerciseMetaDataSchema,
  importFullWorkoutSchema,
  muscleGroupEnum,
  updateWorkoutSchema,
} from "@/features/workouts/schemas";
import {
  parseIsoDate,
  SET_PERIOD_VALUES,
} from "@/features/workouts/set-day";
import { isRestWorkoutItem, withRestTag } from "@/features/workouts/workout-item";
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
        "Import a full follow-along video workout. Include rest periods as items named Rest with timestamps — they are timeline markers, not logged exercises. All rests share one Rest exercise per user. Reuses an existing exercise when the name already exists for this user (canonical name or prior workout alias); otherwise creates one. The same exercise may appear more than once in the workout. Chapter timestamps are the START of each move: videoStartTime is that chapter's time, videoEndTime is the next chapter's time (or video duration for the last move). Do not shift starts onto the next chapter.",
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
              channelUrl: args.channelUrl ?? null,
              userId,
            })
            .returning();

          const existingExercises = await tx
            .select()
            .from(exercise)
            .where(eq(exercise.userId, userId));

          const existingIds = existingExercises.map((item) => item.id);
          const usageRows =
            existingIds.length === 0
              ? []
              : await tx
                .select({
                  exerciseId: workoutExercise.exerciseId,
                  n: count(),
                })
                .from(workoutExercise)
                .where(inArray(workoutExercise.exerciseId, existingIds))
                .groupBy(workoutExercise.exerciseId);
          const usageById = new Map(
            usageRows.map((row) => [row.exerciseId, Number(row.n)]),
          );

          const existingById = new Map(
            existingExercises.map((item) => [item.id, item] as const),
          );

          const exerciseIdByName = new Map<string, string>();

          function rememberExercise(name: string, exerciseId: string) {
            const usage = usageById.get(exerciseId) ?? 0;
            for (const key of exerciseNameLookupKeys(name)) {
              const current = exerciseIdByName.get(key);
              if (!current) {
                exerciseIdByName.set(key, exerciseId);
                continue;
              }
              const currentUsage = usageById.get(current) ?? 0;
              if (usage > currentUsage) {
                exerciseIdByName.set(key, exerciseId);
              }
            }
          }

          for (const item of existingExercises) {
            if (isRestWorkoutItem(item)) continue;
            rememberExercise(item.name, item.id);
          }

          if (existingIds.length > 0) {
            const aliasRows = await tx
              .select({
                exerciseId: workoutExercise.exerciseId,
                name: workoutExercise.name,
              })
              .from(workoutExercise)
              .where(inArray(workoutExercise.exerciseId, existingIds));

            for (const row of aliasRows) {
              if (isRestWorkoutItem(row)) continue;
              rememberExercise(row.name, row.exerciseId);
            }
          }

          const hasRest = args.exercises.some((ex) =>
            isRestWorkoutItem({ name: ex.name, tags: ex.tags }),
          );
          const restExerciseId = hasRest
            ? await resolveCanonicalRestExercise(tx, userId)
            : null;

          for (const ex of args.exercises) {
            if (isRestWorkoutItem({ name: ex.name, tags: ex.tags })) {
              if (!restExerciseId) continue;
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
                tags: withRestTag(ex.tags),
              });
              continue;
            }

            const keys = exerciseNameLookupKeys(ex.name);
            let exerciseId = keys
              .map((key) => exerciseIdByName.get(key))
              .find((id): id is string => Boolean(id));

            if (!exerciseId) {
              exerciseId = crypto.randomUUID();
              const [created] = await tx
                .insert(exercise)
                .values({
                  id: exerciseId,
                  userId,
                  name: ex.name,
                  metricProfile: resolveImportMetricProfile(ex),
                  muscleGroup: resolveImportMuscleGroup(ex),
                  keyMuscles: resolveImportKeyMuscles(ex) ?? [],
                })
                .returning();
              usageById.set(exerciseId, 0);
              rememberExercise(ex.name, exerciseId);
              if (created) existingById.set(exerciseId, created);
            } else {
              const current = existingById.get(exerciseId);
              if (current) {
                const enriched = await fillMissingExerciseCatalogFields(
                  tx,
                  current,
                  {
                    metricProfile: resolveImportMetricProfile(ex),
                    muscleGroup: resolveImportMuscleGroup(ex),
                    keyMuscles: resolveImportKeyMuscles(ex),
                  },
                );
                existingById.set(exerciseId, enriched);
              }
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
              tags: ex.tags ?? [],
            });
            usageById.set(exerciseId, (usageById.get(exerciseId) ?? 0) + 1);
            rememberExercise(ex.name, exerciseId);
          }

          await consolidateDuplicateExercisesForUser(userId, tx);

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
        channelUrl: updateWorkoutSchema.shape.channelUrl,
      }),
    },
    async ({ workoutId, name, author, channelUrl }) => {
      const { userId } = getMcpAuth();
      if (
        name === undefined &&
        author === undefined &&
        channelUrl === undefined
      ) {
        return mcpErrorResult(
          "At least one of name, author, or channelUrl is required",
        );
      }
      const item = await updateWorkoutForUser(workoutId, userId, {
        ...(name !== undefined ? { name } : {}),
        ...(author !== undefined ? { author } : {}),
        ...(channelUrl !== undefined ? { channelUrl } : {}),
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

  server.registerTool(
    "performance_data",
    {
      title: "Performance data",
      description:
        "Granular logged sets for one calendar window (day, ISO week, month, or year). Prefer performance_metrics for training recaps, week-over-week trends, streaks, or PRs — that tool returns every comparison window in one call. Use this tool when you need set-level detail and comments for a single period.",
      inputSchema: z.object({
        period: z.enum(SET_PERIOD_VALUES).describe(
          "Time window to summarize: day, week (ISO Monday–Sunday), month, or year containing `date`. Use week for “this week” questions.",
        ),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe(
            "Anchor date as YYYY-MM-DD. Defaults to today. Selects the day/week/month/year that contains this date.",
          ),
        username: z
          .string()
          .trim()
          .min(1)
          .optional()
          .describe(
            "Friend to summarize. Omit for the authenticated user. Required when asking about someone else’s training.",
          ),
        muscleGroup: muscleGroupEnum
          .optional()
          .describe("Only include exercises in this muscle group."),
        keyMuscle: z
          .string()
          .trim()
          .min(1)
          .max(80)
          .optional()
          .describe("Only include exercises whose key muscles match this name."),
      }),
    },
    async ({ period, date, username, muscleGroup, keyMuscle }) => {
      const { userId } = getMcpAuth();
      const on = date ? parseIsoDate(date) : new Date();
      if (date && !on) {
        return mcpErrorResult("date must be a valid YYYY-MM-DD calendar date");
      }

      const owner = await resolvePerformanceOwner(userId, username);
      if ("error" in owner) return mcpErrorResult(owner.error);

      const result = await listSetsByPeriodForUser(owner.ownerId, {
        period,
        date: on ?? undefined,
        muscleGroup,
        keyMuscle,
        viewerId: userId,
      });
      return mcpTextResult(
        owner.ownerUsername
          ? { ...result, username: owner.ownerUsername }
          : result,
      );
    },
  );

  server.registerTool(
    "performance_metrics",
    {
      title: "Performance metrics",
      description:
        "One-call training analytics. Use this instead of multiple performance_data calls. Returns focal-day, current ISO week (Mon–Sun), prior week, and trailing 30-day stats (volume, sessions, set counts, muscle-group mix), week-over-week deltas, streak, personal records in the 30-day window vs all-time, every visible comment on this athlete’s exercises with exercise and workout context, and a compact daily rollup (comments nested on the matching exercise). Defaults to the authenticated user; pass username for a visible friend. For a recap of yesterday, pass yesterday’s date.",
      inputSchema: z.object({
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe(
            "As-of date YYYY-MM-DD. Defaults to today. Focal day is this date; current/prior weeks and the 30-day window are relative to it.",
          ),
        username: z
          .string()
          .trim()
          .min(1)
          .optional()
          .describe(
            "Friend to summarize. Omit for the authenticated user.",
          ),
        muscleGroup: muscleGroupEnum
          .optional()
          .describe("Only include exercises in this muscle group."),
        keyMuscle: z
          .string()
          .trim()
          .min(1)
          .max(80)
          .optional()
          .describe("Only include exercises whose key muscles match this name."),
      }),
    },
    async ({ date, username, muscleGroup, keyMuscle }) => {
      const { userId } = getMcpAuth();
      const on = date ? parseIsoDate(date) : new Date();
      if (date && !on) {
        return mcpErrorResult("date must be a valid YYYY-MM-DD calendar date");
      }

      const owner = await resolvePerformanceOwner(userId, username);
      if ("error" in owner) return mcpErrorResult(owner.error);

      const result = await getPerformanceMetricsForUser(owner.ownerId, {
        date: on ?? undefined,
        muscleGroup,
        keyMuscle,
        viewerId: userId,
      });
      return mcpTextResult(
        owner.ownerUsername
          ? { ...result, username: owner.ownerUsername }
          : result,
      );
    },
  );
}

async function resolvePerformanceOwner(
  viewerId: string,
  username?: string,
): Promise<
  | { ownerId: string; ownerUsername: string | null }
  | { error: string }
> {
  if (!username) {
    return { ownerId: viewerId, ownerUsername: null };
  }
  const owner = await getUserByUsername(username);
  if (!owner) return { error: "User not found" };
  if (!(await canViewUserWorkouts(viewerId, owner))) {
    return { error: "Workouts are not visible for this user" };
  }
  return { ownerId: owner.id, ownerUsername: owner.username };
}
