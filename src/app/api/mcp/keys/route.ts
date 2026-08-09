import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createMcpApiKeyForUser,
  listMcpApiKeysForUser,
} from "@/db/repositories/mcp.repository";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

const createBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function GET() {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const keys = await listMcpApiKeysForUser(session.user.id);
  return NextResponse.json({ keys });
}

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const body = createBodySchema.parse(await req.json());
    const { key, rawKey } = await createMcpApiKeyForUser({
      userId: session.user.id,
      name: body.name,
    });
    return NextResponse.json({ key, rawKey }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to create API key";
    return apiError(message, 500);
  }
}
