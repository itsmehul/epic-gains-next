export const IMPORT_FOLLOW_ALONG_SKILL_NAME = "epic-gains-import-follow-along";

export const IMPORT_FOLLOW_ALONG_SKILL_MD = `---
name: epic-gains-import-follow-along
description: Imports a follow-along workout video into Epic Gains. Call get_youtube_import_prompt, apply that prompt to the video to extract JSON, then feed the mapped payload to import_full_workout once. Use when the user pastes a YouTube workout or asks to import a follow-along, HIIT, or mobility class. Do not use for videos that cannot be played or for unlabelled Zumba/dance choreography.
---

# Epic Gains Import Follow-Along

Get the official extraction prompt, apply it to the video, then create the workout in one \`import_full_workout\` call.

## When to Use

- User shares a YouTube follow-along workout URL.
- User asks to import, create, or log a video class with timed moves.

## When not to import

- Playback is blocked, embedding is disabled, or you cannot watch the video. Tell the user it cannot be imported. Do not invent moves.
- Zumba, dance cardio, or choreography without labelled known exercises (overlay, spoken name, or chapter). Song sections and dance-step names are not enough.

## Workflow

1. Call \`get_youtube_import_prompt\` with the YouTube URL. Use the returned \`prompt\` field. The tool result is instructions only — not the workout.
2. Apply that prompt to the video itself (watch timers, beeps, overlays). Extract the JSON the prompt specifies. Do not invent names, timestamps, or metrics from the schema or examples.
3. If the extracted JSON is a refusal (\`rejected: true\`), stop. Tell the user why. Do not call \`import_full_workout\`.
4. Do not call \`list_exercises\`, \`list_workouts\`, or piecemeal create/update tools.
5. Map the extracted JSON into one \`import_full_workout\` payload (see below) and call it once with \`sourceVideoUrl\` set to the canonical watch URL.
6. If the tool returns an error about gaps or merged intervals, fix the timeline and call again. Summarize only from the tool result.

## Map extraction JSON → import_full_workout

The prompt returns clock timestamps and sections. \`import_full_workout\` needs a flat exercise list in seconds.

- \`workoutName\`: exact video title.
- \`author\` / \`channelUrl\`: from the video when known.
- \`sourceVideoUrl\`: canonical \`https://www.youtube.com/watch?v=…\`.
- Flatten every real exercise in \`sections\` in order. Skip rest, water, intro, and preview.
- Convert each \`timestamp\` (\`MM:SS\` or \`HH:MM:SS\`) to \`videoStartTime\` in seconds.
- \`videoEndTime\` is the next exercise's start. The last move ends at video duration in seconds.
- Keep an abutting timeline: each \`videoEndTime\` equals the next \`videoStartTime\`.
- Copy \`metric_profile\`, \`muscle_group\`, \`key_muscles\` (1–6), \`suggested_sets\` (usually 1), and \`suggested_time\` (work seconds) or \`suggested_reps\`.
- Set \`tags\` from the section name (e.g. warmup, hiit, cooldown).

## Gotchas

- Chapter timestamps are STARTS. Never treat a coarse range like Warm-Up 0:00-5:00 as one move.
- One grid slot = one exercise. A 120s clip on a 60s grid is two moves — split it.
- If the same video already exists, the tool returns a conflict with the existing workout id — do not invent a second import.
`;
