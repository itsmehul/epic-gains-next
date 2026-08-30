import { normalizeExerciseName } from "@/features/workouts/exercise-name";
import { parseClockTimestamp } from "@/features/workouts/import-structure";
import {
  importRejectionSchema,
  importWorkoutStructureSchema,
  type ImportWorkoutStructureInput,
} from "@/features/workouts/schemas";

import type { ExerciseGroundTruth } from "./load-exercise-cases";
import { extractJsonValue } from "./parse-model-json";

const TIMESTAMP_TOLERANCE_SECONDS = 3;

export type ImportCheck = {
  id: string;
  pass: boolean;
  detail: string;
};

export type ImportScore = {
  pass: boolean;
  checks: ImportCheck[];
};

type FlatMove = {
  name: string;
  timestamp: string;
  seconds: number;
};

function isRejection(
  value: ExerciseGroundTruth,
): value is Extract<ExerciseGroundTruth, { rejected: true }> {
  return "rejected" in value && value.rejected === true;
}

function flattenMoves(input: ImportWorkoutStructureInput): FlatMove[] {
  return input.sections.flatMap((section) =>
    section.exercises.map((exercise) => ({
      name: exercise.name,
      timestamp: exercise.timestamp,
      seconds: parseClockTimestamp(exercise.timestamp),
    })),
  );
}

function nameSet(moves: FlatMove[]): Set<string> {
  return new Set(moves.map((move) => normalizeExerciseName(move.name)));
}

export function scoreImportOutput(input: {
  text: string;
  expected: ExerciseGroundTruth;
}): ImportScore {
  const checks: ImportCheck[] = [];

  let parsed: unknown;
  try {
    parsed = extractJsonValue(input.text);
    checks.push({ id: "json", pass: true, detail: "parsed JSON" });
  } catch (error) {
    checks.push({
      id: "json",
      pass: false,
      detail: error instanceof Error ? error.message : String(error),
    });
    return { pass: false, checks };
  }

  const expected = input.expected;
  if (isRejection(expected)) {
    const rejection = importRejectionSchema.safeParse(parsed);
    checks.push({
      id: "rejected",
      pass: rejection.success,
      detail: rejection.success
        ? "model refused the video"
        : "expected a rejection object",
    });
    if (rejection.success) {
      const expectedReason = expected.reason.trim();
      const actualReason = rejection.data.reason.trim();
      checks.push({
        id: "reason",
        pass: actualReason === expectedReason,
        detail:
          actualReason === expectedReason
            ? expectedReason
            : `expected "${expectedReason}" got "${actualReason}"`,
      });
    }
    return { pass: checks.every((check) => check.pass), checks };
  }

  const structure = importWorkoutStructureSchema.safeParse(parsed);
  checks.push({
    id: "schema",
    pass: structure.success,
    detail: structure.success
      ? "matches import workout structure"
      : (structure.error.issues[0]?.message ?? "schema mismatch"),
  });
  if (!structure.success) {
    return { pass: false, checks };
  }

  const expectedMoves = flattenMoves(expected);
  const actualMoves = flattenMoves(structure.data);
  const expectedNames = nameSet(expectedMoves);
  const actualNames = nameSet(actualMoves);
  const overlap = [...expectedNames].filter((name) => actualNames.has(name));
  const precision = actualNames.size === 0 ? 0 : overlap.length / actualNames.size;
  const recall = expectedNames.size === 0 ? 0 : overlap.length / expectedNames.size;
  const f1 =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);

  checks.push({
    id: "names",
    pass: f1 >= 0.8,
    detail: `F1 ${f1.toFixed(2)} (expected ${expectedMoves.length} moves, got ${actualMoves.length})`,
  });

  const pairCount = Math.min(expectedMoves.length, actualMoves.length);
  let withinTolerance = 0;
  for (let i = 0; i < pairCount; i++) {
    const delta = Math.abs(expectedMoves[i]!.seconds - actualMoves[i]!.seconds);
    if (delta <= TIMESTAMP_TOLERANCE_SECONDS) withinTolerance += 1;
  }
  const timestampPass =
    pairCount > 0 && withinTolerance / pairCount >= 0.8;
  checks.push({
    id: "timestamps",
    pass: timestampPass,
    detail:
      pairCount === 0
        ? "no overlapping moves to compare"
        : `${withinTolerance}/${pairCount} starts within ${TIMESTAMP_TOLERANCE_SECONDS}s`,
  });

  return { pass: checks.every((check) => check.pass), checks };
}
