"use client";

import { IconBrain, IconLoader2, IconTrash } from "@/components/ui/icons";
import Link from "next/link";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useDeleteGeminiKey,
  useGeminiKeyStatus,
  useUpsertGeminiKey,
} from "@/features/agent/hooks";
import { cn } from "@/shared/utils";

export function GeminiKeyCard() {
  const status = useGeminiKeyStatus();
  const upsert = useUpsertGeminiKey();
  const remove = useDeleteGeminiKey();
  const [apiKey, setApiKey] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const configured = status.data?.configured ?? false;
  const pending = upsert.isPending || remove.isPending;

  async function handleSave() {
    setLocalError(null);
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setLocalError("Paste an OpenRouter API key");
      return;
    }
    try {
      await upsert.mutateAsync(trimmed);
      setApiKey("");
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Failed to save key",
      );
    }
  }

  async function handleRemove() {
    setLocalError(null);
    try {
      await remove.mutateAsync();
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Failed to remove key",
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconBrain className="size-5" />
          Gemini via OpenRouter
        </CardTitle>
        <CardDescription>
          Add your OpenRouter API key to unlock the Fitness Trainer Agent in
          comments (@agent) and on the Trainer page. Requests run Gemini through
          OpenRouter. The key is encrypted at rest and never shown again.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {status.isLoading ? (
          <p className="text-muted-foreground text-sm">Checking status…</p>
        ) : configured ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Key configured</p>
              <p className="text-muted-foreground text-xs">
                •••••••••••••••• (hidden)
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                void handleRemove();
              }}
            >
              {remove.isPending ? (
                <IconLoader2 className="size-4 animate-spin" />
              ) : (
                <IconTrash className="size-4" />
              )}
              Remove
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="Paste OpenRouter API key"
              value={apiKey}
              disabled={pending}
              onChange={(event) => setApiKey(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSave();
                }
              }}
            />
            <p className="text-muted-foreground text-xs">
              Get a key from{" "}
              <a
                className="underline underline-offset-2"
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
              >
                OpenRouter
              </a>
              .
            </p>
          </div>
        )}
        {localError || upsert.isError || remove.isError || status.isError ? (
          <p className="text-destructive text-xs" role="alert">
            {localError ??
              (upsert.error instanceof Error
                ? upsert.error.message
                : remove.error instanceof Error
                  ? remove.error.message
                  : status.error instanceof Error
                    ? status.error.message
                    : "Something went wrong")}
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {configured ? (
          <Link
            className={cn(buttonVariants({ variant: "outline" }))}
            href="/agent"
          >
            Open Trainer
          </Link>
        ) : (
          <Button
            type="button"
            disabled={pending || !apiKey.trim()}
            onClick={() => {
              void handleSave();
            }}
          >
            {upsert.isPending ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : null}
            Save key
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
