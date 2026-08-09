import { oAuthDiscoveryMetadata } from "better-auth/plugins";
import { connection } from "next/server";

import { auth } from "@/infrastructure/auth/server";
import { MCP_OAUTH_SCOPES } from "@/infrastructure/mcp/scopes";

const discoveryHandler = oAuthDiscoveryMetadata(auth);

export async function GET(request: Request) {
  await connection();
  const response = await discoveryHandler(request);
  if (!response.ok) return response;

  const metadata = (await response.json()) as Record<string, unknown>;
  return Response.json(
    {
      ...metadata,
      scopes_supported: MCP_OAUTH_SCOPES,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  );
}
