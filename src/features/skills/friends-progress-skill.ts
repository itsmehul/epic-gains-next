export const FRIENDS_PROGRESS_SKILL_NAME = "epic-gains-friends-progress";

export const FRIENDS_PROGRESS_SKILL_FILENAME = "SKILL.md";

export const FRIENDS_PROGRESS_SKILL_TRIGGER =
  "Give me a progress report of all my friends, use Epic Gains";

export const FRIENDS_PROGRESS_SKILL_INSTALL_PATH =
  `~/.cursor/skills/${FRIENDS_PROGRESS_SKILL_NAME}/SKILL.md`;

export const FRIENDS_PROGRESS_SKILL_MD = `---
name: epic-gains-friends-progress
description: Progress report for everyone you follow in Epic Gains. Use when the user asks how their friends are doing, a circle recap, or a progress report of all friends.
---

# Epic Gains Friends Progress Report

Summarize training for everyone the authenticated user follows from one MCP call. Do not invent metrics.

## When to Use

- When the user asks for a progress report of all friends or how the circle trained.
- When the user asks "how are my friends doing" without naming one person.

## Workflow

### 1. Retrieve the circle (one turn)

Call \`following_performance_metrics\` once.

- **Date:** Yesterday as \`YYYY-MM-DD\` unless the user named a date.
- Do not call \`list_following\`, \`get_social_profile\`, or \`performance_metrics\` per friend.

If \`friends\` is empty, say you follow nobody yet and stop.

### 2. Synthesize

For each friend with \`canViewWorkouts: true\`, write a short pulse (verdict, yesterday, vs last week, signals). For \`canViewWorkouts: false\`, list them under Hidden with the tool \`reason\`.

Open with a circle rollup: how many trained yesterday, how many trained this week, who led volume.

### 3. Format output

\`\`\`markdown
### Friends Progress Report

**As of** [YYYY-MM-DD]
**Circle** [returnedCount] returned / [followingCount] following

**Circle pulse**
- **Trained yesterday:** [count]
- **Trained this week:** [count]
- **Volume leader (this week):** [@user or None]

**@username (display name)**
- **Yesterday:** [Focus / Rest Day, volume, sets]
- **Vs last week:** [volume delta or N/A], [sessions this week vs last]
- **Signals:** streak [n]; PRs [list or None]; notes [or None]

**Hidden**
- [@user: reason] or None

**Next**
- [1 note on the circle, not medical advice]
\`\`\`

Repeat the **@username** block once per visible friend. Sort by current-week volume descending, then username.

## Gotchas

- One tool call only. The payload already includes profile fields and metrics.
- Rest Day when focal-day sets are 0. Still show week context.
- If \`truncated\` is true, say the list was capped at 50.
- Hyphens only. Blank line before each list.
`;
