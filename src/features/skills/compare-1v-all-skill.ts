export const COMPARE_1V_ALL_SKILL_NAME = "epic-gains-compare-1v-all";

export const COMPARE_1V_ALL_SKILL_FILENAME = "SKILL.md";

export const COMPARE_1V_ALL_SKILL_TRIGGER =
  "Compare me against all my friends, use Epic Gains";

export const COMPARE_1V_ALL_SKILL_INSTALL_PATH =
  `~/.cursor/skills/${COMPARE_1V_ALL_SKILL_NAME}/SKILL.md`;

export const COMPARE_1V_ALL_SKILL_MD = `---
name: epic-gains-compare-1v-all
description: Compares one athlete (default you) against everyone they follow using Epic Gains. Use when the user asks for 1v all, me vs the group, or a ranking among friends.
---

# Epic Gains 1v All Comparison

Rank one focal athlete against the full follow list from a single pair of MCP calls. Do not invent metrics.

## When to Use

- When the user asks for 1v all, "me vs my friends", or a ranking of the circle.
- When the user wants to know who led the group this week.

## Workflow

### 1. Resolve the focal athlete

Default to the authenticated user. If the user names one username, that person is the focal athlete.

### 2. Retrieve metrics (one turn)

Call both tools in the same turn with the same \`date\` (yesterday as \`YYYY-MM-DD\` unless the user named a date):

1. \`performance_metrics\` for the focal athlete (omit \`username\` if it is the authenticated user).
2. \`following_performance_metrics\` once (same date). Do not loop \`performance_metrics\` per friend.

Then write the template. Do not call any other tool.

Forbidden: \`list_following\`, \`list_following_feed\`, \`list_follow_requests\`, \`follow_user\`, \`search_users\`, \`get_social_profile\`, \`athletes_performance_metrics\`, looping \`performance_metrics\` per friend.

If the follow list is empty, say so from the payload and only recap the focal athlete.

### 3. Rank from the payloads

Use \`following_performance_metrics.pulse\` for group median and volume leader. Rank visible friends by \`metrics.windows.currentWeek.volume\`, then sessions, then streak. Skip \`canViewWorkouts: false\` and list them under Hidden. Do not recompute medians.

### 4. Format output

\`\`\`markdown
### 1v All Comparison

**As of** [YYYY-MM-DD]
**Focal** [@username or You]
**Circle** [returnedCount] visible / [followingCount] following

**Verdict**
[1-2 sentences: where the focal athlete sits vs the group]

**You vs the group (this week)**
- **Your volume / sessions / streak:** [from performance_metrics]
- **Group median volume:** [pulse.medianCurrentWeekVolume, or N/A]
- **Rank:** [place] of [visible count] by current-week volume

**Leaderboard (this week)**
- 1. [@user] - [volume], [sessions], streak [n]
- 2. ...

**Focal day**
- **You:** [Focus / Rest Day, volume, sets]
- **Hottest friend day:** [@user or None] [volume, focus]

**Hidden**
- [@user: reason] or None

**Next**
- [1 objective gap vs the leader or the median. No medical advice.]
\`\`\`

## Gotchas

- One \`following_performance_metrics\` call. Never N friend calls.
- Same date on both tools.
- Do not include hidden or non-visible friends in rank or median.
- If \`truncated\` is true, say the list was capped at 50.
- Cite payload numbers only. Host MCP approval UI is not a follow request.
- Hyphens only. Blank line before each list.
`;
