import { NextResponse } from "next/server";

import { revokeMcpApiKeyForUser } from "@/db/repositories/mcp.repository";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

type RouteParams = {
  keyId: string;
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
    const { keyId } = await params;
    const key = await revokeMcpApiKeyForUser({
      userId: session.user.id,
      keyId,
    });
    if (!key) {
      return apiError("API key not found", 404);
    }
    return NextResponse.json({ key });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to revoke API key";
    return apiError(message, 500);
  }
}
