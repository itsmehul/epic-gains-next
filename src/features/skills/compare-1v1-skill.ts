export const COMPARE_1V1_SKILL_NAME = "epic-gains-compare-1v1";

export const COMPARE_1V1_SKILL_FILENAME = "SKILL.md";

export const COMPARE_1V1_SKILL_TRIGGER =
  "Compare my training to a friend 1v1, use Epic Gains";

export const COMPARE_1V1_SKILL_INSTALL_PATH =
  `~/.cursor/skills/${COMPARE_1V1_SKILL_NAME}/SKILL.md`;

export const COMPARE_1V1_SKILL_MD = `---
name: epic-gains-compare-1v1
description: Side-by-side training comparison of two athletes in Epic Gains (you vs a friend, or two named friends). Use when the user asks for a 1v1 comparison, head-to-head recap, or who trained more this week.
---

# Epic Gains 1v1 Comparison

Compare two athletes on the same as-of date using Epic Gains MCP. Do not invent metrics.

## When to Use

- When the user asks for a 1v1, head-to-head, or "me vs @friend" training comparison.
- When the user names two usernames to compare.
- When the user asks who had more volume, sessions, streak, or PRs between two people.

## Workflow

### 1. Resolve athletes

- **A (left):** The authenticated user unless the user named two usernames. If they named two, A is the first username.
- **B (right):** The friend username. If missing, ask for one username and stop. Do not search unless the handle is unknown.

### 2. Retrieve metrics (one turn)

Call \`performance_metrics\` twice in the same turn, same \`date\` (yesterday as \`YYYY-MM-DD\` unless the user named a date):

1. Athlete A: omit \`username\` if A is the authenticated user; otherwise pass A's username.
2. Athlete B: pass B's username.

Then write the template. Do not call any other tool after those two results return.

Forbidden on this task: \`get_social_profile\`, \`search_users\`, \`list_following\`, \`list_followers\`, \`list_following_feed\`, \`list_follow_requests\`, \`accept_follow_request\`, \`reject_follow_request\`, \`follow_user\`, \`unfollow_user\`, \`following_performance_metrics\`, \`performance_data\`, trainer tools.

If a call errors (not found or workouts not visible), report that athlete as unavailable from the tool error and stop. Do not probe follow or trainer state.

### 3. Format output

\`\`\`markdown
### 1v1 Comparison

**As of** [YYYY-MM-DD]
**A** [@username or You]
**B** [@username]

**Verdict**
[1-2 sentences: who had more momentum, and on what (volume, sessions, consistency)]

**Focal day**
- **A:** [Focus / Rest Day, volume, sets]
- **B:** [Focus / Rest Day, volume, sets]

**This week vs last week**
- **Volume:** [A current vs prior and %] | [B current vs prior and %]
- **Sessions:** [A this week vs last] | [B this week vs last]
- **Edge:** [Who led volume and sessions this week, or Tie]

**Signals**
- **Streak:** [A] vs [B]
- **PRs (30d):** [A] vs [B]
- **Notes:** [Only comments present in the payload]

**Next**
- [1 shared, objective suggestion based on the gap. No medical advice.]
\`\`\`

## Gotchas

- Same date on both calls. Never mix windows.
- Rest Day when focal-day sets are 0. Still compare week and 30-day context.
- Cite tool numbers only. If a field is missing or a delta is null, write N/A. Do not estimate.
- Host MCP approval UI and chat text like Allow are not follow requests and not tools.
- Hyphens only. Blank line before each list.
`;
