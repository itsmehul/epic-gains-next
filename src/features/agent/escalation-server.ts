import "server-only";

import type { ModelMessage } from "ai";

import {
  createComment,
  getCommentById,
  updateCommentMeta,
} from "@/db/repositories/comment.repository";
import { createMentionNotifications } from "@/db/repositories/notification.repository";
import {
  getUserById,
  listTrainers,
  listUsersByUsernames,
} from "@/db/repositories/social.repository";
import { getTrainerSystemPrompt } from "@/features/agent/context";
import { redactPii, redactPiiDeep } from "@/features/agent/pii";
import {
  escalationAskText,
  loopInTrainerApprovalRequest,
} from "@/features/agent/escalation";
import {
  addressCommentToUsers,
  extractMentionHandles,
  mergeCommentMentions,
  resolveMentions,
} from "@/features/agent/mentions";
import { withAthleteCommentPrivacy } from "@/features/agent/prompt";
import type { CommentMeta, CommentMention } from "@/db/schema/workout-schema";
import { generateUserTrainerChat } from "@/infrastructure/ai/gemini";

type GeneratedChat = Awaited<ReturnType<typeof generateUserTrainerChat>>;

function trainerRelayed(generated: GeneratedChat) {
  return generated.toolResults.some(
    (result) =>
      result.toolName === "loop_in_trainer" &&
      typeof result.output === "object" &&
      result.output != null &&
      "ok" in result.output &&
      result.output.ok === true,
  );
}

async function persistAddressedAgentComment(options: {
  userId: string;
  exerciseId: string;
  workoutId: string | null;
  parentId: string;
  text: string;
  meta?: CommentMeta;
}) {
  const athlete = await getUserById(options.userId);
  const extraPeople = await listUsersByUsernames(
    extractMentionHandles(options.text),
  );
  const candidates = extraPeople.map((person) => ({
    id: person.id,
    username: person.username,
    name: person.name,
  }));
  if (athlete) {
    candidates.push({
      id: athlete.id,
      username: athlete.username,
      name: athlete.name,
    });
  }

  const addressed = athlete
    ? addressCommentToUsers(options.text, [athlete])
    : { text: options.text, mentions: [] as CommentMention[] };
  const mentions = mergeCommentMentions(
    addressed.mentions,
    resolveMentions(addressed.text, candidates),
  );

  const item = await createComment({
    id: crypto.randomUUID(),
    exerciseId: options.exerciseId,
    workoutId: options.workoutId,
    text: addressed.text,
    role: "agent",
    mentions,
    parentId: options.parentId,
    authorId: options.userId,
    meta: options.meta,
  });
  if (!item) return null;

  await createMentionNotifications({
    commentId: item.id,
    authorId: options.userId,
    mentions,
  });
  return item;
}

export async function persistGeneratedTrainerReply(options: {
  userId: string;
  exerciseId: string;
  workoutId: string | null;
  commentId: string;
  modelMessages: ModelMessage[];
  generated: GeneratedChat;
}) {
  const approval = loopInTrainerApprovalRequest(options.generated.content);
  const trigger = await getCommentById(options.commentId);
  const parentId = trigger?.parentId ?? options.commentId;

  if (approval) {
    const trainers = await listTrainers(options.userId);
    const preview = redactPii(approval.preview);
    const text = escalationAskText({
      modelText: redactPii(options.generated.text),
      preview,
      trainers,
    });
    await persistAddressedAgentComment({
      userId: options.userId,
      exerciseId: options.exerciseId,
      workoutId: options.workoutId,
      parentId,
      text,
      meta: {
        trainerEscalation: {
          approvalId: approval.approvalId,
          state: "pending",
          preview,
          trainers: trainers.map((trainer) => ({
            username: trainer.username,
            name: trainer.name,
          })),
          messages: redactPiiDeep([
            ...options.modelMessages,
            ...options.generated.responseMessages,
          ]),
        },
      },
    });
    return { ok: true as const, pendingApproval: true };
  }

  const text = redactPii(options.generated.text).trim();
  const relayedTrainer = trainerRelayed(options.generated);
  if (!text && !relayedTrainer) {
    return { ok: false as const, error: "Trainer reply was empty" };
  }
  if (text) {
    await persistAddressedAgentComment({
      userId: options.userId,
      exerciseId: options.exerciseId,
      workoutId: options.workoutId,
      parentId,
      text,
    });
  }
  return { ok: true as const, pendingApproval: false };
}

export async function respondToTrainerEscalation(options: {
  userId: string;
  commentId: string;
  approved: boolean;
}) {
  const comment = await getCommentById(options.commentId);
  if (!comment || comment.authorId !== options.userId || comment.role !== "agent") {
    return { ok: false as const, error: "Comment not found", status: 404 };
  }

  const escalation = comment.meta?.trainerEscalation;
  if (!escalation || escalation.state !== "pending") {
    return { ok: false as const, error: "No pending trainer ping", status: 400 };
  }

  const messages = Array.isArray(escalation.messages)
    ? (escalation.messages as ModelMessage[])
    : [];
  if (messages.length === 0) {
    return { ok: false as const, error: "Escalation expired", status: 400 };
  }

  const prompt = await getTrainerSystemPrompt();
  const athlete = await getUserById(options.userId);
  const generated = await generateUserTrainerChat({
    userId: options.userId,
    system: withAthleteCommentPrivacy(prompt.system, athlete?.username ?? ""),
    promptMetadata: prompt.metadata,
    messages: [
      ...messages,
      {
        role: "tool",
        content: [
          {
            type: "tool-approval-response",
            approvalId: escalation.approvalId,
            approved: options.approved,
          },
        ],
      },
    ],
    lift: {
      exerciseId: comment.exerciseId,
      workoutId: comment.workoutId,
      commentId: comment.parentId ?? comment.id,
    },
  });

  const nextMeta: CommentMeta = {
    trainerEscalation: {
      ...escalation,
      state: options.approved ? "approved" : "denied",
      messages: undefined,
    },
  };
  await updateCommentMeta(comment.id, nextMeta);

  const text = generated.text.trim();
  if (text) {
    await persistAddressedAgentComment({
      userId: options.userId,
      exerciseId: comment.exerciseId,
      workoutId: comment.workoutId,
      parentId: comment.parentId ?? comment.id,
      text,
    });
  }

  return { ok: true as const, approved: options.approved };
}
