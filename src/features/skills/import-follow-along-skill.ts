export const IMPORT_FOLLOW_ALONG_SKILL_NAME = "epic-gains-import-follow-along";

export const IMPORT_FOLLOW_ALONG_SKILL_MD = `---
name: epic-gains-import-follow-along
description: Imports a follow-along workout video into Epic Gains the same way as the YouTube import page. Call get_youtube_import_prompt, apply that prompt to the video, then pass the extracted JSON to import_full_workout. Use when the user pastes a YouTube workout or asks to import a follow-along, HIIT, or mobility class. Do not use for videos that cannot be played or for unlabelled Zumba/dance choreography.
---

# Epic Gains Import Follow-Along

Match the manual YouTube import page: official prompt → watch the video → paste that JSON into \`import_full_workout\`.

## When to Use

- User shares a YouTube follow-along workout URL.
- User asks to import, create, or log a video class with timed moves.

## When not to import

- Playback is blocked, embedding is disabled, or you cannot watch the video. Tell the user it cannot be imported. Do not invent moves.
- Zumba, dance cardio, or choreography without labelled known exercises (overlay, spoken name, or chapter). Song sections and dance-step names are not enough.

## Workflow

1. Call \`get_youtube_import_prompt\` with the YouTube URL. Use the returned \`prompt\` field. The tool result is instructions only — not the workout.
2. Apply that prompt to the video (timers, beeps, overlays). Return the JSON the prompt specifies (\`overview\`, \`sections\`, \`timestamp\` as \`MM:SS\`). Do not invent names or times from the schema.
3. If the JSON is a refusal (\`rejected: true\`), stop. Tell the user why. Do not call \`import_full_workout\`.
4. Do not call \`list_exercises\`, \`list_workouts\`, or piecemeal create/update tools.
5. Call \`import_full_workout\` once with that JSON plus \`sourceVideoUrl\` (canonical watch URL). Do not convert timestamps to seconds. Do not invent \`videoEndTime\` or flatten sections — the server derives clip ends from the next start, same as \`/workouts/import\`.
6. If import fails, fix the extracted start timestamps from the video and call again. Do not "fix" validation by shrinking ends to a guessed interval. Summarize only from the tool result.

## Gotchas

- Chapter timestamps are STARTS. Never treat a coarse range like Warm-Up 0:00-5:00 as one move.
- One labelled move per grid slot. If two work intervals share one row, split them in the extracted JSON.
- If the same video already exists, the tool returns a conflict with the existing workout id — do not invent a second import.
`;
