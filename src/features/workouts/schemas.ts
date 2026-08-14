import { z } from "zod";

import {
  METRIC_PROFILE_VALUES,
  MUSCLE_GROUP_VALUES,
} from "@/db/schema/workout-schema";

export const exerciseMetaDataSchema = z
  .object({
    videoStartTime: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        "This move's start in the source video, in seconds (e.g. 0 for 0:00). Use this move's chapter timestamp, not the next chapter.",
      ),
    videoEndTime: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        "This move's end in the source video, in seconds. Use the next chapter timestamp (which is also the next move's start), or video duration for the last move.",
      ),
  })
  .strict();

export const metricProfileEnum = z.enum(METRIC_PROFILE_VALUES);
export const muscleGroupEnum = z.enum(MUSCLE_GROUP_VALUES);
export const keyMusclesSchema = z
  .array(z.string().trim().min(1).max(80))
  .max(8);

export const listWorkoutsQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  muscleGroup: z
    .array(muscleGroupEnum)
    .max(MUSCLE_GROUP_VALUES.length)
    .optional(),
});

export const createWorkoutSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .describe(
      "Workout title. For follow-along videos, use the exact video title.",
    ),
  author: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .nullable()
    .optional()
    .describe(
      "Optional YouTube channel / video author name (e.g. the creator credited on the video).",
    ),
  channelUrl: z
    .string()
    .trim()
    .url()
    .max(2048)
    .nullable()
    .optional()
    .describe("Optional YouTube channel URL (opens the creator's channel)."),
});

export const updateWorkoutSchema = createWorkoutSchema.partial();

/** Canonical exercise: identity + standardized name only. */
export const createExerciseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .describe(
      "Exact exercise name from the video/chapter list (one move per record, not a whole section).",
    ),
  metric_profile: metricProfileEnum.optional(),
  muscle_group: muscleGroupEnum.optional(),
  key_muscles: keyMusclesSchema.optional(),
});

export const listExercisesQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  excludeId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const similarExercisesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).optional(),
  workoutId: z.string().min(1).optional(),
  workoutExerciseId: z.string().min(1).optional(),
});

export const mergeExerciseSchema = z.object({
  targetExerciseId: z.string().min(1),
  workoutId: z.string().min(1),
  workoutExerciseId: z.string().min(1).optional(),
});

export const importFullWorkoutSchema = z.object({
  workoutName: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .describe("Workout title. For follow-along videos, use the exact video title."),
  author: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .describe(
      "Optional YouTube channel / video author name (e.g. the creator credited on the video).",
    ),
  channelUrl: z
    .string()
    .trim()
    .url()
    .max(2048)
    .optional()
    .describe("Optional YouTube channel URL (e.g. https://www.youtube.com/@handle)."),
  sourceVideoUrl: z
    .string()
    .url()
    .describe("Canonical source video URL (e.g. YouTube watch URL)."),
  exercises: z
    .array(
      z.object({
        name: z
          .string()
          .trim()
          .min(1)
          .max(200)
          .describe("Exact exercise name from the video/chapter list. Use Rest for recovery gaps between moves — those are timeline markers, not exercises."),
        videoStartTime: z
          .number()
          .nonnegative()
          .describe(
            "This move's start in the source video, in seconds. Use this move's chapter timestamp (T[i]), not the next chapter.",
          ),
        videoEndTime: z
          .number()
          .nonnegative()
          .optional()
          .describe(
            "This move's end in the source video, in seconds. Use the next move's chapter timestamp (T[i+1]), or video duration for the last move. Must equal the next exercise's videoStartTime.",
          ),
        tags: z
          .array(z.string().trim().min(1).max(64))
          .max(50)
          .optional()
          .describe("Section/muscle tags such as warmup, upper-body, lower-body, core, hiit."),
        metric_profile: metricProfileEnum.optional().describe(
          "Tracking profile that determines which set fields to show (weight, reps, time, distance).",
        ),
        muscle_group: muscleGroupEnum.optional().describe(
          "Primary muscle group: chest, back, shoulders, arms, legs, or core.",
        ),
        key_muscles: keyMusclesSchema.optional().describe(
          "Specific anatomical muscles used (e.g. Tibialis Anterior, Peroneus Tertius).",
        ),
      }),
    )
    .min(1)
    .describe("List of moves and rest periods in the order they appear in the video."),
});

