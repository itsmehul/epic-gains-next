import { z } from "zod";

import { hasUserGeminiKey } from "@/db/repositories/gemini-key.repository";
import { respondToTrainerEscalation } from "@/features/agent/escalation-server";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";
import { checkRateLimit } from "@/infrastructure/security/rate-limit";

export const maxDuration = 60;

const bodySchema = z.object({
  commentId: z.string().min(1),
  approved: z.boolean(),
});

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();

  const limited = checkRateLimit(`agent:escalation:${session.user.id}`, {
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

    const result = await respondToTrainerEscalation({
      userId: session.user.id,
      commentId: parsed.data.commentId,
      approved: parsed.data.approved,
    });
    if (!result.ok) {
      return apiError(result.error, result.status);
    }
    return Response.json({ ok: true, approved: result.approved });
  } catch (error) {
    if (error instanceof Error && error.message === "gemini_key_required") {
      return apiError("gemini_key_required", 403);
    }
    const message =
      error instanceof Error ? error.message : "Failed to update trainer ping";
    return apiError(message, 500);
  }
}
