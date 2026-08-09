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

export const createWorkoutSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .describe(
      "Workout title. For follow-along videos, use the exact video title.",
    ),
});

export const updateWorkoutSchema = createWorkoutSchema.partial();

export const createExerciseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .describe(
      "Exact exercise name from the video/chapter list (one move per record, not a whole section).",
    ),
  videoUrl: z
    .string()
    .url()
    .nullable()
    .optional()
    .describe(
      "Canonical source video URL (e.g. YouTube watch URL). Required when importing from a follow-along video.",
    ),
  imageUrl: z.string().url().nullable().optional(),
  metaData: exerciseMetaDataSchema
    .nullable()
    .optional()
    .describe(
      "Per-exercise video timing. Always set videoStartTime and videoEndTime when a source video exists.",
    ),
  tags: z
    .array(z.string().trim().min(1).max(64))
    .max(50)
    .optional()
    .describe(
      "Section/muscle tags such as warmup, upper-body, lower-body, core, hiit, plus source labels like no-equipment.",
    ),
});

export const updateExerciseSchema = createExerciseSchema.partial();

export const createWorkoutExerciseSchema = z.object({
  workoutId: z.string().min(1),
  exerciseId: z.string().min(1),
});

export const updateWorkoutExerciseSchema = z
  .object({
    workoutId: z.string().min(1).optional(),
    exerciseId: z.string().min(1).optional(),
  })
  .refine((value) => value.workoutId || value.exerciseId, {
    message: "At least one field is required",
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
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
export type CreateWorkoutExerciseInput = z.infer<
  typeof createWorkoutExerciseSchema
>;
export type UpdateWorkoutExerciseInput = z.infer<
  typeof updateWorkoutExerciseSchema
>;
export type CreateSetInput = z.infer<typeof createSetSchema>;
export type UpdateSetInput = z.infer<typeof updateSetSchema>;
