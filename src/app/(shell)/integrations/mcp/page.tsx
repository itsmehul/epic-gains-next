import Link from "next/link";

import { McpKeysPanel } from "@/components/integrations/mcp-keys-panel";
import { McpOauthClientsPanel } from "@/components/integrations/mcp-oauth-clients-panel";
import {
  AppShellBody,
  AppShellHeader,
  AppShellScroll,
} from "@/components/layout/app-shell";
import { getAppUrl } from "@/shared/env";

export default function McpIntegrationsPage() {
  const appUrl = getAppUrl();
  const mcpUrl = `${appUrl}/api/mcp`;
  const authorizeUrl = `${appUrl}/api/auth/mcp/authorize`;
  const tokenUrl = `${appUrl}/api/auth/mcp/token`;
  const isHttpsPublic = appUrl.startsWith("https://");

  return (
    <AppShellScroll>
      <AppShellHeader title="MCP" />
      <AppShellBody className="gap-10 px-4 py-8">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Connect Claude, Gemini Spark, Cursor, or your agents to Epic Gains
              via MCP.{" "}
              <Link
                className="text-foreground font-medium underline underline-offset-4"
                href="/integrations"
              >
                Back to integrations
              </Link>
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">
              Gemini Spark (OAuth only)
            </h2>
            <div className="space-y-3 rounded-xl border border-border/80 px-4 py-4 text-sm">
              {!isHttpsPublic ? (
                <p className="text-destructive" role="alert">
                  Public URL is still{" "}
                  <code className="font-mono text-xs">{appUrl}</code>. Gemini
                  cannot complete OAuth against localhost. Run{" "}
                  <code className="font-mono text-xs">ngrok http 3000</code>, set
                  both <code className="font-mono text-xs">NEXT_PUBLIC_APP_URL</code>{" "}
                  and <code className="font-mono text-xs">BETTER_AUTH_URL</code>{" "}
                  to the HTTPS tunnel, then restart{" "}
                  <code className="font-mono text-xs">pnpm dev</code>.
                </p>
              ) : null}
              <p className="text-muted-foreground">
                Gemini rejects API keys / custom{" "}
                <code className="font-mono text-xs">Authorization</code> headers.
                Paste only the MCP URL (Spark discovers OAuth + registers itself).
                Do not paste Cursor-style header configs.
              </p>
              <dl className="grid gap-2 font-mono text-xs">
                <div className="grid gap-1 sm:grid-cols-[8rem_1fr]">
                  <dt className="text-muted-foreground">MCP URL</dt>
                  <dd className="break-all">{mcpUrl}</dd>
                </div>
                <div className="grid gap-1 sm:grid-cols-[8rem_1fr]">
                  <dt className="text-muted-foreground">Authorize</dt>
                  <dd className="break-all">{authorizeUrl}</dd>
                </div>
                <div className="grid gap-1 sm:grid-cols-[8rem_1fr]">
                  <dt className="text-muted-foreground">Token</dt>
                  <dd className="break-all">{tokenUrl}</dd>
                </div>
              </dl>
              <p className="text-muted-foreground">
                For Gemini Enterprise / confidential clients, create a client
                below with redirect{" "}
                <code className="font-mono text-xs">
                  https://vertexaisearch.cloud.google.com/oauth-redirect
                </code>{" "}
                (or the URI shown in their UI), enable PKCE, and use scopes{" "}
                <code className="font-mono text-xs">
                  openid profile email offline_access
                  ACCESS_VIEW_MANAGE_MCP_CONTENT
                </code>
                .
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">OAuth clients</h2>
            <McpOauthClientsPanel />
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">
              API keys (Cursor / local only)
            </h2>
            <p className="text-muted-foreground text-sm">
              Not supported by Gemini. Use for Cursor or other header-based
              clients.
            </p>
            <McpKeysPanel mcpUrl={mcpUrl} />
          </div>
      </AppShellBody>
    </AppShellScroll>
  );
}
