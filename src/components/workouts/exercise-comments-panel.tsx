"use client";

import { IconMessage2, IconSend } from "@tabler/icons-react";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useComments, useCreateComment } from "@/features/comments/hooks";
import type { Comment } from "@/features/comments/types";
import { cn } from "@/shared/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatRelativeTime(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;

  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function UserAvatar({
  name,
  image,
}: {
  name: string;
  image?: string | null;
}) {
  return (
    <Avatar className="shrink-0">
      {image ? <AvatarImage alt="" src={image} /> : null}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

function CommentRow({
  comment,
  linkAuthor = true,
}: {
  comment: Comment;
  linkAuthor?: boolean;
}) {
  const when = comment.createdAt ? formatRelativeTime(comment.createdAt) : "";
  const profileHref = `/u/${comment.author.username}`;

  return (
    <li className="flex gap-3">
      {linkAuthor ? (
        <Link href={profileHref} className="mt-0.5 shrink-0">
          <UserAvatar name={comment.author.name} image={comment.author.image} />
        </Link>
      ) : (
        <div className="mt-0.5 shrink-0">
          <UserAvatar name={comment.author.name} image={comment.author.image} />
        </div>
      )}
      <div className="min-w-0 flex-1 rounded-2xl bg-muted/50 px-3.5 py-2.5 ring-1 ring-foreground/5">
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-[13px] leading-5">
          {linkAuthor ? (
            <Link
              href={profileHref}
              className="text-foreground truncate font-medium hover:underline"
            >
              {comment.author.name}
            </Link>
          ) : (
            <span className="text-foreground truncate font-medium">
              {comment.author.name}
            </span>
          )}
          {linkAuthor ? (
            <Link href={profileHref} className="text-muted-foreground truncate">
              @{comment.author.username}
            </Link>
          ) : (
            <span className="text-muted-foreground truncate">
              @{comment.author.username}
            </span>
          )}
          {when ? (
            <>
              <span className="text-muted-foreground/40" aria-hidden>
                ·
              </span>
              <time
                className="text-muted-foreground shrink-0 tabular-nums"
                dateTime={new Date(comment.createdAt).toISOString()}
              >
                {when}
              </time>
            </>
          ) : null}
        </p>
        <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm leading-6">
          {comment.text}
        </p>
      </div>
    </li>
  );
}

function CommentsSkeleton() {
  return (
    <ul className="flex flex-col gap-3" aria-hidden>
      {[0, 1, 2].map((index) => (
        <li key={index} className="flex gap-3">
          <div className="bg-muted size-8 shrink-0 animate-pulse rounded-full" />
          <div
            className={cn(
              "bg-muted/70 min-h-16 flex-1 animate-pulse rounded-2xl",
              index === 1 && "min-h-24",
              index === 2 && "min-h-12",
            )}
          />
        </li>
      ))}
    </ul>
  );
}

export function ExerciseCommentsPanel({
  exerciseId,
  workoutId,
  items: itemsProp,
  readOnly = false,
}: {
  exerciseId: string;
  workoutId?: string;
  items?: Comment[];
  readOnly?: boolean;
}) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const commentsQuery = useComments({
    exerciseId,
    workoutId,
    enabled: itemsProp == null && Boolean(exerciseId),
  });
  const createComment = useCreateComment();

  const items = itemsProp ?? commentsQuery.data?.items ?? [];
  const newestFirst = items.toReversed();
  const pending = createComment.isPending;
  const trimmed = text.trim();
  const isLoading = itemsProp == null && commentsQuery.isLoading;
  const isError = itemsProp == null && commentsQuery.isError;

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
      listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // error shown below from mutation
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 md:px-0">
      <div ref={listRef}>
        {isLoading ? (
          <CommentsSkeleton />
        ) : isError ? (
          <p className="text-destructive py-8 text-center text-sm" role="alert">
            {commentsQuery.error instanceof Error
              ? commentsQuery.error.message
              : "Failed to load comments"}
          </p>
        ) : newestFirst.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-1.5 py-6 text-center">
            <IconMessage2
              className="text-muted-foreground/50 size-5"
              stroke={1.5}
            />
            <p className="text-foreground text-sm font-medium">No notes yet</p>
            {readOnly ? null : (
              <p className="max-w-64 text-sm leading-5">
                Add a cue, a form reminder, or how this lift felt today.
              </p>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {newestFirst.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                linkAuthor={!readOnly}
              />
            ))}
          </ul>
        )}
      </div>

      {readOnly ? null : (
      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <div className="relative">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey) return;
              if (event.nativeEvent.isComposing) return;
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }}
            placeholder="Leave a cue, form note, or how this felt…"
            disabled={pending}
            rows={2}
            maxLength={2000}
            aria-invalid={createComment.isError || undefined}
            className="min-h-18 bg-muted/60 pr-12 pb-9 md:text-sm"
          />
          <Button
            type="submit"
            size="icon-sm"
            disabled={!trimmed || pending}
            className="absolute right-2 bottom-2 size-8 rounded-full"
            aria-label="Post comment"
          >
            {pending ? (
              <Spinner className="size-3.5" />
            ) : (
              <IconSend className="size-3.5" />
            )}
          </Button>
        </div>
        <p className="text-muted-foreground mt-1.5 text-[11px] leading-4">
          Enter to send · Shift+Enter for a new line
        </p>
        {createComment.isError ? (
          <p className="text-destructive mt-1.5 text-xs" role="alert">
            {createComment.error instanceof Error
              ? createComment.error.message
              : "Failed to post comment"}
          </p>
        ) : null}
      </form>
      )}
    </div>
  );
}
