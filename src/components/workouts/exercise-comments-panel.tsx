"use client";

import { IconLoader2, IconSend } from "@tabler/icons-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useComments, useCreateComment } from "@/features/comments/hooks";
import type { Comment } from "@/features/comments/types";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatWhen(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function CommentRow({ comment }: { comment: Comment }) {
  return (
    <li className="flex gap-2.5 py-2.5">
      <Link href={`/u/${comment.author.username}`} className="shrink-0 pt-0.5">
        <Avatar size="sm">
          {comment.author.image ? (
            <AvatarImage alt="" src={comment.author.image} />
          ) : null}
          <AvatarFallback>{initials(comment.author.name)}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <Link
            href={`/u/${comment.author.username}`}
            className="font-medium hover:underline"
          >
            {comment.author.name}
          </Link>
          <span className="text-muted-foreground text-xs">
            @{comment.author.username}
            {comment.createdAt ? ` · ${formatWhen(comment.createdAt)}` : null}
          </span>
        </p>
        <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">
          {comment.text}
        </p>
      </div>
    </li>
  );
}

export function ExerciseCommentsPanel({
  exerciseId,
  workoutId,
}: {
  exerciseId: string;
  workoutId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const commentsQuery = useComments({
    exerciseId,
    workoutId,
    enabled: open,
  });
  const createComment = useCreateComment();

  const items = commentsQuery.data?.items ?? [];
  const pending = createComment.isPending;
  const trimmed = text.trim();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!trimmed || pending) return;
    try {
      await createComment.mutateAsync({
        exerciseId,
        workoutId: workoutId ?? null,
        text: trimmed,
      });
      setText("");
    } catch {
      // error shown below from mutation
    }
  }

  return (
    <Accordion
      className="rounded-none border-0"
      value={open ? ["comments"] : []}
      onValueChange={(next) => {
        setOpen(next.includes("comments"));
      }}
    >
      <AccordionItem value="comments" className="border-0 data-open:bg-transparent">
        <AccordionTrigger className="hover:no-underline px-4 py-2 md:px-0">
          <span className="flex min-w-0 flex-col items-start gap-0.5">
            <span className="text-sm font-medium">Comments</span>
            <span className="text-muted-foreground text-xs font-normal">
              {open
                ? items.length === 1
                  ? "1 comment"
                  : `${items.length} comments`
                : "Notes from you and others"}
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-3 md:px-0 [&_a]:no-underline">
          {commentsQuery.isLoading ? (
            <p className="text-muted-foreground py-2 text-sm">
              Loading comments…
            </p>
          ) : commentsQuery.isError ? (
            <p className="text-destructive py-2 text-sm" role="alert">
              {commentsQuery.error instanceof Error
                ? commentsQuery.error.message
                : "Failed to load comments"}
            </p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground py-2 text-sm">
              No comments yet.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {items.map((comment) => (
                <CommentRow key={comment.id} comment={comment} />
              ))}
            </ul>
          )}

          <form className="flex flex-col gap-2 pt-2" onSubmit={handleSubmit}>
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Add a comment"
              disabled={pending}
              rows={2}
              className="min-h-12 rounded-xl py-2"
              maxLength={2000}
            />
            <div className="flex items-center justify-end gap-2">
              {createComment.isError ? (
                <p className="text-destructive mr-auto text-xs" role="alert">
                  {createComment.error instanceof Error
                    ? createComment.error.message
                    : "Failed to post comment"}
                </p>
              ) : null}
              <Button type="submit" size="sm" disabled={!trimmed || pending}>
                {pending ? (
                  <IconLoader2 className="size-3.5 animate-spin" />
                ) : (
                  <IconSend className="size-3.5" />
                )}
                Post
              </Button>
            </div>
          </form>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
