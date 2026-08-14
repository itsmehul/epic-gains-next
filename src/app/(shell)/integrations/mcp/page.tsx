import { McpKeysPanel } from "@/components/integrations/mcp-keys-panel";
import { McpOauthClientsPanel } from "@/components/integrations/mcp-oauth-clients-panel";
import {
  AppShellBody,
  AppShellHeader,
  AppShellScroll,
} from "@/components/layout/app-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAppUrl } from "@/shared/env";

export default function McpIntegrationsPage() {
  const appUrl = getAppUrl();
  const mcpUrl = `${appUrl}/api/mcp`;
  const isHttpsPublic = appUrl.startsWith("https://");

  return (
    <AppShellScroll>
      <AppShellHeader backHref="/integrations" title="MCP" />
      <AppShellBody className="px-4 py-6">
        <Tabs defaultValue="gemini">
          <TabsList className="w-full">
            <TabsTrigger value="gemini">Gemini</TabsTrigger>
            <TabsTrigger value="oauth">OAuth</TabsTrigger>
            <TabsTrigger value="keys">API keys</TabsTrigger>
          </TabsList>

          <TabsContent className="mt-4 space-y-3" value="gemini">
            {!isHttpsPublic ? (
              <p className="text-destructive text-sm" role="alert">
                Gemini needs HTTPS. Set{" "}
                <code className="font-mono text-xs">NEXT_PUBLIC_APP_URL</code>{" "}
                and <code className="font-mono text-xs">BETTER_AUTH_URL</code>{" "}
                to an ngrok URL, then restart the app.
              </p>
            ) : null}
            <p className="text-muted-foreground text-sm">
              Paste only the MCP URL. Spark discovers OAuth — do not add API
              keys or custom headers.
            </p>
            <p className="font-mono text-xs break-all">{mcpUrl}</p>
          </TabsContent>

          <TabsContent className="mt-4" value="oauth">
            <McpOauthClientsPanel />
          </TabsContent>

          <TabsContent className="mt-4 space-y-3" value="keys">
            <p className="text-muted-foreground text-sm">
              Cursor and other header-based clients. Not used by Gemini.
            </p>
            <McpKeysPanel mcpUrl={mcpUrl} />
          </TabsContent>
        </Tabs>
      </AppShellBody>
    </AppShellScroll>
  );
}
