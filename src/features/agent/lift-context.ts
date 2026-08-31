export type AthleteLiftContext =
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
        targets?: unknown;
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

export type AgentLiftData = AthleteLiftContext;

const NO_LIFT =
  "Current lift: none selected. Do not name an example exercise. If the athlete asked about a specific lift, say none is selected and stop.";

/** Compact block injected into trainer + subagent prompts so models do not invent the lift. */
export function formatAthleteLiftContext(lift: AthleteLiftContext): string {
  if (!lift.available) {
    return `${NO_LIFT} ${lift.reason}`.trim();
  }

  const { exercise, recentSets, recentNotes } = lift;
  const lastSets = recentSets.slice(0, 3).map((set) => {
    const parts = [
      set.weight != null ? `${set.weight}` : null,
      set.reps != null ? `${set.reps}r` : null,
      set.time != null ? `${set.time}s` : null,
      set.distance != null ? `${set.distance}` : null,
    ].filter(Boolean);
    return parts.join("×") || "logged";
  });

  return [
    "Current lift (authoritative; never rename, replace, or invent a different exercise):",
    `- name: ${exercise.name}`,
    `- id: ${exercise.id}`,
    `- muscleGroup: ${exercise.muscleGroup ?? "unknown"}`,
    `- keyMuscles: ${exercise.keyMuscles.join(", ") || "unknown"}`,
    `- tags: ${exercise.tags.join(", ") || "none"}`,
    `- chapter: ${exercise.chapter ?? "none"}`,
    `- attachedVideoUrl: ${exercise.videoUrl ?? "none"}`,
    `- recentSets: ${lastSets.join("; ") || "none"}`,
    `- recentNotes: ${recentNotes.slice(-2).map((n) => n.text).join(" | ") || "none"}`,
  ].join("\n");
}

export function withAthleteLiftContext(system: string, lift: AthleteLiftContext) {
  return `${system}

${formatAthleteLiftContext(lift)}`;
}

export function subagentTaskPrompt(task: string, lift: AthleteLiftContext) {
  return `${formatAthleteLiftContext(lift)}

If a task names a different exercise than Current lift, ignore the guessed name unless the athlete explicitly asked about another move.

Task: ${task.trim()}`;
}
