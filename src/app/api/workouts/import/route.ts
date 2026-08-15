import { count, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  consolidateDuplicateExercisesForUser,
  fillMissingExerciseCatalogFields,
  resolveCanonicalRestExercise,
} from "@/db/repositories/exercise.repository";
import { exercise, workout, workoutExercise } from "@/db/schema";
import { exerciseNameLookupKeys } from "@/features/workouts/exercise-name";
import {
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
import { isRestWorkoutItem, withRestTag } from "@/features/workouts/workout-item";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const json = await req.json();
    const structured = importWorkoutStructureSchema.safeParse(json);
    const legacy = importFullWorkoutSchema.safeParse(json);

    let args: ExpandedImportWorkout | ImportFullWorkoutInput;
    if (structured.success) {
      args = expandImportStructure(structured.data);
    } else if (legacy.success) {
      args = legacy.data;
    } else {
      return apiError("Invalid import workout data", 400);
    }
    const userId = session.user.id;

    const result = await db.transaction(async (tx) => {
      const workoutId = crypto.randomUUID();
      const [newWorkout] = await tx
        .insert(workout)
        .values({
          id: workoutId,
          name: args.workoutName,
          author: args.author ?? null,
          channelUrl: args.channelUrl ?? null,
          userId,
        })
        .returning();

      const existingExercises = await tx
        .select()
        .from(exercise)
        .where(eq(exercise.userId, userId));

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

      const hasRest = args.exercises.some((ex) =>
        isRestWorkoutItem({ name: ex.name, tags: ex.tags }),
      );
      const restExerciseId = hasRest
        ? await resolveCanonicalRestExercise(tx, userId)
        : null;

      for (const ex of args.exercises) {
        if (isRestWorkoutItem({ name: ex.name, tags: ex.tags })) {
          if (!restExerciseId) continue;
          await tx.insert(workoutExercise).values({
            id: crypto.randomUUID(),
            workoutId,
            exerciseId: restExerciseId,
            name: ex.name,
            videoUrl: args.sourceVideoUrl || null,
            metaData: {
              videoStartTime: ex.videoStartTime,
              videoEndTime: ex.videoEndTime,
            },
            tags: withRestTag(ex.tags),
          });
          continue;
        }

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
              userId,
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
            targets: ex.sets && ex.sets.length > 0 ? ex.sets : undefined,
          },
          tags: ex.tags ?? [],
        });
        usageById.set(exerciseId, (usageById.get(exerciseId) ?? 0) + 1);
        rememberExercise(ex.name, exerciseId);
      }

      await consolidateDuplicateExercisesForUser(userId, tx);

      return newWorkout;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to import workout";
    return apiError(message, 500);
  }
}
