"use client";

import { IconBrain, IconSend } from "@/components/ui/icons";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AppShellBody, AppShellHeader } from "@/components/layout/app-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useGeminiKeyStatus } from "@/features/agent/hooks";
import { cn } from "@/shared/utils";

function messageText(parts: { type: string; text?: string }[]) {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function TrainerChat() {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent/chat",
      }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const pending = status === "submitted" || status === "streaming";
  const trimmed = input.trim();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2">
        {messages.length === 0 ? (
          <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
            <Avatar className="size-12">
              <AvatarFallback className="bg-primary/15 text-primary">
                <IconBrain className="size-6" />
              </AvatarFallback>
            </Avatar>
            <p className="text-foreground text-sm font-medium">
              Fitness Trainer Agent
            </p>
            <p className="max-w-sm text-sm leading-5">
              Ask for form cues, warm-up ideas, regressions, or video demos.
              Mention @agent on an exercise comment for lift-specific help.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((message) => {
              const text = messageText(message.parts);
              const isUser = message.role === "user";
              return (
                <li
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    isUser ? "justify-end" : "justify-start",
                  )}
                >
                  {!isUser ? (
                    <Avatar className="mt-0.5 shrink-0">
                      <AvatarFallback className="bg-primary/15 text-primary">
                        <IconBrain className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                  ) : null}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 whitespace-pre-wrap wrap-break-word",
                      isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 ring-1 ring-foreground/5",
                    )}
                  >
                    {text || (pending && !isUser ? <Spinner className="size-3.5" /> : null)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form
        className="shrink-0"
        onSubmit={(event) => {
          event.preventDefault();
          if (!trimmed || pending) return;
          void sendMessage({ text: trimmed });
          setInput("");
        }}
      >
        <div className="relative">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey) return;
              if (event.nativeEvent.isComposing) return;
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }}
            placeholder="Ask your trainer…"
            disabled={pending}
            rows={2}
            maxLength={4000}
            className="min-h-18 bg-muted/60 pr-12 pb-9 md:text-sm"
          />
          <Button
            type="submit"
            size="icon-sm"
            disabled={!trimmed || pending}
            className="absolute right-2 bottom-2 size-8 rounded-full"
            aria-label="Send message"
          >
            {pending ? (
              <Spinner className="size-3.5" />
            ) : (
              <IconSend className="size-3.5" />
            )}
          </Button>
        </div>
        {error ? (
          <p className="text-destructive mt-1.5 text-xs" role="alert">
            {error.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}

export function AgentPageClient() {
  const geminiKey = useGeminiKeyStatus();

  return (
    <>
      <AppShellHeader title="Trainer" />
      <AppShellBody className="flex min-h-0 flex-1 flex-col p-4 md:p-6">
        {geminiKey.isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="size-5" />
          </div>
        ) : geminiKey.data?.configured ? (
          <TrainerChat />
        ) : (
          <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 text-center">
            <Avatar className="size-14">
              <AvatarFallback className="bg-primary/15 text-primary">
                <IconBrain className="size-7" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold tracking-tight">
                Add a Gemini key to unlock Trainer
              </h2>
              <p className="text-muted-foreground text-sm leading-6">
                The Fitness Trainer Agent uses your own Gemini API key. Paste it
                once in Integrations — it is encrypted and never shown again.
              </p>
            </div>
            <Link
              className={cn(buttonVariants())}
              href="/integrations"
            >
              Open Integrations
            </Link>
          </div>
        )}
      </AppShellBody>
    </>
  );
}
