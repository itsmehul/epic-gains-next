"use client";

import Link from "next/link";

import { AppShellHeader } from "@/components/layout/app-shell";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/shared/utils";

type DashboardPageClientProps = {
  userName: string;
};

export function DashboardPageClient({ userName }: DashboardPageClientProps) {
  return (
    <>
      <AppShellHeader title="Dashboard" />
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {userName}</CardTitle>
            <CardDescription>
              Auth, Drizzle, app shell, and pg-workflows are wired. Data goes
              through API routes + TanStack Query — no server actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link
              className={cn(buttonVariants({ variant: "default" }))}
              href="/workflows"
            >
              Open workflows
            </Link>
            <Link
              className={cn(buttonVariants({ variant: "outline" }))}
              href="/workouts"
            >
              Workouts
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
