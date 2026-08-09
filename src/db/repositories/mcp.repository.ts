import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { mcpApiKey } from "@/db/schema";
import {
  generateMcpApiKey,
  hashMcpApiKey,
} from "@/infrastructure/mcp/api-key";

export type McpApiKeyPublic = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

function toPublic(row: typeof mcpApiKey.$inferSelect): McpApiKeyPublic {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
    revokedAt: row.revokedAt,
  };
}

export async function listMcpApiKeysForUser(
  userId: string,
): Promise<McpApiKeyPublic[]> {
  const rows = await db
    .select()
    .from(mcpApiKey)
    .where(and(eq(mcpApiKey.userId, userId), isNull(mcpApiKey.revokedAt)))
    .orderBy(desc(mcpApiKey.createdAt));

  return rows.map(toPublic);
}

export async function createMcpApiKeyForUser(input: {
  userId: string;
  name: string;
}): Promise<{ key: McpApiKeyPublic; rawKey: string }> {
  const { rawKey, keyHash, keyPrefix } = generateMcpApiKey();
  const [row] = await db
    .insert(mcpApiKey)
    .values({
      userId: input.userId,
      name: input.name.trim(),
      keyPrefix,
      keyHash,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create MCP API key");
  }

  return { key: toPublic(row), rawKey };
}

export async function revokeMcpApiKeyForUser(input: {
  userId: string;
  keyId: string;
}): Promise<McpApiKeyPublic | null> {
  const [row] = await db
    .update(mcpApiKey)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(mcpApiKey.id, input.keyId),
        eq(mcpApiKey.userId, input.userId),
        isNull(mcpApiKey.revokedAt),
      ),
    )
    .returning();

  return row ? toPublic(row) : null;
}

export async function findActiveMcpApiKeyByRawKey(rawKey: string): Promise<{
  id: string;
  userId: string;
  name: string;
} | null> {
  const keyHash = hashMcpApiKey(rawKey);
  const [row] = await db
    .select({
      id: mcpApiKey.id,
      userId: mcpApiKey.userId,
      name: mcpApiKey.name,
    })
    .from(mcpApiKey)
    .where(and(eq(mcpApiKey.keyHash, keyHash), isNull(mcpApiKey.revokedAt)))
    .limit(1);

  return row ?? null;
}

export async function touchMcpApiKeyLastUsed(keyId: string): Promise<void> {
  await db
    .update(mcpApiKey)
    .set({ lastUsedAt: new Date() })
    .where(eq(mcpApiKey.id, keyId));
}
