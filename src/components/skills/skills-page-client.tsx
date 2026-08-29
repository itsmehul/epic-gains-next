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
import { IMPORT_FOLLOW_ALONG_SKILL_MD } from "@/features/skills/import-follow-along-skill";
import { PERFORMANCE_REPORT_SKILL_MD } from "@/features/skills/performance-report-skill";

const SKILLS = [
  {
    id: "import",
    title: "Import follow-along",
    description:
      "Turns a YouTube class into one timed workout. Call get_youtube_import_prompt, apply that prompt to the video, then feed the extracted JSON to import_full_workout.",
    markdown: IMPORT_FOLLOW_ALONG_SKILL_MD,
  },
  {
    id: "performance",
    title: "Performance summary",
    description:
      "Recaps yesterday’s training with volume, PRs, and session notes, plus how this week compares to last week.",
    markdown: PERFORMANCE_REPORT_SKILL_MD,
  },
] as const;

export function SkillsPageClient() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCopy(id: string, markdown: string) {
    setError(null);
    try {
      await navigator.clipboard.writeText(markdown);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  return (
    <>
      <AppShellHeader title="Skills" />
      <AppShellBody className="gap-6 p-4 md:p-6">
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        {SKILLS.map((skill) => {
          const copied = copiedId === skill.id;
          return (
            <Card key={skill.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconSparkles className="size-5" />
                  {skill.title}
                </CardTitle>
                <CardDescription>{skill.description}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  onClick={() => void handleCopy(skill.id, skill.markdown)}
                  type="button"
                >
                  {copied ? (
                    <IconCheck className="size-4" />
                  ) : (
                    <IconCopy className="size-4" />
                  )}
                  {copied ? "Copied" : "Copy skill"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </AppShellBody>
    </>
  );
}
