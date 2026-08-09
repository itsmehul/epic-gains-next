/** Scopes advertised + accepted for MCP OAuth (includes Gemini Spark compatibility scope). */
export const MCP_OAUTH_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "ACCESS_VIEW_MANAGE_MCP_CONTENT",
] as const;

export const MCP_OAUTH_DEFAULT_SCOPE = MCP_OAUTH_SCOPES.join(" ");
