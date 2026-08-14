"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { AuthAmbientBackground } from "@/components/auth/auth-ambient-background";
import { signIn } from "@/infrastructure/auth/client";
import { APP_NAME, BRAND_ICON } from "@/shared/pwa/constants";

function oauthCallbackErrorMessage(code: string | null) {
  if (!code) return null;
  if (code === "account_not_linked") {
    return "This email already has an account. Sign in with email and password, then you can use Google next time.";
  }
  return "Google sign-in failed. Try again.";
}

function safeNextPath(next: string | null) {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/workouts";
}

/** Better Auth MCP authorize redirects here with OAuth query params + oidc_login_prompt cookie. */
function mcpAuthorizeResumePath(searchParams: URLSearchParams): string | null {
  if (searchParams.get("response_type") !== "code") return null;
  if (!searchParams.get("client_id")) return null;
  return `/api/auth/mcp/authorize?${searchParams.toString()}`;
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(
    oauthCallbackErrorMessage(searchParams.get("error")),
  );
  const [pending, setPending] = useState(false);
  const nextPath = safeNextPath(searchParams.get("next"));
  const mcpAuthorizePath = mcpAuthorizeResumePath(searchParams);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const { error: signInError } = await signIn.email({
      email,
      password,
    });

    if (signInError) {
      setPending(false);
      setError(signInError.message ?? "Unable to sign in");
      return;
    }

    // MCP OAuth: Better Auth's redirect plugin may navigate to the client
    // callback; if not, resume authorize with the original query.
    if (mcpAuthorizePath) {
      window.location.assign(mcpAuthorizePath);
      return;
    }

    setPending(false);
    router.push(nextPath);
    router.refresh();
  }

  return (
    <Card className="relative w-full max-w-md shadow-xl">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center overflow-hidden rounded-[18.8%] bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND_ICON} alt="" className="h-full w-full" aria-hidden />
          </span>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-primary">
            {APP_NAME}
          </p>
        </div>
        <div className="space-y-1.5">
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            {mcpAuthorizePath
              ? `Authorize an MCP client for ${APP_NAME}.`
              : `Welcome back to ${APP_NAME}.`}
          </CardDescription>
        </div>
      </CardHeader>
      <form onSubmit={onSubmit} className="flex flex-col gap-(--card-spacing)">
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button className="w-full" type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          <Button
            className="w-full"
            type="button"
            variant="outline"
            disabled={pending}
            onClick={async () => {
              setError(null);
              setPending(true);
              const { error: oauthError } = await signIn.social({
                provider: "google",
                callbackURL: mcpAuthorizePath ?? nextPath,
              });
              setPending(false);
              if (oauthError) {
                setError(
                  oauthError.message ??
                    "Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
                );
              }
            }}
          >
            Continue with Google
          </Button>
          <p className="text-sm text-muted-foreground">
            No account?{" "}
            <Link className="underline underline-offset-4" href="/sign-up">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function SignInPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16">
      <AuthAmbientBackground />
      <Suspense
        fallback={
          <Card className="relative flex w-full max-w-md items-center justify-center py-16 shadow-xl">
            <Spinner className="size-6" />
          </Card>
        }
      >
        <SignInForm />
      </Suspense>
    </main>
  );
}
