import "server-only";

import { generateRandomString } from "better-auth/crypto";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { oauthApplication } from "@/db/schema";

export type OAuthClientPublic = {
  id: string;
  name: string | null;
  clientId: string;
  redirectUrls: string[];
  type: string;
  disabled: boolean | null;
  createdAt: Date;
  updatedAt: Date;
};

function toPublic(
  row: typeof oauthApplication.$inferSelect,
): OAuthClientPublic {
  return {
    id: row.id,
    name: row.name,
    clientId: row.clientId,
    redirectUrls: row.redirectUrls
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    type: row.type,
    disabled: row.disabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listOAuthClientsForUser(
  userId: string,
): Promise<OAuthClientPublic[]> {
  const rows = await db
    .select()
    .from(oauthApplication)
    .where(
      and(
        eq(oauthApplication.userId, userId),
        eq(oauthApplication.disabled, false),
      ),
    )
    .orderBy(desc(oauthApplication.createdAt));

  return rows.map(toPublic);
}

export async function createOAuthClientForUser(input: {
  userId: string;
  name: string;
  redirectUrls: string[];
}): Promise<{ client: OAuthClientPublic; clientSecret: string }> {
  const clientId = generateRandomString(32, "a-z", "A-Z");
  const clientSecret = generateRandomString(32, "a-z", "A-Z");
  const now = new Date();

  const [row] = await db
    .insert(oauthApplication)
    .values({
      name: input.name.trim(),
      clientId,
      clientSecret,
      redirectUrls: input.redirectUrls.map((url) => url.trim()).join(","),
      type: "web",
      disabled: false,
      userId: input.userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create OAuth client");
  }

  return { client: toPublic(row), clientSecret };
}

export async function disableOAuthClientForUser(input: {
  userId: string;
  clientId: string;
}): Promise<OAuthClientPublic | null> {
  const [row] = await db
    .update(oauthApplication)
    .set({ disabled: true, updatedAt: new Date() })
    .where(
      and(
        eq(oauthApplication.clientId, input.clientId),
        eq(oauthApplication.userId, input.userId),
        eq(oauthApplication.disabled, false),
      ),
    )
    .returning();

  return row ? toPublic(row) : null;
}
