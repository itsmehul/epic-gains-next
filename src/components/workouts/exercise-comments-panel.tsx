"use client";

import {
  IconBrain,
  IconMessage2,
  IconReply,
  IconSend,
  IconX,
} from "@/components/ui/icons";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { CommentMarkdown } from "@/components/workouts/comment-markdown";
import { TrainerEscalationCard } from "@/components/agent/trainer-escalation-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useGeminiKeyStatus } from "@/features/agent/hooks";
import { commentMentionsAgent } from "@/features/agent/mentions";
import {
  useAgentCommentReply,
  useComments,
  useCreateComment,
  useRespondToTrainerEscalation,
} from "@/features/comments/hooks";
import { groupCommentsIntoThreads } from "@/features/comments/thread";
import type { Comment } from "@/features/comments/types";
import { useMarkNotificationsRead } from "@/features/notifications/hooks";
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
  size = "md",
}: {
  name: string;
  image?: string | null;
  size?: "sm" | "md";
}) {
  return (
    <Avatar className="shrink-0" size={size === "sm" ? "sm" : "default"}>
      {image ? <AvatarImage alt="" src={image} /> : null}
      <AvatarFallback className={size === "sm" ? "text-[10px]" : undefined}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function AgentAvatar({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <Avatar className="shrink-0" size={size === "sm" ? "sm" : "default"}>
      <AvatarFallback className="bg-primary/15 text-primary">
        <IconBrain className={size === "sm" ? "size-3.5" : "size-4"} />
      </AvatarFallback>
    </Avatar>
  );
}

function CommentRow({
  comment,
  linkAuthor = true,
  compact = false,
  canRespondToEscalation = false,
  escalationPending = false,
  onReply,
  onEscalationRespond,
}: {
  comment: Comment;
  linkAuthor?: boolean;
  compact?: boolean;
  canRespondToEscalation?: boolean;
  escalationPending?: boolean;
  onReply?: () => void;
  onEscalationRespond?: (approved: boolean) => void;
}) {
  const when = comment.createdAt ? formatRelativeTime(comment.createdAt) : "";
  const isAgent = comment.role === "agent";
  const unread = Boolean(comment.unread);
  const profileHref = `/u/${comment.author.username}`;
  const displayName = isAgent ? "Fitness Trainer Agent" : comment.author.name;
  const displayHandle = isAgent ? "@agent" : `@${comment.author.username}`;
  const avatarSize = compact ? "sm" : "md";

  return (
    <article
      className={cn(
        "flex gap-3",
        unread && "-mx-2 rounded-xl bg-primary/6 px-2 py-1.5",
      )}
    >
      {isAgent ? (
        <div className="mt-0.5 shrink-0">
          <AgentAvatar size={avatarSize} />
        </div>
      ) : linkAuthor ? (
        <Link href={profileHref} className="mt-0.5 shrink-0">
          <UserAvatar
            name={comment.author.name}
            image={comment.author.image}
            size={avatarSize}
          />
        </Link>
      ) : (
        <div className="mt-0.5 shrink-0">
          <UserAvatar
            name={comment.author.name}
            image={comment.author.image}
            size={avatarSize}
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
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
          {unread ? (
            <span
              className="bg-primary ml-0.5 size-1.5 shrink-0 rounded-full"
              title="Unread mention"
              aria-label="Unread mention"
            />
          ) : null}
        </p>
        <CommentMarkdown text={comment.text} mentions={comment.mentions} />
        {comment.trainerEscalation ? (
          <TrainerEscalationCard
            escalation={comment.trainerEscalation}
            canRespond={canRespondToEscalation}
            pending={escalationPending}
            onRespond={onEscalationRespond}
          />
        ) : null}
        {onReply ? (
          <button
            type="button"
            onClick={onReply}
            className="text-muted-foreground hover:text-foreground mt-1 inline-flex items-center gap-1 text-[12px] font-medium"
          >
            <IconReply className="size-3.5" />
            Reply
          </button>
        ) : null}
      </div>
    </article>
  );
}

function TypingAgentRow() {
  return (
    <article className="flex gap-3">
      <div className="mt-0.5 shrink-0">
        <AgentAvatar size="sm" />
      </div>
      <div className="min-w-0 flex-1">
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
        <Spinner className="mt-1 size-3.5" />
      </div>
    </article>
  );
}

function CommentsSkeleton() {
  return (
    <ul className="flex flex-col gap-5" aria-hidden>
      {[0, 1, 2].map((index) => (
        <li key={index} className="flex gap-3">
          <div className="bg-muted size-8 shrink-0 animate-pulse rounded-full" />
          <div
            className={cn(
              "bg-muted/70 min-h-16 flex-1 animate-pulse rounded-xl",
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

function CommentComposer({
  text,
  setText,
  textareaRef,
  pending,
  placeholder,
  error,
  onSubmit,
  mentionQuery,
  mentionOptions,
  activeMention,
  setActiveMention,
  insertMention,
  updateMentionState,
  onMentionAgentUnavailable,
  hint,
}: {
  text: string;
  setText: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  pending: boolean;
  placeholder: string;
  error?: ReactNode;
  onSubmit: () => void;
  mentionQuery: string | null;
  mentionOptions: MentionOption[];
  activeMention: number;
  setActiveMention: (updater: (i: number) => number) => void;
  insertMention: (option: MentionOption) => void;
  updateMentionState: (value: string, cursor: number) => void;
  onMentionAgentUnavailable: () => boolean;
  hint?: string;
}) {
  const trimmed = text.trim();

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
        return;
      }
    }

    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <form
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="relative">
        {mentionQuery != null ? (
          <MentionMenu
            options={mentionOptions}
            activeIndex={activeMention}
            onSelect={(option) => {
              if (option.kind === "agent" && onMentionAgentUnavailable()) {
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
          placeholder={placeholder}
          disabled={pending}
          rows={2}
          maxLength={2000}
          aria-invalid={Boolean(error) || undefined}
          className="min-h-16 bg-muted/60 pr-12 pb-8 md:text-sm"
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
      {hint ? (
        <p className="text-muted-foreground mt-1.5 text-[11px] leading-4">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="text-destructive mt-1.5 text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function ExerciseCommentsPanel({
  exerciseId,
  workoutId,
  items: itemsProp,
  readOnly = false,
  isActive = true,
}: {
  exerciseId: string;
  workoutId?: string;
  items?: Comment[];
  readOnly?: boolean;
  isActive?: boolean;
}) {
  const [text, setText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [activeMention, setActiveMention] = useState(0);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [typingThreadId, setTypingThreadId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const commentsQuery = useComments({
    exerciseId,
    workoutId,
    enabled: itemsProp == null && Boolean(exerciseId),
  });
  const createComment = useCreateComment();
  const agentReply = useAgentCommentReply();
  const respondEscalation = useRespondToTrainerEscalation();
  const me = useMeSocial();
  const following = useFollowing(me.data?.username ?? "");
  const geminiKey = useGeminiKeyStatus();

  const items = itemsProp ?? commentsQuery.data?.items ?? [];
  const threads = useMemo(() => groupCommentsIntoThreads(items), [items]);
  const markRead = useMarkNotificationsRead();
  const markedMentionIds = useRef(new Set<string>());
  const pending = createComment.isPending || agentReply.isPending;
  const isLoading = itemsProp == null && commentsQuery.isLoading;
  const isError = itemsProp == null && commentsQuery.isError;
  const activeText = replyToId ? replyText : text;
  const setActiveText = replyToId ? setReplyText : setText;
  const activeTextareaRef = replyToId ? replyTextareaRef : textareaRef;

  const mentionOptions = useMemo((): MentionOption[] => {
    if (mentionQuery == null) return [];
    const q = mentionQuery.toLowerCase();
    const options: MentionOption[] = [];

    if ("agent".startsWith(q) || "fitness".startsWith(q) || "trainer".startsWith(q)) {
      options.push({
        kind: "agent",
        label: geminiKey.data?.configured
          ? "Fitness Trainer Agent"
          : "Fitness Trainer Agent (add OpenRouter key)",
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
    if (!isActive || readOnly) return;
    const unreadIds = items
      .filter((comment) => comment.unread && !markedMentionIds.current.has(comment.id))
      .map((comment) => comment.id);
    if (unreadIds.length === 0) return;
    for (const id of unreadIds) markedMentionIds.current.add(id);
    markRead.mutate({ commentIds: unreadIds });
  }, [isActive, items, markRead, readOnly]);

  useEffect(() => {
    setActiveMention(0);
  }, [mentionQuery]);

  useEffect(() => {
    if (!replyToId) return;
    replyTextareaRef.current?.focus();
  }, [replyToId]);

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
    const el = activeTextareaRef.current;
    const current = activeText;
    if (!el) return;
    const cursor = el.selectionStart ?? current.length;
    const before = current.slice(0, cursor);
    const after = current.slice(cursor);
    const match = before.match(/(^|[\s([{])@([a-zA-Z0-9_]*)$/);
    if (!match || match.index == null) return;
    const start = match.index + match[1]!.length;
    const next = `${current.slice(0, start)}@${option.handle} ${after}`;
    setActiveText(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const pos = start + option.handle.length + 2;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  async function postComment(raw: string, parentId: string | null) {
    const trimmed = raw.trim();
    if (!trimmed || pending) return;
    setAgentError(null);
    setMentionQuery(null);
    try {
      const created = await createComment.mutateAsync({
        exerciseId,
        workoutId: workoutId ?? null,
        parentId,
        text: trimmed,
      });
      if (parentId) {
        setReplyText("");
        setReplyToId(null);
      } else {
        setText("");
        listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }

      if (commentMentionsAgent(created.mentions)) {
        if (!geminiKey.data?.configured) {
          setAgentError(
            "Add an OpenRouter API key in Integrations to get a trainer reply.",
          );
          return;
        }
        setTypingThreadId(created.parentId ?? created.id);
        try {
          await agentReply.mutateAsync({
            exerciseId,
            workoutId,
            commentId: created.id,
            text: trimmed,
          });
        } finally {
          setTypingThreadId(null);
        }
      }
    } catch {
      // error shown below from mutation / chat
    }
  }

  function startReply(comment: Comment) {
    const handle =
      comment.role === "agent" ? "agent" : comment.author.username;
    setReplyToId(comment.parentId ?? comment.id);
    setReplyText(`@${handle} `);
    setMentionQuery(null);
  }

  const empty = threads.length === 0 && !typingThreadId;
  const composerError =
    createComment.isError
      ? createComment.error instanceof Error
        ? createComment.error.message
        : "Failed to post comment"
      : agentError || agentReply.isError
        ? `${agentError ?? (agentReply.error instanceof Error ? agentReply.error.message : "Trainer reply failed")} `
        : null;

  const composerProps = {
    pending,
    mentionQuery,
    mentionOptions,
    activeMention,
    setActiveMention,
    insertMention,
    updateMentionState,
    onMentionAgentUnavailable: () => {
      if (geminiKey.data?.configured) return false;
      setAgentError(
        "Add an OpenRouter API key in Integrations to mention @agent.",
      );
      setMentionQuery(null);
      return true;
    },
  };

  return (
    <div className="flex flex-col gap-5 px-4 md:px-0">
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
                Add a private cue or how this lift felt. @mention someone to
                share it, or @agent for tips.
              </p>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-6">
            {typingThreadId &&
            !threads.some((thread) => thread.root.id === typingThreadId) ? (
              <li>
                <TypingAgentRow />
              </li>
            ) : null}
            {threads.map(({ root, replies }) => {
              const showTyping = typingThreadId === root.id;
              return (
                <li key={root.id} className="flex flex-col gap-3">
                  <CommentRow
                    comment={root}
                    linkAuthor={!readOnly}
                    canRespondToEscalation={me.data?.id === root.authorId}
                    escalationPending={respondEscalation.isPending}
                    onEscalationRespond={(approved) => {
                      void respondEscalation.mutateAsync({
                        commentId: root.id,
                        approved,
                      });
                    }}
                    onReply={
                      readOnly
                        ? undefined
                        : () => {
                            startReply(root);
                          }
                    }
                  />
                  {replies.length > 0 || showTyping || replyToId === root.id ? (
                    <div className="border-foreground/10 ml-4 flex flex-col gap-3 border-l pl-4 sm:ml-5">
                      {replies.map((reply) => (
                        <CommentRow
                          key={reply.id}
                          comment={reply}
                          linkAuthor={!readOnly}
                          compact
                          canRespondToEscalation={me.data?.id === reply.authorId}
                          escalationPending={respondEscalation.isPending}
                          onEscalationRespond={(approved) => {
                            void respondEscalation.mutateAsync({
                              commentId: reply.id,
                              approved,
                            });
                          }}
                          onReply={
                            readOnly
                              ? undefined
                              : () => {
                                  startReply(reply);
                                }
                          }
                        />
                      ))}
                      {showTyping ? <TypingAgentRow /> : null}
                      {readOnly || replyToId !== root.id ? null : (
                        <div>
                          <div className="mb-1.5 flex items-center justify-between">
                            <p className="text-muted-foreground text-[12px]">
                              Reply in thread
                            </p>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground inline-flex size-6 items-center justify-center rounded-full"
                              aria-label="Cancel reply"
                              onClick={() => {
                                setReplyToId(null);
                                setReplyText("");
                                setMentionQuery(null);
                              }}
                            >
                              <IconX className="size-3.5" />
                            </button>
                          </div>
                          <CommentComposer
                            {...composerProps}
                            text={replyText}
                            setText={setReplyText}
                            textareaRef={replyTextareaRef}
                            placeholder="Reply privately… @agent or @friend to share"
                            onSubmit={() => {
                              void postComment(replyText, root.id);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {readOnly ? null : (
        <div>
          <CommentComposer
            {...composerProps}
            text={text}
            setText={setText}
            textareaRef={textareaRef}
            placeholder="Private note… @agent or @friend to share"
            onSubmit={() => {
              void postComment(text, null);
            }}
            hint="Private unless you @mention someone · Enter to send · Shift+Enter for a new line"
            error={
              composerError ? (
                createComment.isError || agentError || agentReply.isError ? (
                  <>
                    {composerError}
                    {agentError || agentReply.isError ? (
                      <Link
                        href="/integrations"
                        className="underline underline-offset-2"
                      >
                        Open Integrations
                      </Link>
                    ) : null}
                  </>
                ) : (
                  composerError
                )
              ) : null
            }
          />
        </div>
      )}
    </div>
  );
}
