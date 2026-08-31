import "server-only";

import { inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  listExercisesByIds,
  searchExercises,
} from "@/db/repositories/exercise.repository";
import { workoutExercise } from "@/db/schema";
import type { MuscleGroup } from "@/db/schema/workout-schema";
import { getYouTubeVideoId } from "@/features/workouts/youtube";

function isSameVideo(left: string, right: string) {
  const a = left.trim();
  const b = right.trim();
  if (!a || !b) return false;
  if (a === b) return true;
  const idA = getYouTubeVideoId(a);
  const idB = getYouTubeVideoId(b);
  return Boolean(idA && idB && idA === idB);
}

/** Fuzzy catalog search plus a sample workout video URL when one exists. */
export async function searchCatalogExercises(options: {
  q: string;
  excludeExerciseId?: string;
  excludeVideoUrl?: string | null;
  limit?: number;
}) {
  const limit = Math.min(Math.max(options.limit ?? 8, 1), 12);
  const hits = await searchExercises({
    q: options.q,
    excludeExerciseId: options.excludeExerciseId,
    limit,
  });
  const ids = hits.map((hit) => hit.id);
  if (ids.length === 0) {
    return {
      available: false as const,
      reason: "No catalog exercises matched that name.",
      query: options.q,
      matches: [] as Array<{
        exerciseId: string;
        name: string;
        score: number;
        matchedAlias: string | null;
        muscleGroup: MuscleGroup | null;
        keyMuscles: string[];
        videoUrl: string | null;
      }>,
    };
  }

  const [full, appearances] = await Promise.all([
    listExercisesByIds(ids),
    db
      .select({
        exerciseId: workoutExercise.exerciseId,
        videoUrl: workoutExercise.videoUrl,
      })
      .from(workoutExercise)
      .where(inArray(workoutExercise.exerciseId, ids)),
  ]);

  const byId = new Map(full.map((exercise) => [exercise.id, exercise]));
  const excluded = options.excludeVideoUrl?.trim() || null;
  const videoByExercise = new Map<string, string>();
  for (const row of appearances) {
    const url = row.videoUrl?.trim();
    if (!url || videoByExercise.has(row.exerciseId)) continue;
    if (excluded && isSameVideo(url, excluded)) continue;
    videoByExercise.set(row.exerciseId, url);
  }

  return {
    available: true as const,
    query: options.q,
    matches: hits.map((hit) => {
      const exercise = byId.get(hit.id);
      return {
        exerciseId: hit.id,
        name: hit.name,
        score: hit.score,
        matchedAlias: hit.matchedAlias,
        muscleGroup: hit.muscleGroup,
        keyMuscles: exercise?.keyMuscles ?? [],
        videoUrl: videoByExercise.get(hit.id) ?? null,
      };
    }),
    hint: "Prefer these catalog/logged-program moves and their videoUrl over a web search. Never recommend the athlete's current lift video.",
  };
}
