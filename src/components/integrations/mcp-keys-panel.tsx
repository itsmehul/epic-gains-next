"use client";

import {
  IconCheck,
  IconCopy,
  IconKey,
  IconLoader2,
  IconPlus,
  IconTrash,
} from "@/components/ui/icons";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type McpApiKeyPublic = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export function McpKeysPanel({ mcpUrl }: { mcpUrl: string }) {
  const [keys, setKeys] = useState<McpApiKeyPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [rawKeyOnce, setRawKeyOnce] = useState<string | null>(null);
  const [copied, setCopied] = useState<"key" | "config" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cursorConfig = useMemo(() => {
    if (!rawKeyOnce) return null;
    return JSON.stringify(
      {
        mcpServers: {
          "epic-gains": {
            url: mcpUrl,
            headers: {
              Authorization: `Bearer ${rawKeyOnce}`,
            },
          },
        },
      },
      null,
      2,
    );
  }, [mcpUrl, rawKeyOnce]);

  const loadKeys = useCallback(async () => {
    const response = await fetch("/api/mcp/keys");
    if (!response.ok) {
      throw new Error("Failed to load API keys");
    }
    const data = (await response.json()) as { keys: McpApiKeyPublic[] };
    setKeys(data.keys);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await loadKeys();
      } catch {
        if (!cancelled) setError("Failed to load MCP keys");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadKeys]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    setError(null);
    setMessage(null);
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    setCreating(true);
    try {
      const response = await fetch("/api/mcp/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Failed to create key");
      }
      const data = (await response.json()) as {
        key: McpApiKeyPublic;
        rawKey: string;
      };
      setRawKeyOnce(data.rawKey);
      setName("");
      await loadKeys();
      setMessage("API key created — copy it now");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    setRevokingId(keyId);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/mcp/keys/${keyId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to revoke key");
      }
      if (rawKeyOnce) setRawKeyOnce(null);
      await loadKeys();
      setMessage("API key revoked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke key");
    } finally {
      setRevokingId(null);
    }
  };

  const copyText = async (text: string, kind: "key" | "config") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setMessage(kind === "key" ? "Key copied" : "Config copied");
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("Could not copy to clipboard");
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
        MCP API keys can create and manage your workouts and the shared exercise
        catalog. Treat them like passwords and revoke compromised keys
        immediately.
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

      <section className="space-y-3">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Endpoint
        </h3>
        <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3">
          <p className="text-muted-foreground text-xs">MCP URL</p>
          <p className="mt-1 font-mono text-sm break-all">{mcpUrl}</p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Create key
        </h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-2">
            <label className="text-sm font-medium" htmlFor="mcp-key-name">
              Name
            </label>
            <Input
              id="mcp-key-name"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleCreate();
              }}
              placeholder="Cursor laptop"
              value={name}
            />
          </div>
          <Button
            disabled={creating}
            onClick={() => void handleCreate()}
            type="button"
          >
            {creating ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : (
              <IconPlus className="size-4" />
            )}
            Create key
          </Button>
        </div>
      </section>

      {rawKeyOnce ? (
        <section className="space-y-3">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            New key — shown once
          </h3>
          <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <code className="font-mono text-sm break-all">{rawKeyOnce}</code>
              <Button
                onClick={() => void copyText(rawKeyOnce, "key")}
                size="sm"
                type="button"
                variant="outline"
              >
                {copied === "key" ? (
                  <IconCheck className="size-4" />
                ) : (
                  <IconCopy className="size-4" />
                )}
                Copy key
              </Button>
            </div>
            {cursorConfig ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-muted-foreground text-xs font-medium">
                    Cursor config (not for Gemini — use OAuth URL only)
                  </p>
                  <Button
                    onClick={() => void copyText(cursorConfig, "config")}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    {copied === "config" ? (
                      <IconCheck className="size-4" />
                    ) : (
                      <IconCopy className="size-4" />
                    )}
                    Copy config
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-lg border border-border/70 bg-background/80 p-3 font-mono text-xs">
                  {cursorConfig}
                </pre>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Active keys
        </h3>
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <IconLoader2 className="size-4 animate-spin" />
            Loading keys…
          </div>
        ) : keys.length === 0 ? (
          <p className="text-muted-foreground text-sm">No API keys yet.</p>
        ) : (
          <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/80">
            {keys.map((key) => (
              <li
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                key={key.id}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <IconKey className="text-muted-foreground size-4 shrink-0" />
                    <p className="truncate text-sm font-medium">{key.name}</p>
                  </div>
                  <p className="text-muted-foreground font-mono text-xs">
                    {key.keyPrefix}…
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Created {formatDate(key.createdAt)} · Last used{" "}
                    {formatDate(key.lastUsedAt)}
                  </p>
                </div>
                <Button
                  disabled={revokingId === key.id}
                  onClick={() => void handleRevoke(key.id)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {revokingId === key.id ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconTrash className="size-4" />
                  )}
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
