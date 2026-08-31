import "server-only";

import { getExerciseById } from "@/db/repositories/exercise.repository";
import { listVisibleComments } from "@/db/repositories/comment.repository";
import { listSets } from "@/db/repositories/set.repository";
import { listWorkoutExercises } from "@/db/repositories/workout-exercise.repository";

export type AgentLiftData =
  | { available: false; reason: string }
  | {
      available: true;
      exercise: {
        id: string;
        name: string;
        muscleGroup: string | null;
        keyMuscles: string[];
        tags: string[];
        chapter: string | null;
        targets: unknown;
        videoUrl: string | null;
      };
      recentSets: Array<{
        reps: number | null;
        weight: number | null;
        time: number | null;
        distance: number | null;
        updatedAt: string;
      }>;
      recentNotes: Array<{
        text: string;
        createdAt: string;
      }>;
    };

/** Load the athlete's current lift, recent sets, and notes. */
export async function getAthleteLiftData(options: {
  userId: string;
  exerciseId?: string;
  workoutId?: string | null;
  excludeCommentId?: string | null;
}): Promise<AgentLiftData> {
  if (!options.exerciseId) {
    return {
      available: false,
      reason:
        "No lift is selected. The athlete is not asking from an exercise thread.",
    };
  }

  const exercise = await getExerciseById(options.exerciseId);
  if (!exercise) {
    return { available: false, reason: "Exercise not found." };
  }

  const appearances = await listWorkoutExercises({
    workoutId: options.workoutId ?? undefined,
    exerciseId: options.exerciseId,
  });
  const appearance = appearances[0] ?? null;

  const sets = await listSets({
    workoutId: options.workoutId ?? undefined,
    exerciseId: options.exerciseId,
    viewerId: options.userId,
  });
  const recentSets = sets
    .filter((s) => s.userId === options.userId)
    .slice(0, 12)
    .map((s) => ({
      reps: s.reps,
      weight: s.weight,
      time: s.time,
      distance: s.distance,
      updatedAt: s.updatedAt.toISOString(),
    }));

  const comments = await listVisibleComments({
    viewerId: options.userId,
    exerciseId: options.exerciseId,
    workoutId: options.workoutId ?? undefined,
  });
  const recentNotes = comments
    .filter((c) => c.role !== "agent")
    .filter((c) => c.id !== options.excludeCommentId)
    .slice(-8)
    .map((c) => ({
      text: c.text,
      createdAt: c.createdAt.toISOString(),
    }));

  return {
    available: true,
    exercise: {
      id: exercise.id,
      name: appearance?.name ?? exercise.name,
      muscleGroup: exercise.muscleGroup,
      keyMuscles: exercise.keyMuscles,
      tags: appearance?.tags ?? [],
      chapter: appearance?.metaData?.chapter ?? null,
      targets: appearance?.metaData?.targets ?? [],
      videoUrl: appearance?.videoUrl ?? null,
    },
    recentSets,
    recentNotes,
  };
}

export const TRAINER_SYSTEM_PROMPT = `You are the Epic Gains Fitness Trainer Agent.
Be concise, practical, and encouraging. Focus on form cues, warm-ups, regressions, progressions, and variants.
When the question is about a specific lift, logged sets, or notes, call get_current_lift first and ground your answer in that data.
If they complain about a lift or a joint (deadlifts, knees, lower back), call search_muscle_work. Use logged sets on those target muscles; suggest pushing intensity on strengthening work they already do. Do not treat accessory work as a fix for injury red flags.
When helpful, use Google Search to find reputable demo videos (YouTube preferred) and cite the links clearly.
If the athlete mentions a struggle, diagnose likely causes and give 2–4 actionable tips.
Do not invent personal medical advice; suggest seeing a professional for pain or injury red flags.
If a human should take over (pain/injury red flags, in-person form check, medical questions, or the athlete asks for their coach), call loop_in_trainer once with a short relay and the current thread. Then tell the athlete whether their trainer was pinged. Do not repeat the @mention in your spoken reply.
Format replies in compact Markdown (short paragraphs, **bold** cues, lists when you have 2+ tips). Keep it scannable.`;
