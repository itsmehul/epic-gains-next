import {
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { createComment, getCommentById } from "@/db/repositories/comment.repository";
import { hasUserGeminiKey } from "@/db/repositories/gemini-key.repository";
import {
  TRAINER_SYSTEM_PROMPT,
  buildAgentExerciseContext,
} from "@/features/agent/context";
import { streamUserTrainerChat } from "@/infrastructure/ai/gemini";
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

function textFromUIMessage(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();
}

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

    let system = TRAINER_SYSTEM_PROMPT;
    let youtubeUrls: string[] = [];

    if (exerciseId) {
      const context = await buildAgentExerciseContext({
        userId: session.user.id,
        exerciseId,
        workoutId,
      });
      if (context.systemExtra) {
        system = `${TRAINER_SYSTEM_PROMPT}\n\n${context.systemExtra}`;
      }
      youtubeUrls = context.youtubeUrls;
    }

    const modelMessages = await convertToModelMessages(messages);
    const result = await streamUserTrainerChat({
      userId: session.user.id,
      system,
      messages: modelMessages,
      youtubeUrls,
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onFinish: async ({ responseMessage, isAborted }) => {
        if (isAborted || !commentId || !exerciseId) return;
        const text = textFromUIMessage(responseMessage);
        if (!text) return;
        await createComment({
          id: crypto.randomUUID(),
          exerciseId,
          workoutId,
          text,
          role: "agent",
          mentions: [],
          authorId: session.user.id,
        });
      },
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
