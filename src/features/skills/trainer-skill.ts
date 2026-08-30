export const TRAINER_SKILL_NAME = "epic-gains-trainer";

export const TRAINER_SKILL_FILENAME = "SKILL.md";

export const TRAINER_SKILL_TRIGGER =
  "Give me a report of my athletes, use Epic Gains";

export const TRAINER_SKILL_INSTALL_PATH =
  `~/.cursor/skills/${TRAINER_SKILL_NAME}/SKILL.md`;

export const TRAINER_SKILL_MD = `---
name: epic-gains-trainer
description: Trainer recap of every friend who assigned you as their trainer in Epic Gains. Use when the user asks for their athletes, clients, roster, or a trainer report of performances and comments.
---

# Epic Gains Trainer Report

Summarize training for everyone who assigned the authenticated user as trainer from one MCP call. Do not invent metrics.

## When to Use

- When the user asks for a report of their athletes, clients, or people who set them as trainer.
- When the user wants performances and comments across the trainer roster, not the follow circle.

## Workflow

### 1. Retrieve the roster (one turn)

Call \`athletes_performance_metrics\` once.

- **Date:** Yesterday as \`YYYY-MM-DD\` unless the user named a date.
- Then write the report. Do not call any other tool.
- Forbidden: \`list_athletes\`, \`list_trainers\`, \`list_following\`, \`list_follow_requests\`, \`get_social_profile\`, \`search_users\`, \`performance_metrics\`, \`following_performance_metrics\`.

If \`athletes\` is empty, say nobody has assigned you as trainer yet and stop.

### 2. Synthesize

Use \`pulse\` for the roster rollup. Do not recompute trained counts or the volume leader.

For each athlete with \`canViewWorkouts: true\`, write a short pulse from \`metrics.windows\`, \`weekOverWeek\`, \`analytics\`, \`focalDay\`, and \`comments\`. For \`canViewWorkouts: false\`, list them under Hidden with the tool \`reason\`.

### 3. Format output

\`\`\`markdown
### Trainer Report

**As of** [YYYY-MM-DD]
**Roster** [returnedCount] returned / [athleteCount] athletes

**Roster pulse**
- **Trained yesterday:** [pulse.trainedFocalDay]
- **Trained this week:** [pulse.trainedCurrentWeek]
- **Volume leader (this week):** [pulse.volumeLeader]

**@username (display name)**
- **Yesterday:** [Focus / Rest Day, volume, sets]
- **Vs last week:** [volume delta or N/A], [sessions this week vs last]
- **Signals:** streak [n]; PRs [list or None]; comments [or None]

**Hidden**
- [@user: reason] or None

**Next**
- [1 coaching note on the roster, not medical advice]
\`\`\`

Repeat the **@username** block once per visible athlete. Sort by current-week volume descending, then username.

## Gotchas

- One tool call only. Use \`pulse\` and each athlete's \`metrics\`. Read comments; do not recompute totals.
- Rest Day when focal-day sets are 0. Still show week context.
- If \`truncated\` is true, say the list was capped at 50.
- Cite payload numbers only. Host MCP approval UI is not a follow request.
- Hyphens only. Blank line before each list.
`;
