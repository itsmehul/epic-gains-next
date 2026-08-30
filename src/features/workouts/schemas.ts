import { z } from "zod";

import {
  METRIC_PROFILE_VALUES,
  MUSCLE_GROUP_VALUES,
} from "@/db/schema/workout-schema";
import {
  IMPORT_PROMPT_INSTRUCTION_IDS,
  IMPORT_PROMPT_VERDICTS,
} from "@/features/workouts/import-prompt-instructions";

export const targetSetSchema = z.object({
  reps: z.number().int().nonnegative().nullable().optional(),
  weight: z.number().nonnegative().nullable().optional(),
  time: z.number().nonnegative().nullable().optional(),
  distance: z.number().nonnegative().nullable().optional(),
});

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
    targets: z.array(targetSetSchema).optional(),
  })
  .strict();

export const metricProfileEnum = z.enum(METRIC_PROFILE_VALUES);
export const muscleGroupEnum = z.enum(MUSCLE_GROUP_VALUES);
export const keyMusclesSchema = z
  .array(z.string().trim().min(1).max(80))
  .max(8);

export const listWorkoutsQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  scope: z.enum(["mine", "catalog"]).optional(),
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
          .describe(
            "Canonical move name from the video overlay or coach callout, not a section title.",
          ),
        videoStartTime: z
          .number()
          .nonnegative()
          .describe(
            "This move's start in seconds. Use the interval-grid start (timer reset, beep, overlay). If chapters exist, use this move's START T[i], never T[i+1].",
          ),
        videoEndTime: z
          .number()
          .nonnegative()
          .describe(
            "This move's end in seconds. Must equal the next exercise's videoStartTime, or video duration for the last move.",
          ),
        tags: z
          .array(z.string().trim().min(1).max(64))
          .max(50)
          .optional()
          .describe("Section/muscle tags such as warmup, upper-body, lower-body, core, hiit."),
        metric_profile: metricProfileEnum.optional().describe(
          "Required for follow-alongs. BODYWEIGHT_REPS for unweighted reps; TIMED_HOLD for isometric/stretch holds; WEIGHT_REPS for external load; WEIGHTED_REPS for loaded bodyweight; CARDIO_DISTANCE for locomotion; LOADED_CARRY; CUSTOM otherwise.",
        ),
        muscle_group: muscleGroupEnum.optional().describe(
          "Required for follow-alongs. Primary muscle group: chest, back, shoulders, arms, legs, or core.",
        ),
        key_muscles: keyMusclesSchema.optional().describe(
          "Required for follow-alongs. 1–6 specific anatomical muscles, primary first (e.g. Gastrocnemius, Quadriceps).",
        ),
        sets: z
          .array(
            z.object({
              reps: z.number().int().nonnegative().nullable().optional(),
              weight: z.number().nonnegative().nullable().optional(),
              time: z.number().nonnegative().nullable().optional(),
              distance: z.number().nonnegative().nullable().optional(),
            }),
          )
          .optional()
          .describe(
            "Optional explicit preset sets. Prefer suggested_sets + suggested_time/reps instead; those are expanded into targets.",
          ),
        suggested_sets: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            "Number of sets. Use 1 for follow-along circuits, HIIT, and mobility flows.",
          ),
        suggested_reps: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Target repetitions if the coach prescribes a rep count."),
        suggested_weight: z
          .number()
          .nonnegative()
          .optional()
          .describe("Prescribed load in kg if applicable."),
        suggested_time: z
          .number()
          .nonnegative()
          .optional()
          .describe(
            "Work interval in seconds per set (not rest). Typical follow-along values are 40, 45, or 60. Do not use the full chapter length if the round includes rest.",
          ),
        suggested_distance: z
          .number()
          .nonnegative()
          .optional()
          .describe("Target distance if prescribed."),
      }),
    )
    .min(1)
    .describe("List of moves in the order they appear in the video."),
})
  .superRefine((value, ctx) => {
    const error = findAbuttingExerciseTimelineError(value.exercises);
    if (error) {
      ctx.addIssue({ code: "custom", message: error, path: ["exercises"] });
    }
    const merged = findMergedWorkIntervalError(value.exercises);
    if (merged) {
      ctx.addIssue({ code: "custom", message: merged, path: ["exercises"] });
    }
  });

export function findAbuttingExerciseTimelineError(
  exercises: Array<{ videoStartTime: number; videoEndTime?: number }>,
): string | undefined {
  for (let i = 0; i < exercises.length; i++) {
    const start = exercises[i]!.videoStartTime;
    const end = exercises[i]!.videoEndTime;
    if (end === undefined) {
      return `exercises[${i}].videoEndTime is required`;
    }
    if (end <= start) {
      return `exercises[${i}].videoEndTime must be greater than videoStartTime`;
    }
    const next = exercises[i + 1];
    if (next && end !== next.videoStartTime) {
      return `exercises[${i}].videoEndTime (${end}) must equal exercises[${i + 1}].videoStartTime (${next.videoStartTime})`;
    }
  }
  return undefined;
}

