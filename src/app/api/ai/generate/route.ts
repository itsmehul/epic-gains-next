import { NextResponse } from "next/server";
import { z } from "zod";

import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";
import { checkRateLimit } from "@/infrastructure/security/rate-limit";
import { withSecurityHeaders } from "@/infrastructure/security/headers";

const bodySchema = z.object({
  name: z.string().min(1).max(80),
});

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const limited = checkRateLimit(`ai:generate:${session.user.id}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return apiError("Too many requests", 429);
  }

  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return apiError("Invalid body", 400);
    }

    const { generateGreeting } = await import("@/infrastructure/ai/openrouter");
    const text = await generateGreeting(parsed.data.name);
    return withSecurityHeaders(NextResponse.json({ text }));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate text";
    return apiError(message, 500);
  }
}
