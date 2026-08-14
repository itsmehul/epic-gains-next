import { createMcpHandler } from "mcp-handler";

import {
  findActiveMcpApiKeyByRawKey,
  touchMcpApiKeyLastUsed,
} from "@/db/repositories/mcp.repository";
import { registerWorkoutMcpTools } from "@/features/workouts/mcp-tools";
import { registerSocialMcpTools } from "@/features/social/mcp-tools";
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
      "Use get_sets_by_period to fetch logged sets for a day, week, month, or year, including workout overview, exercise muscle group/key muscles, and comments. Filter with muscleGroup and/or keyMuscle.",
      "Social tools: search_users, get_social_profile, follow_user/unfollow_user, list/accept/reject follow requests, list_following_feed, update_social_settings.",
      "Private accounts require an accepted follow before workouts are visible.",
      "When importing a follow-along video workout, use the 'import_full_workout' tool to create the workout and all its exercises in a single transaction.",
      "You must procure granular exercise-by-exercise data before calling the tool:",
      "1) Resolve the canonical video URL, title, and duration in seconds.",
      "2) Obtain a timed move list (chapters, timed description, or transcript). Each chapter timestamp is that move's START, not its end — never only coarse section ranges like Warm-Up 0:00–5:00.",
      "3) For markers T[0]..T[n], set exercise i to videoStartTime=T[i] and videoEndTime=T[i+1] (last move ends at video duration). Do not use T[i+1] as the start of move i. Adjacent moves must abut.",
      "4) Call import_full_workout with sourceVideoUrl at the root and those timestamps in seconds.",
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

export { handle as GET, handle as POST, handle as DELETE, handle as HEAD };
