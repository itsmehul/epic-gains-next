"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { APP_NAME } from "@/shared/pwa/constants";

export function OAuthConsentClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientId = searchParams.get("client_id");
  const scope = searchParams.get("scope");
  const consentCode = searchParams.get("consent_code");

  const submit = async (accept: boolean) => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/oauth2/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accept,
          ...(consentCode ? { consent_code: consentCode } : {}),
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        redirectURI?: string;
        error?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        setError(
          data?.message ||
            data?.error ||
            "Consent failed. Try signing in again.",
        );
        setPending(false);
        return;
      }

      if (data?.redirectURI) {
        window.location.href = data.redirectURI;
        return;
      }

      router.push("/workouts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Consent failed");
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authorize MCP access</CardTitle>
          <CardDescription>
            An MCP client wants to access your {APP_NAME} account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-sm">
            <p>
              <span className="text-muted-foreground">Client:</span>{" "}
              <span className="font-mono break-all">
                {clientId ?? "Unknown"}
              </span>
            </p>
            {scope ? (
              <p className="mt-2">
                <span className="text-muted-foreground">Scopes:</span>{" "}
                <span className="font-mono break-all">{scope}</span>
              </p>
            ) : null}
          </div>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="flex-1"
            disabled={pending}
            onClick={() => void submit(true)}
            type="button"
          >
            {pending ? <Spinner className="size-4" /> : null}
            Allow
          </Button>
          <Button
            className="flex-1"
            disabled={pending}
            onClick={() => void submit(false)}
            type="button"
            variant="outline"
          >
            Deny
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
