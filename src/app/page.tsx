import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/shared/utils";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-16">
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Scaffold</p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Start apps with auth, shell, and workflows already wired.
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Better Auth, shadcn app shell, Drizzle + Postgres, pg-workflows, AI
          SDK, and TanStack Query over API routes.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link className={cn(buttonVariants())} href="/sign-in">
          Sign in
        </Link>
        <Link
          className={cn(buttonVariants({ variant: "outline" }))}
          href="/sign-up"
        >
          Create account
        </Link>
      </div>
    </main>
  );
}
