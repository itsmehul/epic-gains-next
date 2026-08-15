"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthAmbientBackground } from "@/components/auth/auth-ambient-background";
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
import { signUp } from "@/infrastructure/auth/client";
import { APP_NAME, BRAND_ICON } from "@/shared/pwa/constants";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const { error: signUpError } = await signUp.email({
      name,
      email,
      password,
    });

    setPending(false);

    if (signUpError) {
      setError(signUpError.message ?? "Unable to sign up");
      return;
    }

    router.push("/workouts");
    router.refresh();
  }

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16">
      <AuthAmbientBackground />
      <Card className="relative w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2.5">
            <Image
              src={BRAND_ICON}
              alt=""
              width={32}
              height={32}
              className="size-8"
              aria-hidden
            />
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-primary">
              {APP_NAME}
            </p>
          </div>
          <div className="space-y-1.5">
            <CardTitle>Create account</CardTitle>
            <CardDescription>
              Get started with {APP_NAME}.
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-(--card-spacing)">
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
              />
            </div>
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
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button className="w-full" type="submit" disabled={pending}>
              {pending ? "Creating account…" : "Sign up"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link className="underline underline-offset-4" href="/sign-in">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
