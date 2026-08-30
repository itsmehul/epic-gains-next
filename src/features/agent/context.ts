import "server-only";

import { getExerciseById } from "@/db/repositories/exercise.repository";
import { listVisibleComments } from "@/db/repositories/comment.repository";
import { listSets } from "@/db/repositories/set.repository";
import { listWorkoutExercises } from "@/db/repositories/workout-exercise.repository";
import { extractYoutubeWatchUrls } from "@/shared/youtube";

export type AgentExerciseContext = {
  systemExtra: string;
  youtubeUrls: string[];
};

/** Build workout/exercise context for the Fitness Trainer Agent. */
export async function buildAgentExerciseContext(options: {
  userId: string;
  exerciseId: string;
  workoutId?: string | null;
}): Promise<AgentExerciseContext> {
  const exercise = await getExerciseById(options.exerciseId);
  if (!exercise) {
    return { systemExtra: "", youtubeUrls: [] };
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
  const mySets = sets
    .filter((s) => s.userId === options.userId)
    .slice(0, 12);

  const comments = await listVisibleComments({
    viewerId: options.userId,
    exerciseId: options.exerciseId,
    workoutId: options.workoutId ?? undefined,
  });
  const recentNotes = comments
    .filter((c) => c.role !== "agent")
    .slice(-8)
    .map((c) => `- ${c.text}`);

  const youtubeUrls: string[] = [];
  if (appearance?.videoUrl) {
    youtubeUrls.push(...extractYoutubeWatchUrls(appearance.videoUrl));
  }

  const targets = appearance?.metaData?.targets ?? [];
  const lines = [
    "Current lift context:",
    `- Exercise: ${appearance?.name ?? exercise.name}`,
    exercise.muscleGroup
      ? `- Muscle group: ${exercise.muscleGroup}`
      : null,
    exercise.keyMuscles.length > 0
      ? `- Key muscles: ${exercise.keyMuscles.join(", ")}`
      : null,
    appearance?.tags?.length
      ? `- Tags: ${appearance.tags.join(", ")}`
      : null,
    appearance?.metaData?.chapter
      ? `- Chapter: ${appearance.metaData.chapter}`
      : null,
    targets.length > 0
      ? `- Targets: ${JSON.stringify(targets)}`
      : null,
    appearance?.videoUrl ? `- Workout video: ${appearance.videoUrl}` : null,
    mySets.length > 0
      ? `- Recent logged sets:\n${mySets
          .map((s) => {
            const bits = [
              s.reps != null ? `${s.reps} reps` : null,
              s.weight != null ? `${s.weight}` : null,
              s.time != null ? `${s.time}s` : null,
              s.distance != null ? `${s.distance}` : null,
            ].filter(Boolean);
            return `  • ${bits.join(" / ") || "set"}`;
          })
          .join("\n")}`
      : "- No sets logged yet for this lift in this workout.",
    recentNotes.length > 0
      ? `- Recent notes:\n${recentNotes.join("\n")}`
      : null,
  ].filter(Boolean);

  return {
    systemExtra: lines.join("\n"),
    youtubeUrls,
  };
}

export const TRAINER_SYSTEM_PROMPT = `You are the Epic Gains Fitness Trainer Agent.
Be concise, practical, and encouraging. Focus on form cues, warm-ups, regressions, progressions, and variants.
When helpful, use Google Search to find reputable demo videos (YouTube preferred) and cite the links clearly.
If the athlete mentions a struggle, diagnose likely causes and give 2–4 actionable tips.
Do not invent personal medical advice; suggest seeing a professional for pain or injury red flags.`;
