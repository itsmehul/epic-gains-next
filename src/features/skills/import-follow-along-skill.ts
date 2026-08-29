export const IMPORT_FOLLOW_ALONG_SKILL_NAME = "epic-gains-import-follow-along";

export const IMPORT_FOLLOW_ALONG_SKILL_MD = `---
name: epic-gains-import-follow-along
description: Imports a follow-along workout video into Epic Gains with one import_full_workout call. Use when the user pastes a YouTube workout, asks to create or import a follow-along, HIIT, mobility, or dance class from video, or wants timed exercise chapters in Epic Gains.
---

# Epic Gains Import Follow-Along

Create the workout and every move in a single \`import_full_workout\` call.

## When to Use

- User shares a YouTube (or other) follow-along workout URL.
- User asks to import, create, or log a video class with timed moves.

## Workflow

1. Watch the video (or use a timed move list that marks each move's START). Do not web-search for chapters or transcripts unless the video has no timers, beeps, overlays, or usable chapters.
2. Do not call \`list_exercises\`, \`list_workouts\`, or piecemeal create/update tools.
3. Detect the interval grid (60s, 45/15, 40/20, 30s). Lock each \`videoStartTime\` to that grid (timer reset, beep, or overlay — not a mid-set "let's begin").
4. One grid slot = one exercise. Do not merge two work intervals into one row.
5. Skip rest, water, intro, and preview. Keep an abutting timeline: each \`videoEndTime\` equals the next \`videoStartTime\`. Last move ends at video duration in seconds.
6. Call \`import_full_workout\` once with \`sourceVideoUrl\`, exact video title as \`workoutName\`, author and channelUrl when known, and the exercise list.
7. If the tool returns an error about gaps or merged intervals, fix the timeline and call again. Summarize only from the tool result.

## Per exercise

- Canonical name (no incline degrees or grip notes).
- \`videoStartTime\` / \`videoEndTime\` in seconds.
- \`metric_profile\`, \`muscle_group\`, \`key_muscles\` (1-6).
- \`suggested_sets\` (usually 1) and \`suggested_time\` for the work interval (not rest), or \`suggested_reps\` if the coach counts reps.
- \`tags\` for sections (warmup, hiit, cooldown).

## Gotchas

- Chapter timestamps are STARTS. Never treat a coarse range like Warm-Up 0:00-5:00 as one move.
- A 120s clip on a 60s grid is two moves (or a skipped rest that was incorrectly attached). Split it.
- If the same video already exists, the tool returns a conflict with the existing workout id — do not invent a second import.
`;
