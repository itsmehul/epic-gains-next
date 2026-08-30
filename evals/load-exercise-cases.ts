import { readFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

import {
  importRejectionSchema,
  importWorkoutStructureSchema,
} from "@/features/workouts/schemas";

export const EXERCISE_GROUND_TRUTH_DIR = path.join(
  process.cwd(),
  "evals/ground-truths/exercises",
);

const caseMetaSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  notes: z.string().optional(),
  groundTruth: z.string().min(1),
});

export const exerciseGroundTruthSchema = z.union([
  importRejectionSchema,
  importWorkoutStructureSchema,
]);

export type ExerciseGroundTruth = z.infer<typeof exerciseGroundTruthSchema>;

export type ExerciseEvalCase = {
  id: string;
  url: string;
  notes?: string;
  groundTruthPath: string;
  expected: ExerciseGroundTruth;
};

export function loadExerciseEvalCases(): ExerciseEvalCase[] {
  const raw = JSON.parse(
    readFileSync(path.join(EXERCISE_GROUND_TRUTH_DIR, "cases.json"), "utf8"),
  ) as unknown;
  const metas = z.array(caseMetaSchema).parse(raw);

  return metas.map((meta) => {
    const groundTruthPath = path.join(EXERCISE_GROUND_TRUTH_DIR, meta.groundTruth);
    const expected = exerciseGroundTruthSchema.parse(
      JSON.parse(readFileSync(groundTruthPath, "utf8")),
    );
    return {
      id: meta.id,
      url: meta.url,
      notes: meta.notes,
      groundTruthPath,
      expected,
    };
  });
}
