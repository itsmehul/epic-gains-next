import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { getAthleteLiftData } from "@/features/agent/context";
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
    "Loop a human trainer into the current comment thread when a person should take over (pain or injury red flags, in-person form check, medical questions, or the athlete asks for their coach). Looks up assigned trainers and posts your relay with @mention notifications. Call at most once per request.",
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
      query,
      muscleGroups,
      keyMuscles,
      currentExerciseId: context.exerciseId,
      days,
    });
  },
});
