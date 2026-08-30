import { createMcpHandler } from "mcp-handler";

import {
  findActiveMcpApiKeyByRawKey,
  touchMcpApiKeyLastUsed,
} from "@/db/repositories/mcp.repository";
import { registerSocialMcpTools } from "@/features/social/mcp-tools";
import { registerWorkoutMcpTools } from "@/features/workouts/mcp-tools";
import { auth } from "@/infrastructure/auth/server";
import {
  extractBearerToken,
  MCP_API_KEY_PREFIX,
} from "@/infrastructure/mcp/api-key";
import {
  runWithMcpAuth,
  type McpRequestAuth,
} from "@/infrastructure/mcp/context";
import { getAppUrl } from "@/shared/env";

export const maxDuration = 60;

class McpAuthError extends Error {
  status = 401 as const;

  constructor(message: string) {
    super(message);
    this.name = "McpAuthError";
  }
}

const mcpHandler = createMcpHandler(
  (server) => {
    registerWorkoutMcpTools(server);
    registerSocialMcpTools(server);
  },
  {
    serverInfo: {
      name: "epic-gains",
      version: "1.0.0",
    },
    instructions: [
      "Epic Gains MCP: workouts, exercise catalog, logged sets, Instagram-style follows.",
      "Routing: you = performance_metrics with no username. Me vs one friend or two named friends = compare_performance_metrics once (never two performance_metrics calls). Everyone you follow = following_performance_metrics once. Never loop performance_metrics per friend. Never use performance_data for recaps, trends, streaks, or PRs.",
      "Cite numbers only from the last successful tool payload. If a call errors (not found / not visible), quote that error and stop. Do not invent metrics, visibility, or follow state.",
      "Do not call list_follow_requests, follow_user, get_social_profile, list_following, list_followers, list_following_feed, search_users, or trainer tools to check access or after a metrics error. list_follow_requests is incoming requests to follow YOU, and only when the user asks to review that inbox.",
      "Host MCP approval UI is not a follow request. Chat text like Allow is not a tool and not a social action.",
    ].join("\n"),
  },
);

const mcpCorsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version, Accept",
  "Access-Control-Expose-Headers": "WWW-Authenticate",
  "Access-Control-Max-Age": "86400",
};

function oauthWwwAuthenticate(): string {
  // Path-aware PRM URL (RFC 9728) — Gemini/Claude often resolve this shape.
  const resourceMetadata = `${getAppUrl()}/.well-known/oauth-protected-resource/api/mcp`;
  return `Bearer realm="Epic Gains", resource_metadata="${resourceMetadata}"`;
}

function withMcpCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(mcpCorsHeaders)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function unauthorizedOAuthResponse(
  message = "Authentication required",
): Response {
  return Response.json(
    {
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message,
      },
      id: null,
    },
    {
      status: 401,
      headers: {
        ...mcpCorsHeaders,
        "WWW-Authenticate": oauthWwwAuthenticate(),
      },
    },
  );
}

async function authenticateWithApiKey(rawKey: string): Promise<McpRequestAuth> {
  const key = await findActiveMcpApiKeyByRawKey(rawKey);
  if (!key) {
    throw new McpAuthError("Invalid or revoked API key");
  }

  void touchMcpApiKeyLastUsed(key.id).catch(() => undefined);

  return {
    userId: key.userId,
    apiKeyId: key.id,
    apiKeyName: key.name,
    oauthClientId: null,
  };
}

async function authenticateWithOAuth(
  request: Request,
): Promise<McpRequestAuth | null> {
  const session = await auth.api.getMcpSession({
    headers: request.headers,
  });

  if (!session?.userId) {
    return null;
  }

  return {
    userId: session.userId,
    apiKeyId: null,
    apiKeyName: `oauth:${session.clientId}`,
    oauthClientId: session.clientId,
  };
}

async function authenticateMcpRequest(
  request: Request,
): Promise<McpRequestAuth> {
  const rawKey = extractBearerToken(request);
  if (!rawKey) {
    throw new McpAuthError("Missing Authorization Bearer token");
  }

  if (rawKey.startsWith(MCP_API_KEY_PREFIX)) {
    return authenticateWithApiKey(rawKey);
  }

  const oauthAuth = await authenticateWithOAuth(request);
  if (oauthAuth) {
    return oauthAuth;
  }

  throw new McpAuthError("Invalid or expired OAuth access token");
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: mcpCorsHeaders,
  });
}

async function handle(request: Request): Promise<Response> {
  try {
    const authContext = await authenticateMcpRequest(request);
    const response = await runWithMcpAuth(authContext, () =>
      mcpHandler(request),
    );
    return withMcpCors(response);
  } catch (error) {
    if (error instanceof McpAuthError) {
      return unauthorizedOAuthResponse(error.message);
    }
    throw error;
  }
}

export { handle as DELETE, handle as GET, handle as HEAD, handle as POST };
