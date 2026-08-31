import "server-only";

import {
  createComment,
  getCommentById,
} from "@/db/repositories/comment.repository";
import { createMentionNotifications } from "@/db/repositories/notification.repository";
import { listTrainers } from "@/db/repositories/social.repository";
import { buildTrainerRelayComment } from "@/features/agent/mentions";
import { redactPii } from "@/features/agent/pii";

export type RelayToTrainerResult =
  | {
      ok: false;
      reason: string;
    }
  | {
      ok: true;
      commentId: string;
      trainers: Array<{ username: string; name: string }>;
    };

/** Look up assigned trainers and post a mention into the exercise comment thread. */
export async function relayToHumanTrainer(options: {
  athleteId: string;
  message: string;
  exerciseId?: string;
  workoutId?: string | null;
  commentId?: string;
  threadCommentId?: string;
}): Promise<RelayToTrainerResult> {
  const threadId = options.threadCommentId?.trim() || options.commentId;
  if (!threadId) {
    return {
      ok: false,
      reason:
        "No comment thread to post in. The athlete needs to @agent on an exercise comment.",
    };
  }

  const thread = await getCommentById(threadId);
  if (!thread) {
    return { ok: false, reason: "Comment thread not found." };
  }
  if (options.exerciseId && thread.exerciseId !== options.exerciseId) {
    return {
      ok: false,
      reason: "That comment is not on the current lift thread.",
    };
  }

  const trainers = await listTrainers(options.athleteId);
  if (trainers.length === 0) {
    return {
      ok: false,
      reason: "The athlete has no assigned trainer to loop in.",
    };
  }

  const { text, mentions } = buildTrainerRelayComment(
    redactPii(options.message),
    trainers,
  );
  const item = await createComment({
    id: crypto.randomUUID(),
    exerciseId: thread.exerciseId,
    workoutId: thread.workoutId ?? options.workoutId ?? null,
    text,
    role: "agent",
    mentions,
    parentId: thread.parentId ?? thread.id,
    authorId: options.athleteId,
  });
  if (!item) {
    return { ok: false, reason: "Failed to post in the thread." };
  }

  await createMentionNotifications({
    commentId: item.id,
    authorId: options.athleteId,
    mentions,
  });

  return {
    ok: true,
    commentId: item.id,
    trainers: trainers.map((trainer) => ({
      username: trainer.username,
      name: trainer.name,
    })),
  };
}
