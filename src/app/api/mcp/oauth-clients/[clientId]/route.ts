import { NextResponse } from "next/server";

import { disableOAuthClientForUser } from "@/db/repositories/oauth-client.repository";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

type RouteParams = {
  clientId: string;
};

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { clientId } = await params;
    const client = await disableOAuthClientForUser({
      userId: session.user.id,
      clientId,
    });
    if (!client) {
      return apiError("OAuth client not found", 404);
    }
    return NextResponse.json({ client });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to disable OAuth client";
    return apiError(message, 500);
  }
}
