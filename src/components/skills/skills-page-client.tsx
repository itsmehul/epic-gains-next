"use client";

import { IconCheck, IconCopy, IconSparkles } from "@tabler/icons-react";
import { useState } from "react";

import { AppShellBody, AppShellHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PERFORMANCE_REPORT_SKILL_FILENAME,
  PERFORMANCE_REPORT_SKILL_INSTALL_PATH,
  PERFORMANCE_REPORT_SKILL_MD,
  PERFORMANCE_REPORT_SKILL_NAME,
  PERFORMANCE_REPORT_SKILL_TRIGGER,
} from "@/features/skills/performance-report-skill";

export function SkillsPageClient() {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCopy() {
    setError(null);
    try {
      await navigator.clipboard.writeText(PERFORMANCE_REPORT_SKILL_MD);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  return (
    <>
      <AppShellHeader title="Skills" />
      <AppShellBody className="gap-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconSparkles className="size-5" />
              Performance report
            </CardTitle>
            <CardDescription>
              Cursor skill that recaps yesterday’s training from Epic Gains{" "}
              <code className="font-mono text-xs">performance_metrics</code>
              , including volume, PRs, and session comments.
              Copy and save as{" "}
              <code className="font-mono text-xs">
                {PERFORMANCE_REPORT_SKILL_INSTALL_PATH}
              </code>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Trigger in Cursor:{" "}
              <span className="text-foreground">
                {PERFORMANCE_REPORT_SKILL_TRIGGER}
              </span>
            </p>
            <p className="text-muted-foreground text-sm">
              Skill id{" "}
              <code className="font-mono text-xs">
                {PERFORMANCE_REPORT_SKILL_NAME}
              </code>
              . File name{" "}
              <code className="font-mono text-xs">
                {PERFORMANCE_REPORT_SKILL_FILENAME}
              </code>
              .
            </p>
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button onClick={() => void handleCopy()} type="button">
              {copied ? (
                <IconCheck className="size-4" />
              ) : (
                <IconCopy className="size-4" />
              )}
              {copied ? "Copied" : "Copy skill"}
            </Button>
          </CardFooter>
        </Card>
      </AppShellBody>
    </>
  );
}
