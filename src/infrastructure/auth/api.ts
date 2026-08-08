import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "./server";

export async function requireApiSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return null;
  }

  return session;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function apiError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}
