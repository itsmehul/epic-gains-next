import {
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { createComment, getCommentById } from "@/db/repositories/comment.repository";
import { hasUserGeminiKey } from "@/db/repositories/gemini-key.repository";
import { TRAINER_SYSTEM_PROMPT } from "@/features/agent/context";
import {
  generateUserTrainerChat,
  streamUserTrainerChat,
} from "@/infrastructure/ai/gemini";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";
import { checkRateLimit } from "@/infrastructure/security/rate-limit";

export const maxDuration = 60;

const bodySchema = z.object({
  messages: z.array(z.unknown()).min(1),
  exerciseId: z.string().min(1).optional(),
  workoutId: z.string().min(1).nullable().optional(),
  commentId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();

  const limited = checkRateLimit(`agent:chat:${session.user.id}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return apiError("Too many requests", 429);
  }

  const configured = await hasUserGeminiKey(session.user.id);
  if (!configured) {
    return apiError("gemini_key_required", 403);
  }

  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return apiError("Invalid body", 400);
    }

    const messages = parsed.data.messages as UIMessage[];
    const exerciseId = parsed.data.exerciseId;
    const workoutId = parsed.data.workoutId ?? null;
    const commentId = parsed.data.commentId;

    if (commentId) {
      const comment = await getCommentById(commentId);
      if (!comment || comment.authorId !== session.user.id) {
        return apiError("Comment not found", 404);
      }
      if (!exerciseId || comment.exerciseId !== exerciseId) {
        return apiError("Comment does not match exercise", 400);
      }
    }

    const modelMessages = await convertToModelMessages(messages);
    const lift = {
      exerciseId,
      workoutId,
      commentId,
    };

    if (commentId && exerciseId) {
      const generated = await generateUserTrainerChat({
        userId: session.user.id,
        system: TRAINER_SYSTEM_PROMPT,
        messages: modelMessages,
        lift,
      });
      const text = generated.text.trim();
      const relayedTrainer = generated.toolResults.some(
        (result) =>
          result.toolName === "loop_in_trainer" &&
          typeof result.output === "object" &&
          result.output != null &&
          "ok" in result.output &&
          result.output.ok === true,
      );
      if (!text && !relayedTrainer) {
        return apiError("Trainer reply was empty", 502);
      }
      if (text) {
        const trigger = await getCommentById(commentId);
        await createComment({
          id: crypto.randomUUID(),
          exerciseId,
          workoutId,
          text,
          role: "agent",
          mentions: [],
          parentId: trigger?.parentId ?? commentId,
          authorId: session.user.id,
        });
      }
      return Response.json({ ok: true });
    }

    const result = await streamUserTrainerChat({
      userId: session.user.id,
      system: TRAINER_SYSTEM_PROMPT,
      messages: modelMessages,
      lift,
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "gemini_key_required") {
      return apiError("gemini_key_required", 403);
    }
    const message =
      error instanceof Error ? error.message : "Failed to chat with trainer";
    return apiError(message, 500);
  }
}
