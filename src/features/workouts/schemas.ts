import { z } from "zod";

export const exerciseMetaDataSchema = z
  .object({
    videoStartTime: z.number().nonnegative().optional(),
    videoEndTime: z.number().nonnegative().optional(),
  })
  .strict();

export const createWorkoutSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

export const updateWorkoutSchema = createWorkoutSchema.partial();

export const createExerciseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  videoUrl: z.string().url().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  metaData: exerciseMetaDataSchema.nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(50).optional(),
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
