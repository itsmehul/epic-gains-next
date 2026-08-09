import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

export type McpRequestAuth = {
  userId: string;
  apiKeyId: string | null;
  apiKeyName: string;
  oauthClientId: string | null;
};

const mcpAuthStorage = new AsyncLocalStorage<McpRequestAuth>();

export function runWithMcpAuth<T>(auth: McpRequestAuth, fn: () => T): T {
  return mcpAuthStorage.run(auth, fn);
}

export function getMcpAuth(): McpRequestAuth {
  const auth = mcpAuthStorage.getStore();
  if (!auth) {
    throw new Error("MCP auth context is missing");
  }
  return auth;
}
