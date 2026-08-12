import { NextResponse } from "next/server";

import { searchUsers } from "@/db/repositories/social.repository";
import { searchUsersQuerySchema } from "@/features/social/schemas";
import {
  apiError,
  requireApiSession,
  unauthorizedResponse,
} from "@/infrastructure/auth/api";

export async function GET(req: Request) {
  const session = await requireApiSession();
  if (!session) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const parsed = searchUsersQuerySchema.safeParse({
      q: searchParams.get("q") ?? "",
    });
    if (!parsed.success) {
      return apiError("Invalid query", 400);
    }

    const items = await searchUsers(parsed.data.q);
    return NextResponse.json({ items });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to search users";
    return apiError(message, 500);
  }
}
