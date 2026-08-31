import { NextResponse } from "next/server";

import {
  deleteUserGeminiKey,
  hasUserGeminiKey,
  upsertUserGeminiKey,
} from "@/db/repositories/gemini-key.repository";
import { upsertGeminiKeySchema } from "@/features/agent/schemas";
import { validateGeminiApiKey } from "@/infrastructure/ai/gemini";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";
import { checkRateLimit } from "@/infrastructure/security/rate-limit";

export async function GET() {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();

  try {
    const configured = await hasUserGeminiKey(session.user.id);
    return NextResponse.json({ configured });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to check OpenRouter key";
    return apiError(message, 500);
  }
}

export async function PUT(req: Request) {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();

  const limited = checkRateLimit(`gemini:key:${session.user.id}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return apiError("Too many requests", 429);
  }

  try {
    const json = await req.json();
    const parsed = upsertGeminiKeySchema.safeParse(json);
    if (!parsed.success) {
      return apiError("Invalid API key", 400);
    }

    const valid = await validateGeminiApiKey(parsed.data.apiKey);
    if (!valid) {
      return apiError("OpenRouter rejected this API key", 400);
    }

    await upsertUserGeminiKey(session.user.id, parsed.data.apiKey);
    return NextResponse.json({ configured: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save OpenRouter key";
    return apiError(message, 500);
  }
}

export async function DELETE() {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();

  try {
    await deleteUserGeminiKey(session.user.id);
    return NextResponse.json({ configured: false });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove OpenRouter key";
    return apiError(message, 500);
  }
}