/** Catches two work intervals merged into one clip (e.g. 120s on a 60s grid). */
export function findMergedWorkIntervalError(
  exercises: Array<{ videoStartTime: number; videoEndTime?: number }>,
): string | undefined {
  const durations = exercises
    .map((exercise, index) => {
      if (exercise.videoEndTime === undefined) return null;
      return {
        index,
        duration: exercise.videoEndTime - exercise.videoStartTime,
      };
    })
    .filter((row): row is { index: number; duration: number } => row !== null);

  if (durations.length < 3) return undefined;

  const sorted = [...durations].sort((a, b) => a.duration - b.duration);
  const median = sorted[Math.floor(sorted.length / 2)]!.duration;
  if (median < 20) return undefined;

  const merged = durations.find((row) => row.duration >= median * 2);
  if (!merged) return undefined;

  return `exercises[${merged.index}] spans ${merged.duration}s but typical interval is ~${median}s. Do not merge two work intervals. One grid slot per exercise; skip rest without doubling a work slot.`;
}

const clockTimestampSchema = z
  .string()
  .trim()
  .regex(
    /^\[?\d{1,2}:\d{2}(?::\d{2})?\]?$/,
    "Timestamp must be MM:SS or HH:MM:SS",
  );

export const importRejectionSchema = z.object({
  rejected: z.literal(true),
  reason: z.string().trim().min(1).max(500),
});

export const importWorkoutStructureSchema = z.object({
  workoutName: z.string().trim().min(1).max(200).optional(),
  author: z.string().trim().min(1).max(200).optional(),
  channelUrl: z.string().trim().url().max(2048).optional(),
  sourceVideoUrl: z.string().url().optional(),
  overview: z.object({
    workout_length: z.string().trim().min(1).max(64),
    structure: z.string().trim().min(1).max(200).optional(),
    interval_pattern: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .describe(
        "Cadence as spoken/shown (e.g. 30s work / 30s rest). Metadata only — do not derive timestamps from this pattern.",
      ),
    equipment_needed: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
  }),
  sections: z
    .array(
      z.object({
        section_name: z.string().trim().min(1).max(200),
        exercises: z
          .array(
            z.object({
              name: z
                .string()
                .trim()
                .min(1)
                .max(200)
                .describe(
                  "Canonical labelled move. One row per distinct move — do not repeat the same name for each 30s slot of a continuous block.",
                ),
              timestamp: clockTimestampSchema.describe(
                "Exact MM:SS when this move starts on the video clock (timer, beep, overlay). Write the second you see (07:57, 08:58). Never invent 08:00, 09:00 or a shifted grid like 07:53, 08:53.",
              ),
              metric_profile: metricProfileEnum.optional(),
              metricProfile: metricProfileEnum.optional(),
              muscle_group: muscleGroupEnum.optional(),
              muscleGroup: muscleGroupEnum.optional(),
              key_muscles: keyMusclesSchema.optional(),
              keyMuscles: keyMusclesSchema.optional(),
              suggested_sets: z.number().int().positive().optional(),
              suggestedSets: z.number().int().positive().optional(),
              suggested_reps: z.number().int().nonnegative().optional(),
              suggestedReps: z.number().int().nonnegative().optional(),
              suggested_weight: z.number().nonnegative().optional(),
              suggestedWeight: z.number().nonnegative().optional(),
              suggested_time: z.number().nonnegative().optional(),
              suggestedTime: z.number().nonnegative().optional(),
              suggested_distance: z.number().nonnegative().optional(),
              suggestedDistance: z.number().nonnegative().optional(),
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
export type ImportRejection = z.infer<typeof importRejectionSchema>;
export type ImportFullWorkoutInput = z.infer<typeof importFullWorkoutSchema>;
export type ImportWorkoutStructureInput = z.infer<
  typeof importWorkoutStructureSchema
>;
export type ListSetsQuery = z.infer<typeof listSetsQuerySchema>;
export type CreateSetInput = z.infer<typeof createSetSchema>;
export type UpdateSetInput = z.infer<typeof updateSetSchema>;

export const importPromptAnnotationSchema = z.object({
  instructionId: z
    .string()
    .refine((id) =>
      (IMPORT_PROMPT_INSTRUCTION_IDS as readonly string[]).includes(id),
    ),
  verdict: z.enum(IMPORT_PROMPT_VERDICTS),
  note: z.string().trim().max(1000).optional(),
});

export const createImportPromptFeedbackSchema = z
  .object({
    annotations: z.array(importPromptAnnotationSchema).max(32),
    comment: z.string().trim().max(2000).optional(),
    videoTimestamp: z.number().nonnegative(),
  })
  .refine(
    (value) =>
      value.annotations.length > 0 || Boolean(value.comment?.trim()),
    { message: "Add at least one annotation or a comment" },
  );

export type ImportPromptAnnotationInput = z.infer<
  typeof importPromptAnnotationSchema
>;
export type CreateImportPromptFeedbackInput = z.infer<
  typeof createImportPromptFeedbackSchema
>;
