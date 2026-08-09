"use client";

import {
  IconCheck,
  IconCopy,
  IconLoader2,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type OAuthClientPublic = {
  id: string;
  name: string | null;
  clientId: string;
  redirectUrls: string[];
  type: string;
  createdAt: string;
};

export function McpOauthClientsPanel() {
  const [clients, setClients] = useState<OAuthClientPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [disablingId, setDisablingId] = useState<string | null>(null);
  const [name, setName] = useState("Gemini");
  const [redirectUrlsText, setRedirectUrlsText] = useState("");
  const [createdOnce, setCreatedOnce] = useState<{
    clientId: string;
    clientSecret: string;
  } | null>(null);
  const [copied, setCopied] = useState<"id" | "secret" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    const response = await fetch("/api/mcp/oauth-clients");
    if (!response.ok) throw new Error("Failed to load OAuth clients");
    const data = (await response.json()) as { clients: OAuthClientPublic[] };
    setClients(data.clients);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await loadClients();
      } catch {
        if (!cancelled) setError("Failed to load OAuth clients");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadClients]);

  const handleCreate = async () => {
    const redirectUrls = redirectUrlsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    setError(null);
    setMessage(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (redirectUrls.length === 0) {
      setError("Paste at least one redirect URI from Gemini/Claude");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/mcp/oauth-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), redirectUrls }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Failed to create OAuth client");
      }
      const data = (await response.json()) as {
        client: OAuthClientPublic;
        clientSecret: string;
      };
      setCreatedOnce({
        clientId: data.client.clientId,
        clientSecret: data.clientSecret,
      });
      setRedirectUrlsText("");
      await loadClients();
      setMessage("OAuth client created — copy the secret now");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create OAuth client",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDisable = async (clientId: string) => {
    setDisablingId(clientId);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/mcp/oauth-clients/${clientId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to disable client");
      if (createdOnce?.clientId === clientId) setCreatedOnce(null);
      await loadClients();
      setMessage("OAuth client disabled");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to disable client",
      );
    } finally {
      setDisablingId(null);
    }
  };

  const copyText = async (text: string, kind: "id" | "secret") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setMessage(kind === "id" ? "Client ID copied" : "Client secret copied");
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("Could not copy to clipboard");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
        Gemini Spark usually needs only the MCP URL (dynamic registration). Use
        this form for Gemini Enterprise / other clients that ask for a Client ID
        + secret: paste their redirect URI, create a client, then copy credentials
        back. Claude Code can connect with just the MCP URL.
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}

      <section className="space-y-4">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Create OAuth client
        </h3>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="oauth-client-name">
              Name
            </label>
            <Input
              id="oauth-client-name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Gemini"
              value={name}
            />
          </div>
          <div className="grid gap-2">
            <label
              className="text-sm font-medium"
              htmlFor="oauth-redirect-uris"
            >
              Redirect URIs (one per line)
            </label>
            <Textarea
              id="oauth-redirect-uris"
              onChange={(event) => setRedirectUrlsText(event.target.value)}
              placeholder="Paste the redirect URI from Gemini / Claude Advanced settings"
              rows={3}
              value={redirectUrlsText}
            />
          </div>
          <Button
            className="w-fit"
            disabled={creating}
            onClick={() => void handleCreate()}
            type="button"
          >
            {creating ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : (
              <IconPlus className="size-4" />
            )}
            Create OAuth client
          </Button>
        </div>
      </section>

      {createdOnce ? (
        <section className="space-y-3">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            Credentials — secret shown once
          </h3>
          <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs">Client ID</p>
                <code className="font-mono text-sm break-all">
                  {createdOnce.clientId}
                </code>
              </div>
              <Button
                onClick={() => void copyText(createdOnce.clientId, "id")}
                size="sm"
                type="button"
                variant="outline"
              >
                {copied === "id" ? (
                  <IconCheck className="size-4" />
                ) : (
                  <IconCopy className="size-4" />
                )}
                Copy
              </Button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs">Client secret</p>
                <code className="font-mono text-sm break-all">
                  {createdOnce.clientSecret}
                </code>
              </div>
              <Button
                onClick={() => void copyText(createdOnce.clientSecret, "secret")}
                size="sm"
                type="button"
                variant="outline"
              >
                {copied === "secret" ? (
                  <IconCheck className="size-4" />
                ) : (
                  <IconCopy className="size-4" />
                )}
                Copy
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Active OAuth clients
        </h3>
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <IconLoader2 className="size-4 animate-spin" />
            Loading clients…
          </div>
        ) : clients.length === 0 ? (
          <p className="text-muted-foreground text-sm">No OAuth clients yet.</p>
        ) : (
          <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/80">
            {clients.map((client) => (
              <li
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                key={client.clientId}
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium">
                    {client.name || "Unnamed client"}
                  </p>
                  <p className="text-muted-foreground font-mono text-xs break-all">
                    {client.clientId}
                  </p>
                  <p className="text-muted-foreground text-xs break-all">
                    Redirects: {client.redirectUrls.join(", ")}
                  </p>
                </div>
                <Button
                  disabled={disablingId === client.clientId}
                  onClick={() => void handleDisable(client.clientId)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {disablingId === client.clientId ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconTrash className="size-4" />
                  )}
                  Disable
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
