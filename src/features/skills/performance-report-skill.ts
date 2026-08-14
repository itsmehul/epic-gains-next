export const PERFORMANCE_REPORT_SKILL_NAME = "epic-gains-performance-report";

export const PERFORMANCE_REPORT_SKILL_FILENAME = "SKILL.md";

export const PERFORMANCE_REPORT_SKILL_TRIGGER =
  "Analysis by workout data from yesterday and give me a summary, use Epic Gains";

export const PERFORMANCE_REPORT_SKILL_INSTALL_PATH =
  `~/.cursor/skills/${PERFORMANCE_REPORT_SKILL_NAME}/SKILL.md`;

export const PERFORMANCE_REPORT_SKILL_MD = `---
name: epic-gains-performance-report
description: >-
  Generates a short Epic Gains training recap via the performance_metrics MCP
  tool (focal day, week-over-week, 30-day volume, streak, PRs, session comments).
  Apply whenever the user asks about workouts, exercises, sets, training, gym,
  lifting, fitness, progress, volume, PRs, streaks, comments, session notes,
  muscle groups, how they (or a friend) are doing, yesterday/today/this week’s
  session, or any Epic Gains workout/exercise/fitness question. Do not use for
  app/code/UI/API/schema changes in the Epic Gains codebase.
---

# Epic Gains performance report

Produce a **short** report that answers “how am I doing?” — not a dump of every set.

Default task (use this wording as the job, unless the user names another window):

Analysis by workout data from yesterday and give me a summary, use Epic Gains

## When to apply

Load this skill for **end-user training questions**, including:
- workouts, sessions, programs, “what did I do”
- exercises, sets, reps, weight, volume, PRs
- fitness, gym, lifting, cardio, muscle groups
- progress, trends, streaks, consistency, “how am I doing”
- yesterday / today / this week / this month recaps
- comments, session notes, how a lift felt
- a friend’s training (pass \`username\` to \`performance_metrics\`)

## When not to apply

Skip this skill when the user is **building or debugging Epic Gains** (code, UI, APIs, MCP tools, schema, imports). Those are engineering tasks, not a performance report.

## MCP

1. \`GetMcpTools\` with \`server: "user-epic-gains"\`.
2. If \`needsAuth\` / \`error\` or a tool returns auth failure: \`CallMcpTool\` \`mcp_auth\` (empty args), rediscover once. Do not loop.
3. Confirm the \`performance_metrics\` schema, then call it.

**Primary tool:** \`performance_metrics\`
One call. Do **not** issue multiple \`performance_data\` calls for day/week/month.

| Arg | Use |
| --- | --- |
| \`date\` | Yesterday as \`YYYY-MM-DD\` (local, from conversation “Today’s date”). Defaults to today if omitted — **always pass yesterday** for the default recap. |
| \`username\` | Omit for the authenticated user. |
| \`muscleGroup\` / \`keyMuscle\` | Only if the user asks to slice. |

Do **not** call \`performance_data\` for comments. They are already on this payload.

## Tool & Execution Constraints

- **Direct MCP Only:** Use only \`performance_metrics\` (and \`mcp_auth\` if needed).
- **No Workspace Searching:** Do NOT search Gmail, Google Drive, Google Calendar, or Google Chat via context tools or semantic search for workout data.
- **No System Exploration:** Do NOT execute exploratory shell commands (\`env\`, \`which\`, broad filesystem scans, or multi-step trial scripts).
- **Fast Failure:** If the Epic Gains MCP server or tool is unavailable or fails after one auth attempt, immediately inform the user that the Epic Gains MCP connection is unavailable. Do not attempt exploratory workarounds or ad-hoc sweeps across external tools.

## What the payload already contains

Use these fields; do not recompute windows from raw sets.

- \`asOf\` — focal calendar day
- \`windows.focalDay\` / \`currentWeek\` / \`priorWeek\` / \`trailing30Days\` — each has \`range\`, \`trainingDays\`, \`sessions\`, \`setCount\`, \`volume\`, \`muscleGroups[]\`
- \`weekOverWeek\` — \`volumeDeltaPct\`, \`sessionDeltaPct\`, \`setCountDeltaPct\`, \`trainingDayDeltaPct\` (\`null\` if prior week was 0)
- \`streak.currentDays\`, \`streak.longestInRange\`
- \`personalRecords[]\` — 30-day sets that tied/beat all-time (\`metric\`: weight | volume | reps | time | distance, plus \`day\`, \`exerciseName\`)
- \`comments[]\` — every visible comment on this athlete’s exercises (\`text\`, \`createdAt\`, \`author.{name,username}\`, \`exercise.{id,name,muscleGroup,keyMuscles}\`, \`workout.{id,name} | null\`). \`workout\` is null for exercise-wide notes.
- \`days[]\` — daily rollup (\`setCount\`, \`volume\`, \`sessions\`, workouts/exercises). Each exercise includes nested \`comments\` (workout-scoped plus general notes for that exercise).

Volume is \`weight * reps\`. Rest is already excluded. Week is Monday–Sunday. Trailing window is 30 days ending \`asOf\`. Comments are visibility-filtered for the MCP viewer; they are not limited to the 30-day window.

If \`windows.focalDay.setCount\` is 0: say no logged sets yesterday; use \`days\` to name the most recent training day and still report week / 30-day trend. If the whole payload is empty: say so and stop.

## Comments in the recap

- Prefer nested \`days\` comments for yesterday’s exercises; use the top-level \`comments\` array for notes that are not on a logged day in \`days\`.
- Quote at most 1–2 short notes that change the story (effort, pain, form). Attribute \`@username\` and the exercise name.
- If nothing worth quoting, omit the notes line. Do not list every comment.
- Pain/form notes: mention the movement; no diagnosis or medical advice.

## Voice

- Short. Verdict in 2–4 sentences, then numbers from the payload.
- Prefer \`weekOverWeek\` percents over homemade math.
- Flag PRs whose \`day\` equals \`asOf\`.
- No medical advice. No emoji spam. No markdown tables in chat (canvas instead).

## Chat output

\`\`\`markdown
## Performance report — {asOf weekday, Mon D}

**Verdict:** {on track / mixed / light day / no session vs weekOverWeek}

**Yesterday:** {workout names from days matching asOf}. {focalDay.setCount} sets · volume {focalDay.volume}. {muscle-group mix from focalDay.muscleGroups}.

**Notes:** {0–2 quoted comments from yesterday’s nested exercise comments, else omit this line}.

**Vs last week:** {weekOverWeek deltas}. Current week {currentWeek.sessions} sessions / {currentWeek.volume} vs prior week.

**Signals:** 2–4 bullets — PRs on asOf, streak, 30-day muscle gaps, comment themes, longest vs current streak.

**Next:** 1 concrete focus from imbalance or yesterday’s work. Not a full program.
\`\`\`

## Canvas

Standalone quantitative artifact via the canvas skill. Inline \`performance_metrics\` data. Omit empty sections.

1. Header: Performance report · \`asOf\` · source Epic Gains
2. Stats: yesterday sets/volume, week sessions, current streak
3. Chart: \`days\` volume (or sets) for current week vs prior week ranges
4. Muscle groups: \`windows.currentWeek.muscleGroups\`
5. Yesterday workouts from \`days\` matching \`asOf\`
6. Compact notes list from those exercises’ \`comments\` (omit if empty)
7. Caption: \`Source: Epic Gains · performance_metrics · asOf {asOf}\`

## Failures

MCP down after auth → report the error; do not invent sessions.
Huge payload → use \`windows\` / \`days\` / \`personalRecords\` / \`comments\`; never paste raw JSON in chat.
`;
