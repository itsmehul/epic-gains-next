import "server-only";

import { count, inArray } from "drizzle-orm";

import { db } from "@/db";
import { fillMissingExerciseCatalogFields } from "@/db/repositories/exercise.repository";
import { insertWorkoutMembership } from "@/db/repositories/workout-membership.repository";
import { getWorkoutByYoutubeVideoId } from "@/db/repositories/workout.repository";
import { exercise, workout, workoutExercise } from "@/db/schema";
import { exerciseNameLookupKeys } from "@/features/workouts/exercise-name";
import {
  buildImportTargetSets,
  expandImportStructure,
  resolveImportKeyMuscles,
  resolveImportMetricProfile,
  resolveImportMuscleGroup,
  type ExpandedImportWorkout,
} from "@/features/workouts/import-structure";
import {
  importFullWorkoutSchema,
  importWorkoutStructureSchema,
  type ImportFullWorkoutInput,
} from "@/features/workouts/schemas";
import { isRestWorkoutItem } from "@/features/workouts/workout-item";
import { getYouTubeVideoId } from "@/features/workouts/youtube";

export class WorkoutImportConflictError extends Error {
  existingWorkoutId: string;

  constructor(existingWorkoutId: string) {
    super("This workout already exists");
    this.name = "WorkoutImportConflictError";
    this.existingWorkoutId = existingWorkoutId;
  }
}

export function parseImportWorkoutBody(json: unknown) {
  const structured = importWorkoutStructureSchema.safeParse(json);
  const legacy = importFullWorkoutSchema.safeParse(json);
  if (structured.success) return expandImportStructure(structured.data);
  if (legacy.success) return legacy.data;
  return null;
}

function resolveImportTargets(
  ex: ExpandedImportWorkout["exercises"][number] | ImportFullWorkoutInput["exercises"][number],
) {
  if (ex.sets && ex.sets.length > 0) return ex.sets;
  const clipSeconds =
    typeof ex.videoEndTime === "number" && ex.videoEndTime > ex.videoStartTime
      ? ex.videoEndTime - ex.videoStartTime
      : undefined;
  return buildImportTargetSets(ex, clipSeconds);
}

export async function importSharedWorkout(
  userId: string,
  args: ExpandedImportWorkout | ImportFullWorkoutInput,
) {
  const youtubeVideoId = args.sourceVideoUrl
    ? getYouTubeVideoId(args.sourceVideoUrl)
    : null;

  if (youtubeVideoId) {
    const existing = await getWorkoutByYoutubeVideoId(youtubeVideoId);
    if (existing) {
      throw new WorkoutImportConflictError(existing.id);
    }
  }

  return db.transaction(async (tx) => {
    const workoutId = crypto.randomUUID();
    const [newWorkout] = await tx
      .insert(workout)
      .values({
        id: workoutId,
        name: args.workoutName,
        author: args.author ?? null,
        channelUrl: args.channelUrl ?? null,
        youtubeVideoId,
        userId,
      })
      .returning();

    if (!newWorkout) throw new Error("Failed to import workout");

    await insertWorkoutMembership(
      { workoutId, userId, role: "OWNER" },
      tx,
    );

    const existingExercises = await tx.select().from(exercise);

    const existingIds = existingExercises.map((item) => item.id);
    const usageRows =
      existingIds.length === 0
        ? []
        : await tx
            .select({
              exerciseId: workoutExercise.exerciseId,
              n: count(),
            })
            .from(workoutExercise)
            .where(inArray(workoutExercise.exerciseId, existingIds))
            .groupBy(workoutExercise.exerciseId);
    const usageById = new Map(
      usageRows.map((row) => [row.exerciseId, Number(row.n)]),
    );

    const existingById = new Map(
      existingExercises.map((item) => [item.id, item] as const),
    );

    const exerciseIdByName = new Map<string, string>();

    function rememberExercise(name: string, exerciseId: string) {
      const usage = usageById.get(exerciseId) ?? 0;
      for (const key of exerciseNameLookupKeys(name)) {
        const current = exerciseIdByName.get(key);
        if (!current) {
          exerciseIdByName.set(key, exerciseId);
          continue;
        }
        const currentUsage = usageById.get(current) ?? 0;
        if (usage > currentUsage) {
          exerciseIdByName.set(key, exerciseId);
        }
      }
    }

    for (const item of existingExercises) {
      if (isRestWorkoutItem(item)) continue;
      rememberExercise(item.name, item.id);
    }

    if (existingIds.length > 0) {
      const aliasRows = await tx
        .select({
          exerciseId: workoutExercise.exerciseId,
          name: workoutExercise.name,
        })
        .from(workoutExercise)
        .where(inArray(workoutExercise.exerciseId, existingIds));

      for (const row of aliasRows) {
        if (isRestWorkoutItem(row)) continue;
        rememberExercise(row.name, row.exerciseId);
      }
    }

    for (const ex of args.exercises) {
      if (isRestWorkoutItem({ name: ex.name, tags: ex.tags })) continue;

      const keys = exerciseNameLookupKeys(ex.name);
      let exerciseId = keys
        .map((key) => exerciseIdByName.get(key))
        .find((id): id is string => Boolean(id));

      if (!exerciseId) {
        exerciseId = crypto.randomUUID();
        const [created] = await tx
          .insert(exercise)
          .values({
            id: exerciseId,
            name: ex.name,
            metricProfile: resolveImportMetricProfile(ex),
            muscleGroup: resolveImportMuscleGroup(ex),
            keyMuscles: resolveImportKeyMuscles(ex) ?? [],
          })
          .returning();
        usageById.set(exerciseId, 0);
        rememberExercise(ex.name, exerciseId);
        if (created) existingById.set(exerciseId, created);
      } else {
        const current = existingById.get(exerciseId);
        if (current) {
          const enriched = await fillMissingExerciseCatalogFields(
            tx,
            current,
            {
              metricProfile: resolveImportMetricProfile(ex),
              muscleGroup: resolveImportMuscleGroup(ex),
              keyMuscles: resolveImportKeyMuscles(ex),
            },
          );
          existingById.set(exerciseId, enriched);
        }
      }

      await tx.insert(workoutExercise).values({
        id: crypto.randomUUID(),
        workoutId,
        exerciseId,
        name: ex.name,
        videoUrl: args.sourceVideoUrl || null,
        metaData: {
          videoStartTime: ex.videoStartTime,
          videoEndTime: ex.videoEndTime,
          targets: resolveImportTargets(ex),
        },
        tags: ex.tags ?? [],
      });
      usageById.set(exerciseId, (usageById.get(exerciseId) ?? 0) + 1);
      rememberExercise(ex.name, exerciseId);
    }

    return newWorkout;
  });
}