const clockTimestampSchema = z
  .string()
  .trim()
  .regex(
    /^\[?\d{1,2}:\d{2}(?::\d{2})?\]?$/,
    "Timestamp must be MM:SS or HH:MM:SS",
  );

export const importWorkoutStructureSchema = z.object({
  workoutName: z.string().trim().min(1).max(200).optional(),
  author: z.string().trim().min(1).max(200).optional(),
  channelUrl: z.string().trim().url().max(2048).optional(),
  sourceVideoUrl: z.string().url().optional(),
  overview: z.object({
    workout_length: z.string().trim().min(1).max(64),
    structure: z.string().trim().min(1).max(200).optional(),
    interval_pattern: z.string().trim().min(1).max(128),
    equipment_needed: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
  }),
  sections: z
    .array(
      z.object({
        section_name: z.string().trim().min(1).max(200),
        exercises: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(200),
              timestamp: clockTimestampSchema,
              metric_profile: metricProfileEnum.optional(),
              metricProfile: metricProfileEnum.optional(),
              muscle_group: muscleGroupEnum.optional(),
              muscleGroup: muscleGroupEnum.optional(),
              key_muscles: keyMusclesSchema.optional(),
              keyMuscles: keyMusclesSchema.optional(),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

export const createWorkoutExerciseSchema = z.object({
  workoutId: z.string().min(1),
  exerciseId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  videoUrl: z.string().url().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  metaData: exerciseMetaDataSchema.nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(50).optional(),
});

export const updateWorkoutExerciseSchema = z
  .object({
    workoutId: z.string().min(1).optional(),
    exerciseId: z.string().min(1).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    videoUrl: z.string().url().nullable().optional(),
    imageUrl: z.string().url().nullable().optional(),
    metaData: exerciseMetaDataSchema.nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(64)).max(50).optional(),
  })
  .refine(
    (value) =>
      value.workoutId ||
      value.exerciseId ||
      value.name ||
      value.videoUrl !== undefined ||
      value.imageUrl !== undefined ||
      value.metaData !== undefined ||
      value.tags !== undefined,
    { message: "At least one field is required" },
  );

export const listSetsQuerySchema = z.object({
  workoutId: z.string().min(1).optional(),
  exerciseId: z.string().min(1).optional(),
});

export const createSetSchema = z.object({
  reps: z.number().int().nonnegative().nullable().optional(),
  weight: z.number().nonnegative().nullable().optional(),
  time: z.number().nonnegative().nullable().optional(),
  distance: z.number().nonnegative().nullable().optional(),
  workoutId: z.string().min(1),
  exerciseId: z.string().min(1),
});

export const updateSetSchema = createSetSchema.partial();

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type ListWorkoutsQuery = z.infer<typeof listWorkoutsQuerySchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type ListExercisesQuery = z.infer<typeof listExercisesQuerySchema>;
export type MergeExerciseInput = z.infer<typeof mergeExerciseSchema>;
export type CreateWorkoutExerciseInput = z.infer<
  typeof createWorkoutExerciseSchema
>;
export type UpdateWorkoutExerciseInput = z.infer<
  typeof updateWorkoutExerciseSchema
>;
export type ImportFullWorkoutInput = z.infer<typeof importFullWorkoutSchema>;
export type ImportWorkoutStructureInput = z.infer<
  typeof importWorkoutStructureSchema
>;
export type ListSetsQuery = z.infer<typeof listSetsQuerySchema>;
export type CreateSetInput = z.infer<typeof createSetSchema>;
export type UpdateSetInput = z.infer<typeof updateSetSchema>;
