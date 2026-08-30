"use client";

import { IconCheck, IconCopy, IconSparkles } from "@/components/ui/icons";
import { useState } from "react";

import {
  AppShellBody,
  AppShellHeader,
  AppShellScroll,
} from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { INSTALLABLE_SKILLS } from "@/features/skills/catalog";

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
    <AppShellScroll>
      <AppShellHeader title="Skills" />
      <AppShellBody className="gap-6 p-4 md:p-6">
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        {INSTALLABLE_SKILLS.map((skill) => {
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
    </AppShellScroll>
  );
}
