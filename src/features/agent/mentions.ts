import type { CommentMention } from "@/db/schema/workout-schema";

const MENTION_RE = /(?:^|[\s([{])(@[a-zA-Z0-9_]{1,32})\b/g;

export type MentionCandidate = {
  id: string;
  username: string;
  name: string;
};

/** Extract @handles from text (without the @). */
export function extractMentionHandles(text: string): string[] {
  const handles: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(MENTION_RE)) {
    const raw = match[1];
    if (!raw) continue;
    const handle = raw.slice(1).toLowerCase();
    if (seen.has(handle)) continue;
    seen.add(handle);
    handles.push(handle);
  }
  return handles;
}

/**
 * Resolve @agent and @username mentions against people the author follows.
 * Unmatched handles are ignored (stay plain text).
 */
export function resolveMentions(
  text: string,
  following: MentionCandidate[],
): CommentMention[] {
  const handles = extractMentionHandles(text);
  if (handles.length === 0) return [];

  const byUsername = new Map(
    following
      .filter((u) => u.username)
      .map((u) => [u.username.toLowerCase(), u]),
  );

  const mentions: CommentMention[] = [];
  let hasAgent = false;

  for (const handle of handles) {
    if (handle === "agent") {
      if (!hasAgent) {
        mentions.push({ kind: "agent" });
        hasAgent = true;
      }
      continue;
    }
    const user = byUsername.get(handle);
    if (user) {
      mentions.push({
        kind: "user",
        userId: user.id,
        username: user.username,
      });
    }
  }

  return mentions;
}

export function commentMentionsAgent(mentions: CommentMention[] | null | undefined) {
  return Boolean(mentions?.some((m) => m.kind === "agent"));
}

export type CommentTextPart =
  | { type: "text"; value: string }
  | { type: "mention"; kind: "agent" }
  | { type: "mention"; kind: "user"; username: string };

/** Split comment text into plain + mention parts for rendering. */
export function splitCommentText(
  text: string,
  mentions: CommentMention[] | null | undefined = [],
): CommentTextPart[] {
  const mentionSet = new Set<string>();
  for (const m of mentions ?? []) {
    if (m.kind === "agent") mentionSet.add("agent");
    else mentionSet.add(m.username.toLowerCase());
  }

  const parts: CommentTextPart[] = [];
  let lastIndex = 0;
  const re = /(?:^|[\s([{])(@[a-zA-Z0-9_]{1,32})\b/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const full = match[0];
    const handleWithAt = match[1];
    if (!handleWithAt) continue;
    const handle = handleWithAt.slice(1).toLowerCase();
    const atIndex = match.index + full.length - handleWithAt.length;

    if (!mentionSet.has(handle)) continue;

    if (atIndex > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, atIndex) });
    }

    if (handle === "agent") {
      parts.push({ type: "mention", kind: "agent" });
    } else {
      parts.push({ type: "mention", kind: "user", username: handleWithAt.slice(1) });
    }
    lastIndex = atIndex + handleWithAt.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  if (parts.length === 0) {
    return [{ type: "text", value: text }];
  }

  return parts;
}
