"use client";

import {
  IconBrain,
  IconMessage2,
  IconSend,
} from "@/components/ui/icons";
import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useGeminiKeyStatus } from "@/features/agent/hooks";
import {
  commentMentionsAgent,
  splitCommentText,
} from "@/features/agent/mentions";
import {
  commentKeys,
  useComments,
  useCreateComment,
} from "@/features/comments/hooks";
import type { Comment } from "@/features/comments/types";
import { useFollowing, useMeSocial } from "@/features/social/hooks";
import type { SocialUser } from "@/features/social/types";
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

function AgentAvatar() {
  return (
    <Avatar className="shrink-0">
      <AvatarFallback className="bg-primary/15 text-primary">
        <IconBrain className="size-4" />
      </AvatarFallback>
    </Avatar>
  );
}

function CommentBody({ comment }: { comment: Comment }) {
  const parts = splitCommentText(comment.text, comment.mentions);
  return (
    <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm leading-6">
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
    </p>
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
  const isAgent = comment.role === "agent";
  const profileHref = `/u/${comment.author.username}`;
  const displayName = isAgent ? "Fitness Trainer Agent" : comment.author.name;
  const displayHandle = isAgent ? "@agent" : `@${comment.author.username}`;

  return (
    <li className="flex gap-3">
      {isAgent ? (
        <div className="mt-0.5 shrink-0">
          <AgentAvatar />
        </div>
      ) : linkAuthor ? (
        <Link href={profileHref} className="mt-0.5 shrink-0">
          <UserAvatar name={comment.author.name} image={comment.author.image} />
        </Link>
      ) : (
        <div className="mt-0.5 shrink-0">
          <UserAvatar name={comment.author.name} image={comment.author.image} />
        </div>
      )}
      <div
        className={cn(
          "min-w-0 flex-1 rounded-2xl px-3.5 py-2.5 ring-1",
          isAgent
            ? "bg-primary/5 ring-primary/15"
            : "bg-muted/50 ring-foreground/5",
        )}
      >
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-[13px] leading-5">
          {isAgent || !linkAuthor ? (
            <span className="text-foreground truncate font-medium">
              {displayName}
            </span>
          ) : (
            <Link
              href={profileHref}
              className="text-foreground truncate font-medium hover:underline"
            >
              {displayName}
            </Link>
          )}
          {isAgent || !linkAuthor ? (
            <span className="text-muted-foreground truncate">{displayHandle}</span>
          ) : (
            <Link href={profileHref} className="text-muted-foreground truncate">
              {displayHandle}
            </Link>
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
        {isAgent ? (
          <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm leading-6">
            {comment.text}
          </p>
        ) : (
          <CommentBody comment={comment} />
        )}
      </div>
    </li>
  );
}

function StreamingAgentRow({ text }: { text: string }) {
  return (
    <li className="flex gap-3">
      <div className="mt-0.5 shrink-0">
        <AgentAvatar />
      </div>
      <div className="bg-primary/5 min-w-0 flex-1 rounded-2xl px-3.5 py-2.5 ring-1 ring-primary/15">
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-[13px] leading-5">
          <span className="text-foreground truncate font-medium">
            Fitness Trainer Agent
          </span>
          <span className="text-muted-foreground truncate">@agent</span>
          <span className="text-muted-foreground/40" aria-hidden>
            ·
          </span>
          <span className="text-muted-foreground shrink-0">typing…</span>
        </p>
        <p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm leading-6">
          {text || <Spinner className="size-3.5" />}
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

type MentionOption =
  | { kind: "agent"; label: string; handle: string }
  | { kind: "user"; user: SocialUser; handle: string };

function MentionMenu({
  options,
  activeIndex,
  onSelect,
}: {
  options: MentionOption[];
  activeIndex: number;
  onSelect: (option: MentionOption) => void;
}) {
  if (options.length === 0) return null;
  return (
    <ul
      className="bg-popover absolute bottom-full left-0 z-20 mb-2 max-h-48 w-full overflow-y-auto rounded-xl border border-border/70 py-1 shadow-lg"
      role="listbox"
    >
      {options.map((option, index) => (
        <li key={option.handle}>
          <button
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
              index === activeIndex
                ? "bg-muted text-foreground"
                : "hover:bg-muted/70",
            )}
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(option);
            }}
          >
            {option.kind === "agent" ? (
              <>
                <AgentAvatar />
                <span className="min-w-0">
                  <span className="block font-medium">{option.label}</span>
                  <span className="text-muted-foreground text-xs">@agent</span>
                </span>
              </>
            ) : (
              <>
                <UserAvatar
                  name={option.user.name}
                  image={option.user.image}
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {option.user.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    @{option.user.username}
                  </span>
                </span>
              </>
            )}
          </button>
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
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [activeMention, setActiveMention] = useState(0);
  const [agentError, setAgentError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCommentIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  const commentsQuery = useComments({
    exerciseId,
    workoutId,
    enabled: itemsProp == null && Boolean(exerciseId),
  });
  const createComment = useCreateComment();
  const me = useMeSocial();
  const following = useFollowing(me.data?.username ?? "");
  const geminiKey = useGeminiKeyStatus();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent/chat",
        body: () => ({
          exerciseId,
          workoutId: workoutId ?? null,
          commentId: pendingCommentIdRef.current,
        }),
      }),
    [exerciseId, workoutId],
  );

  const {
    messages: agentMessages,
    sendMessage,
    status: agentStatus,
    setMessages: setAgentMessages,
    error: chatError,
  } = useChat({
    transport,
    onFinish: () => {
      pendingCommentIdRef.current = null;
      void queryClient.invalidateQueries({ queryKey: commentKeys.all });
      setAgentMessages([]);
    },
  });

  const items = itemsProp ?? commentsQuery.data?.items ?? [];
  const newestFirst = items.toReversed();
  const streaming =
    agentStatus === "submitted" || agentStatus === "streaming";
  const streamingText = agentMessages
    .filter((m) => m.role === "assistant")
    .flatMap((m) =>
      m.parts.filter(
        (p): p is { type: "text"; text: string } => p.type === "text",
      ),
    )
    .map((p) => p.text)
    .join("");

  const pending = createComment.isPending || streaming;
  const trimmed = text.trim();
  const isLoading = itemsProp == null && commentsQuery.isLoading;
  const isError = itemsProp == null && commentsQuery.isError;

  const mentionOptions = useMemo((): MentionOption[] => {
    if (mentionQuery == null) return [];
    const q = mentionQuery.toLowerCase();
    const options: MentionOption[] = [];

    if ("agent".startsWith(q) || "fitness".startsWith(q) || "trainer".startsWith(q)) {
      options.push({
        kind: "agent",
        label: geminiKey.data?.configured
          ? "Fitness Trainer Agent"
          : "Fitness Trainer Agent (add Gemini key)",
        handle: "agent",
      });
    }

    for (const user of following.data?.items ?? []) {
      const username = user.username.toLowerCase();
      const name = user.name.toLowerCase();
      if (!q || username.startsWith(q) || name.includes(q)) {
        options.push({ kind: "user", user, handle: user.username });
      }
    }

    return options.slice(0, 8);
  }, [mentionQuery, following.data?.items, geminiKey.data?.configured]);

  useEffect(() => {
    setActiveMention(0);
  }, [mentionQuery]);

  function updateMentionState(value: string, cursor: number) {
    const before = value.slice(0, cursor);
    const match = before.match(/(^|[\s([{])@([a-zA-Z0-9_]*)$/);
    if (!match) {
      setMentionQuery(null);
      return;
    }
    setMentionQuery(match[2] ?? "");
  }

  function insertMention(option: MentionOption) {
    const el = textareaRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? text.length;
    const before = text.slice(0, cursor);
    const after = text.slice(cursor);
    const match = before.match(/(^|[\s([{])@([a-zA-Z0-9_]*)$/);
    if (!match || match.index == null) return;
    const start = match.index + match[1]!.length;
    const next = `${text.slice(0, start)}@${option.handle} ${after}`;
    setText(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const pos = start + option.handle.length + 2;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!trimmed || pending) return;
    setAgentError(null);
    setMentionQuery(null);
    try {
      const created = await createComment.mutateAsync({
        exerciseId,
        workoutId: workoutId ?? null,
        text: trimmed,
      });
      setText("");
      listRef.current?.scrollTo({ top: 0, behavior: "smooth" });

      if (commentMentionsAgent(created.mentions)) {
        if (!geminiKey.data?.configured) {
          setAgentError(
            "Add a Gemini API key in Integrations to get a trainer reply.",
          );
          return;
        }
        pendingCommentIdRef.current = created.id;
        setAgentMessages([]);
        await sendMessage({ text: trimmed });
      }
    } catch {
      // error shown below from mutation / chat
    }
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery != null && mentionOptions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveMention((i) => (i + 1) % mentionOptions.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveMention(
          (i) => (i - 1 + mentionOptions.length) % mentionOptions.length,
        );
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const option = mentionOptions[activeMention];
        if (option) insertMention(option);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  const empty =
    newestFirst.length === 0 && !streaming;

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
        ) : empty ? (
          <div className="text-muted-foreground flex flex-col items-center gap-1.5 py-6 text-center">
            <IconMessage2
              className="text-muted-foreground/50 size-5"
              stroke={1.5}
            />
            <p className="text-foreground text-sm font-medium">No notes yet</p>
            {readOnly ? null : (
              <p className="max-w-64 text-sm leading-5">
                Add a cue, a form reminder, or how this lift felt today. Try
                @agent for tips.
              </p>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {streaming ? <StreamingAgentRow text={streamingText} /> : null}
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
            {mentionQuery != null ? (
              <MentionMenu
                options={mentionOptions}
                activeIndex={activeMention}
                onSelect={(option) => {
                  if (
                    option.kind === "agent" &&
                    !geminiKey.data?.configured
                  ) {
                    setAgentError(
                      "Add a Gemini API key in Integrations to mention @agent.",
                    );
                    setMentionQuery(null);
                    return;
                  }
                  insertMention(option);
                }}
              />
            ) : null}
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => {
                const value = event.target.value;
                setText(value);
                updateMentionState(value, event.target.selectionStart);
              }}
              onKeyDown={onComposerKeyDown}
              onClick={(event) => {
                updateMentionState(
                  event.currentTarget.value,
                  event.currentTarget.selectionStart,
                );
              }}
              placeholder="Leave a cue… or @agent / @friend"
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
            Enter to send · Shift+Enter for a new line · @ to mention
          </p>
          {createComment.isError ? (
            <p className="text-destructive mt-1.5 text-xs" role="alert">
              {createComment.error instanceof Error
                ? createComment.error.message
                : "Failed to post comment"}
            </p>
          ) : null}
          {agentError || chatError ? (
            <p className="text-destructive mt-1.5 text-xs" role="alert">
              {agentError ??
                (chatError instanceof Error
                  ? chatError.message
                  : "Trainer reply failed")}{" "}
              <Link href="/integrations" className="underline underline-offset-2">
                Open Integrations
              </Link>
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
