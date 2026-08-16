"use client";

import { IconCheck, IconCopy, IconSparkles } from "@/components/ui/icons";
import { useState } from "react";

import { AppShellBody, AppShellHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PERFORMANCE_REPORT_SKILL_MD } from "@/features/skills/performance-report-skill";

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
              Recaps yesterday’s training with volume, PRs, and session notes,
              plus how this week compares to last week.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-3">
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
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
