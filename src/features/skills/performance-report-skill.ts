export const PERFORMANCE_REPORT_SKILL_NAME = "epic-gains-performance-summary";

export const PERFORMANCE_REPORT_SKILL_FILENAME = "SKILL.md";

export const PERFORMANCE_REPORT_SKILL_TRIGGER =
  "Analysis by workout data from yesterday and give me a summary, use Epic Gains";

export const PERFORMANCE_REPORT_SKILL_INSTALL_PATH =
  `~/.cursor/skills/${PERFORMANCE_REPORT_SKILL_NAME}/SKILL.md`;

export const PERFORMANCE_REPORT_SKILL_MD = `---
name: epic-gains-performance-summary
description: Generates a structured performance report and training summary from Epic Gains workout data. Use when the user asks for a workout performance report, training summary, recap of yesterday's session, week-over-week progress, or fitness performance recap in Epic Gains.
---

# Epic Gains Performance Summary

Generate a structured, concise training performance report synthesizing workout data from Epic Gains.

## When to Use

- When the user asks for a performance report or workout summary in Epic Gains.
- When the user asks "how did I do yesterday", "summarize my workouts", or requests a training recap.
- When comparing current week vs. prior week workout volume, sessions, and set distribution.
- When reviewing streaks, personal records (PRs), and session notes.

## Workflow

### 1. Retrieve Performance Metrics

Call the \`performance_metrics\` tool on the Epic Gains MCP server.

- **Date:** Pass yesterday's date in \`YYYY-MM-DD\` format (based on the user's current local date).
- **Username:** Omit for the authenticated user unless a specific athlete's username is requested.
- Then write the report. Do not call any other tool unless you need \`list_workouts\` for a workout name already referenced in the payload.
- Forbidden: \`list_follow_requests\`, \`follow_user\`, \`get_social_profile\`, \`list_following\`, \`following_performance_metrics\`.

### 2. Synthesize Metrics

Extract and compute the following key sections from the tool payload:

- **Verdict:** Formulate a 1-2 sentence high-level assessment of training momentum, consistency, and volume trends.
- **Yesterday:** Extract the targeted muscle groups, total volume, total completed sets, and standout lifts or exercises from the focal day. If no sets were logged, mark as a Rest Day.
- **Vs Last Week:** Compare current week metrics against the prior week, including volume percentage delta, session count comparison, and shifts in muscle group set distribution.
- **Signals:** Highlight active streak length, any personal records (PRs) set in the window, and relevant comments/notes logged on exercises.
- **Next:** Provide 1-2 actionable, concise recommendations for upcoming workouts based on recovery and muscle group balance.

### 3. Format Output

Format the final response using the exact markdown template below:

\`\`\`markdown
### Performance Report

**Verdict**
[1-2 sentence overall summary of training momentum and consistency]

**Yesterday**
- **Focus:** [Muscle groups worked or Rest Day]
- **Volume & Sets:** [Total volume in lbs/kg and completed sets]
- **Key Highlights:** [Standout lifts, exercises, or logged notes]

**Vs Last Week**
- **Volume:** [Current week total vs. prior week total with percentage delta]
- **Sessions:** [Number of sessions completed this week vs. prior week]
- **Set Distribution:** [Notable shifts across muscle groups]

**Signals**
- **Streak:** [Current active training streak]
- **PRs:** [Any new personal records set in the window]
- **Notes & Comments:** [Athlete or coach notes logged on exercises]

**Next**
- [1-2 concise, actionable recommendations for the next workout]
\`\`\`

## Gotchas

- If no sets were logged yesterday, state "Rest Day" under focus and still provide the week-over-week and 30-day context.
- Keep the commentary objective, concise, and focused on momentum without giving medical advice.
- Cite payload numbers only. If a field is missing, write N/A. Do not estimate.
- Host MCP approval UI and chat text like Allow are not follow requests.
- Ensure all list items have a blank line preceding the list block.
- Use hyphens instead of em-dashes or en-dashes throughout the report.
`;
