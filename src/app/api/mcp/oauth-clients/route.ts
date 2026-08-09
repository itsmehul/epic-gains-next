import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createOAuthClientForUser,
  listOAuthClientsForUser,
} from "@/db/repositories/oauth-client.repository";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

const createBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  redirectUrls: z
    .array(z.string().url())
    .min(1, "At least one redirect URI is required")
    .max(10),
});

export async function GET() {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const clients = await listOAuthClientsForUser(session.user.id);
  return NextResponse.json({ clients });
}

export async function POST(req: Request) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const body = createBodySchema.parse(await req.json());
    const { client, clientSecret } = await createOAuthClientForUser({
      userId: session.user.id,
      name: body.name,
      redirectUrls: body.redirectUrls,
    });
    return NextResponse.json({ client, clientSecret }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to create OAuth client";
    return apiError(message, 500);
  }
}
