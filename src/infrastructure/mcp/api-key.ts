import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const MCP_API_KEY_PREFIX = "epic_";

export function hashMcpApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function generateMcpApiKey(): {
  rawKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  const secret = randomBytes(32).toString("base64url");
  const rawKey = `${MCP_API_KEY_PREFIX}${secret}`;
  return {
    rawKey,
    keyHash: hashMcpApiKey(rawKey),
    keyPrefix: rawKey.slice(0, 12),
  };
}

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}
