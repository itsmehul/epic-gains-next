import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { listWorkoutExercises } from "@/db/repositories/workout-exercise.repository";
import { getAthleteLiftData } from "@/features/agent/context";
import { redactPii } from "@/features/agent/pii";
import { searchCatalogExercises } from "@/features/agent/search-catalog";
import { searchAthleteMuscleWork } from "@/features/agent/search-muscle-work";
import { relayToHumanTrainer } from "@/features/agent/relay-trainer";

const trainerToolContextSchema = z.object({
  userId: z.string(),
  exerciseId: z.string().optional(),
  workoutId: z.string().nullable().optional(),
  commentId: z.string().optional(),
});

export const getCurrentLiftTool = tool({
  description:
    "Fetch the athlete's current lift: exercise details, targets, video, recent logged sets, and recent notes. Use this before coaching a specific exercise or referencing their training history.",
  inputSchema: z.object({}),
  contextSchema: trainerToolContextSchema,
  execute: async (_input, { context }) => {
    return getAthleteLiftData({
      userId: context.userId,
      exerciseId: context.exerciseId,
      workoutId: context.workoutId,
      excludeCommentId: context.commentId,
    });
  },
});

export const loopInTrainerTool = tool({
  description:
    "Loop a human trainer into the current comment thread when a person should take over (pain or injury red flags, in-person form check, medical questions, or the athlete asks for their coach). The athlete must approve before anyone is notified. Looks up assigned trainers and posts your relay with @mention notifications. Call at most once per request.",
  inputSchema: z.object({
    message: z
      .string()
      .trim()
      .min(1)
      .max(4000)
      .describe(
        "What to tell the human trainer, including relevant lift context and why they are needed.",
      ),
    threadCommentId: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Comment in the thread to reply in. Omit to use the current @agent comment.",
      ),
  }),
  contextSchema: trainerToolContextSchema,
  execute: async ({ message, threadCommentId }, { context }) => {
    return relayToHumanTrainer({
      athleteId: context.userId,
      message,
      exerciseId: context.exerciseId,
      workoutId: context.workoutId,
      commentId: context.commentId,
      threadCommentId,
    });
  },
});

export const searchMuscleWorkTool = tool({
  description:
    "Search the athlete's recent logged sets for muscles related to a complaint or lift. Use when they struggle with a lift (e.g. deadlifts → back/posterior chain) or a joint (e.g. knees → quads/glutes/hamstrings). Returns matching sets to encourage pushing intensity on strengthening work they already log, plus related catalog moves.",
  inputSchema: z.object({
    query: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .describe(
        "Complaint, body region, or lift name. Examples: knees, deadlift, lower back, quads.",
      ),
    muscleGroups: z
      .array(z.enum(["chest", "back", "shoulders", "arms", "legs", "core"]))
      .max(6)
      .optional()
      .describe("Optional extra muscle groups to include."),
    keyMuscles: z
      .array(z.string().trim().min(2).max(40))
      .max(12)
      .optional()
      .describe("Optional extra key-muscle search terms (e.g. quad, lat)."),
    days: z
      .number()
      .int()
      .min(7)
      .max(90)
      .optional()
      .describe("How far back to search logged sets. Default 28."),
  }),
  contextSchema: trainerToolContextSchema,
  execute: async ({ query, muscleGroups, keyMuscles, days }, { context }) => {
    return searchAthleteMuscleWork({
      userId: context.userId,
      query: redactPii(query),
      muscleGroups,
      keyMuscles,
      currentExerciseId: context.exerciseId,
      days,
    });
  },
});

export const searchCatalogTool = tool({
  description:
    "Search the Epic Gains exercise catalog by name or alias. Use to find variants or a different catalog move before searching the web. Returns muscle tags and a workout video URL when one is stored. The current lift and its attached video are omitted.",
  inputSchema: z.object({
    q: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .describe(
        "Exercise or variant name. Examples: goblet squat, Romanian deadlift, box squat.",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(12)
      .optional()
      .describe("Max matches. Default 8."),
  }),
  contextSchema: trainerToolContextSchema,
  execute: async ({ q, limit }, { context }) => {
    let excludeVideoUrl: string | null = null;
    if (context.exerciseId) {
      const appearances = await listWorkoutExercises({
        workoutId: context.workoutId ?? undefined,
        exerciseId: context.exerciseId,
      });
      excludeVideoUrl = appearances[0]?.videoUrl ?? null;
    }
    return searchCatalogExercises({
      q: redactPii(q),
      excludeExerciseId: context.exerciseId,
      excludeVideoUrl,
      limit,
    });
  },
});
