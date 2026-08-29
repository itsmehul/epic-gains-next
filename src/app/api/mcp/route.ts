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
      "Epic Gains MCP manages user workouts, a shared exercise catalog, logged sets, and Instagram-style follows.",
      "For training recaps, progress, volume, week-over-week trends, streaks, PRs, or session notes, call performance_metrics once (optional date YYYY-MM-DD, default today; optional username for a visible friend). It returns focal day, current ISO week, prior week, trailing 30 days, deltas, streak, PRs, all visible comments with exercise/workout context, and a daily rollup — do not issue multiple performance_data calls for those windows. Use performance_data only when you need set-level detail for a single day/week/month/year. Filter either tool with muscleGroup and/or keyMuscle. Omit username for the authenticated user. Private accounts require an accepted follow.",
      "To recap everyone you follow, call following_performance_metrics once. Do not list_following, list_following_feed, or loop get_social_profile / performance_metrics per friend. For one named friend, call performance_metrics with that username.",
      "Social tools: search_users, get_social_profile, follow_user/unfollow_user, list/accept/reject follow requests, list_following_feed, update_social_settings, following_performance_metrics.",
      "Private accounts require an accepted follow before workouts are visible.",
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
