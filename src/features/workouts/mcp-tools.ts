import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import { isCatalogAdmin } from "@/shared/env";

import {
  deleteExercise,
  getExerciseById,
  listExercises,
} from "@/db/repositories/exercise.repository";
import {
  importSharedWorkout,
  WorkoutImportConflictError,
} from "@/features/workouts/import-workout";
import {
  deleteWorkoutExercise,
  getWorkoutExerciseById,
  listWorkoutExercises,
  updateWorkoutExercise,
} from "@/db/repositories/workout-exercise.repository";
import { listSetsByPeriodForUser, getPerformanceMetricsForUser } from "@/db/repositories/set.repository";
import { getUserByUsername } from "@/db/repositories/social.repository";
import {
  archiveWorkoutForUser,
  getWorkoutById,
  getWorkoutByIdForUser,
  listMyWorkouts,
  updateWorkoutForUser,
} from "@/db/repositories/workout.repository";
import { canViewUserWorkouts } from "@/features/social/privacy";
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
      description:
        "List workouts for the authenticated user. Do not call this to assemble a follow-along import — use import_full_workout.",
      inputSchema: z.object({}),
    },
    async () => {
      const { userId } = getMcpAuth();
      const items = await listMyWorkouts(userId);
      return mcpTextResult({ items });
    },
  );

  server.registerTool(
    "get_workout",
    {
      title: "Get workout",
      description: "Get a workout by id.",
      inputSchema: z.object({
        workoutId: z.string().min(1),
      }),
    },
    async ({ workoutId }) => {
      const { userId } = getMcpAuth();
      const item = await getWorkoutById(workoutId);
      if (!item) return mcpErrorResult("Workout not found");
      return mcpTextResult(item);
    },
  );

  server.registerTool(
    "import_full_workout",
    {
      title: "Import full workout",
      description:
        "Create a follow-along video workout and all of its moves in one call. Watch the video (timers, beeps, overlays) and lock starts to the interval grid. Do not search the web for chapters or transcripts unless the video has no usable timing cues. Do not call list_exercises or list_workouts first — names are reused automatically. Skip rest, water, intro, and preview. videoEndTime is required and must equal the next videoStartTime (last move ends at video duration). One grid slot per exercise; do not merge two work intervals. Times are seconds. Include metric_profile, muscle_group, key_muscles, suggested_sets (usually 1), and suggested_time (work seconds) or suggested_reps.",
      inputSchema: importFullWorkoutSchema,
    },
    async (args) => {
      const { userId } = getMcpAuth();

      try {
        const result = await importSharedWorkout(userId, args);
        return mcpTextResult(result);
      } catch (error) {
        if (error instanceof WorkoutImportConflictError) {
          return mcpErrorResult(
            `${error.message}: ${error.existingWorkoutId}`,
          );
        }
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
      title: "Archive workout",
      description: "Archive a workout owned by the authenticated user.",
      inputSchema: z.object({
        workoutId: z.string().min(1),
      }),
    },
    async ({ workoutId }) => {
      const { userId } = getMcpAuth();
      const item = await archiveWorkoutForUser(workoutId, userId);
      if (!item) return mcpErrorResult("Workout not found");
      return mcpTextResult(item);
    },
  );

  server.registerTool(
    "list_exercises",
    {
      title: "List exercises",
      description:
        "List the shared exercise catalog. Do not call this when importing a follow-along; import_full_workout reuses matching names.",
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
      description: "Delete an exercise from the shared catalog (admin only).",
      inputSchema: z.object({
        exerciseId: z.string().min(1),
      }),
    },
    async ({ exerciseId }) => {
      const { userId } = getMcpAuth();
      if (!isCatalogAdmin(userId)) {
        return mcpErrorResult("Forbidden");
      }
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
        "List exercises associated with a workout.",
      inputSchema: z.object({
        workoutId: z.string().min(1),
      }),
    },
    async ({ workoutId }) => {
      getMcpAuth();
      const existing = await getWorkoutById(workoutId);
      if (!existing) return mcpErrorResult("Workout not found");
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
