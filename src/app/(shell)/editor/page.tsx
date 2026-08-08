"use client";

import { useState } from "react";

import { AppShellHeader } from "@/components/layout/app-shell";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function EditorPage() {
  const [value, setValue] = useState(
    "# Notes\n\nUse Lexical markdown editing in your apps.",
  );

  return (
    <>
      <AppShellHeader title="Editor" />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Lexical markdown editor</CardTitle>
            <CardDescription>
              Reference rich-text surface included in the scaffold.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MarkdownEditor
              value={value}
              onChange={setValue}
              placeholder="Write markdown…"
              className="min-h-64 rounded-xl border p-4"
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
