"use client";

import Link from "next/link";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReactNode } from "react";

import { splitCommentText } from "@/features/agent/mentions";
import type { CommentMention } from "@/db/schema/workout-schema";
import { cn } from "@/shared/utils";

function MentionText({
  text,
  mentions,
}: {
  text: string;
  mentions: CommentMention[];
}) {
  const parts = splitCommentText(text, mentions);
  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={index}>{part.value}</span>;
        }
        if (part.kind === "agent") {
          return (
            <span
              key={index}
              className="bg-primary/10 text-primary rounded px-1 py-0.5 font-medium"
            >
              @agent
            </span>
          );
        }
        return (
          <Link
            key={index}
            href={`/u/${part.username}`}
            className="bg-primary/10 text-primary rounded px-1 py-0.5 font-medium hover:underline"
          >
            @{part.username}
          </Link>
        );
      })}
    </>
  );
}

function withMentions(node: ReactNode, mentions: CommentMention[]): ReactNode {
  if (typeof node === "string") {
    return <MentionText text={node} mentions={mentions} />;
  }
  if (Array.isArray(node)) {
    return node.map((child, index) => (
      <span key={index}>{withMentions(child, mentions)}</span>
    ));
  }
  return node;
}

export function CommentMarkdown({
  text,
  mentions = [],
  className,
}: {
  text: string;
  mentions?: CommentMention[] | null;
  className?: string;
}) {
  const mentionList = mentions ?? [];

  const components: Components = {
    p: ({ children }) => (
      <p className="my-0 leading-6">{withMentions(children, mentionList)}</p>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => (
      <ul className="my-1.5 list-disc space-y-0.5 pl-4">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-1.5 list-decimal space-y-0.5 pl-4">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="leading-6">{withMentions(children, mentionList)}</li>
    ),
    a: ({ href, children }) => {
      const url = href ?? "";
      const internal = url.startsWith("/");
      if (internal) {
        return (
          <Link href={url} className="text-primary font-medium underline-offset-2 hover:underline">
            {children}
          </Link>
        );
      }
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-primary font-medium underline-offset-2 hover:underline"
        >
          {children}
        </a>
      );
    },
    code: ({ children, className: codeClass }) => {
      const block = Boolean(codeClass);
      if (block) {
        return (
          <code className="bg-muted block overflow-x-auto rounded-lg px-2.5 py-2 text-[12px] leading-5">
            {children}
          </code>
        );
      }
      return (
        <code className="bg-muted rounded px-1 py-0.5 text-[12.5px]">
          {children}
        </code>
      );
    },
    pre: ({ children }) => <pre className="my-2 overflow-x-auto">{children}</pre>,
    h1: ({ children }) => (
      <p className="my-1.5 font-semibold leading-6">{children}</p>
    ),
    h2: ({ children }) => (
      <p className="my-1.5 font-semibold leading-6">{children}</p>
    ),
    h3: ({ children }) => (
      <p className="my-1 font-medium leading-6">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-foreground/15 text-muted-foreground my-1.5 border-l-2 pl-3">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="border-foreground/10 my-2" />,
  };

  return (
    <div
      className={cn(
        "mt-1 space-y-1.5 text-sm leading-6 wrap-break-word [&_:first-child]:mt-0 [&_:last-child]:mb-0",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
