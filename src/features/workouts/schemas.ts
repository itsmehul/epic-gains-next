import { z } from "zod";

export const exerciseMetaDataSchema = z
  .object({
    videoStartTime: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        "Exercise start time in the source video, in seconds (e.g. 64 for 1:04). Prefer exact per-move timestamps over section-level approximations.",
      ),
    videoEndTime: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        "Exercise end time in the source video, in seconds. Use the next exercise's start when available; otherwise start + work/rest duration.",
      ),
  })
  .strict();

export const listWorkoutsQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
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
          .describe("Exercise start time in the source video, in seconds."),
        videoEndTime: z
          .number()
          .nonnegative()
          .optional()
          .describe("Exercise end time in the source video, in seconds."),
        tags: z
          .array(z.string().trim().min(1).max(64))
          .max(50)
          .optional()
          .describe("Section/muscle tags such as warmup, upper-body, lower-body, core, hiit."),
      }),
    )
    .min(1)
    .describe("List of moves and rest periods in the order they appear in the video."),
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
export type CreateSetInput = z.infer<typeof createSetSchema>;
export type UpdateSetInput = z.infer<typeof updateSetSchema>;
