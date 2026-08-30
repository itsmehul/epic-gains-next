"use client";

import Link from "next/link";
import { IconPlugConnected } from "@/components/ui/icons";

import { GeminiKeyCard } from "@/components/integrations/gemini-key-card";
import { AppShellBody, AppShellHeader } from "@/components/layout/app-shell";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/shared/utils";

export default function IntegrationsPage() {
  return (
    <>
      <AppShellHeader title="Integrations" />
      <AppShellBody className="gap-6 p-4 md:p-6">
        <GeminiKeyCard />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconPlugConnected className="size-5" />
              MCP
            </CardTitle>
            <CardDescription>
              Connect Claude Code, Gemini Spark, and other agents to create
              workouts, manage the exercise catalog, and associate exercises to
              workouts via OAuth or API keys.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link
              className={cn(buttonVariants())}
              href="/integrations/mcp"
            >
              Manage MCP
            </Link>
          </CardFooter>
        </Card>
      </AppShellBody>
    </>
  );
}
