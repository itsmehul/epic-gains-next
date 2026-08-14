"use client";

import { IconSend, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Drawer } from "vaul";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useComments, useCreateComment } from "@/features/comments/hooks";
import type { Comment } from "@/features/comments/types";
import { useSession } from "@/infrastructure/auth/client";
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
  size = "default",
}: {
  name: string;
  image?: string | null;
  size?: "default" | "sm";
}) {
  return (
    <Avatar size={size} className="shrink-0">
      {image ? <AvatarImage alt="" src={image} /> : null}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

function CommentRow({ comment }: { comment: Comment }) {
  const when = comment.createdAt ? formatRelativeTime(comment.createdAt) : "";

  return (
    <li className="flex gap-3 px-4 py-3">
      <Link href={`/u/${comment.author.username}`} className="shrink-0">
        <UserAvatar name={comment.author.name} image={comment.author.image} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-1.5 text-[13px] leading-5">
          <Link
            href={`/u/${comment.author.username}`}
            className="text-muted-foreground hover:text-foreground truncate font-medium"
          >
            @{comment.author.username}
          </Link>
          {when ? (
            <>
              <span className="text-muted-foreground/50" aria-hidden>
                ·
              </span>
              <span className="text-muted-foreground/80 shrink-0">{when}</span>
            </>
          ) : null}
        </p>
        <p className="mt-0.5 whitespace-pre-wrap wrap-break-word text-sm leading-5">
          {comment.text}
        </p>
      </div>
    </li>
  );
}

function CommentsTeaser({
  count,
  latest,
  isLoading,
}: {
  count: number;
  latest: Comment | null;
  isLoading: boolean;
}) {
  return (
    <span className="flex w-full flex-col gap-2">
      <span className="flex items-baseline gap-1.5">
        <span className="text-[15px] font-semibold">Comments</span>
        {isLoading ? null : (
          <span className="text-muted-foreground text-sm font-normal tabular-nums">
            {count}
          </span>
        )}
      </span>
      {latest ? (
        <span className="flex min-w-0 items-center gap-2">
          <UserAvatar
            name={latest.author.name}
            image={latest.author.image}
            size="sm"
          />
          <span className="min-w-0 flex-1 truncate text-sm leading-5">
            {latest.text}
          </span>
        </span>
      ) : (
        <span className="text-muted-foreground text-sm font-normal">
          {isLoading ? "Loading…" : "Add a comment"}
        </span>
      )}
    </span>
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
  const listRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const commentsQuery = useComments({ exerciseId, workoutId });
  const createComment = useCreateComment();

  const items = commentsQuery.data?.items ?? [];
  const newestFirst = items.toReversed();
  const latest = items.at(-1) ?? null;
  const pending = createComment.isPending;
  const trimmed = text.trim();
  const me = session?.user;

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
    <Drawer.Root
      open={open}
      onOpenChange={setOpen}
      shouldScaleBackground={false}
      setBackgroundColorOnScale={false}
      repositionInputs
    >
      <div className="px-4 md:px-0">
        <Drawer.Trigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full flex-col rounded-xl bg-muted/70 px-3 py-2.5 text-left transition-colors",
              "hover:bg-muted active:bg-muted",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-content-panel focus-visible:outline-none",
            )}
          >
            <CommentsTeaser
              count={items.length}
              latest={latest}
              isLoading={commentsQuery.isLoading}
            />
          </button>
        </Drawer.Trigger>
      </div>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Drawer.Content
          className="bg-background fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[85dvh] w-full max-w-screen-sm flex-col overflow-hidden rounded-t-2xl outline-none"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
          }}
        >
          <Drawer.Handle className="mt-1.5 mb-0.5 flex h-5 w-full items-center justify-center bg-transparent">
            <span className="bg-muted-foreground/40 h-1 w-10 rounded-full" />
          </Drawer.Handle>

          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2">
            <Drawer.Title className="text-[17px] font-semibold tracking-tight">
              Comments
            </Drawer.Title>
            <Drawer.Description className="sr-only">
              Notes from you and others on this exercise
            </Drawer.Description>
            <Drawer.Close asChild>
              <button
                type="button"
                className="bg-muted text-foreground hover:bg-muted/80 flex size-8 items-center justify-center rounded-full transition-colors focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
                aria-label="Close comments"
              >
                <IconX className="size-4" strokeWidth={2.5} />
              </button>
            </Drawer.Close>
          </div>

          <div
            ref={listRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            {commentsQuery.isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner className="text-muted-foreground" />
              </div>
            ) : commentsQuery.isError ? (
              <p className="text-destructive px-4 py-8 text-center text-sm" role="alert">
                {commentsQuery.error instanceof Error
                  ? commentsQuery.error.message
                  : "Failed to load comments"}
              </p>
            ) : newestFirst.length === 0 ? (
              <p className="text-muted-foreground px-4 py-16 text-center text-sm">
                No comments yet. Be the first to add a note.
              </p>
            ) : (
              <ul>
                {newestFirst.map((comment) => (
                  <CommentRow key={comment.id} comment={comment} />
                ))}
              </ul>
            )}
          </div>

          <form
            data-vaul-no-drag=""
            className="bg-background shrink-0 border-t px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
          >
            <div className="flex items-start gap-2">
              <span className="mt-1 shrink-0">
                <UserAvatar
                  name={me?.name ?? "You"}
                  image={me?.image}
                  size="sm"
                />
              </span>
              <Textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.shiftKey) return;
                  if (event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }}
                placeholder="Add a comment..."
                disabled={pending}
                rows={1}
                maxLength={2000}
                className="min-h-10 rounded-3xl bg-muted py-2 md:text-[15px]"
              />
              <Button
                type="submit"
                size="icon-sm"
                disabled={!trimmed || pending}
                className="mt-0.5 size-9 shrink-0 rounded-full"
                aria-label="Post comment"
              >
                {pending ? (
                  <Spinner className="size-4" />
                ) : (
                  <IconSend className="size-4" />
                )}
              </Button>
            </div>
            {createComment.isError ? (
              <p className="text-destructive mt-1.5 pl-8 text-xs" role="alert">
                {createComment.error instanceof Error
                  ? createComment.error.message
                  : "Failed to post comment"}
              </p>
            ) : null}
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
