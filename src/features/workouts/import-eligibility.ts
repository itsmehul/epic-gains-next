export const VIDEO_PLAYBACK_REJECT_REASON =
  "This video doesn't allow playback, so it can't be imported.";

export const UNSTRUCTURED_DANCE_REJECT_REASON =
  "This video is dance or choreography without labelled, known exercises.";

/** Shared rules for Gemini / MCP: when to refuse instead of inventing a workout. */
export const IMPORT_VIDEO_ELIGIBILITY_RULES = `### Video eligibility (reject — do not invent)

Refuse the import. Do not list exercises. Do not call import_full_workout.

1. **Playback**: You cannot watch the video, YouTube reports it unavailable, embedding or playback is disabled, or the stream is blocked.
   Reason: "${VIDEO_PLAYBACK_REJECT_REASON}"

2. **Unstructured dance**: Zumba, dance cardio, or continuous choreography where moves are not labelled (on-screen titles, spoken exercise names, or chapters) as known exercises (e.g. squat, lunge, push-up, plank, jumping jack). Song sections, dance-step names, or guessed choreography are not enough.
   Reason: "${UNSTRUCTURED_DANCE_REJECT_REASON}"

If you must return JSON for a rejected video, return only:
\`\`\`json
{ "rejected": true, "reason": "<one of the reasons above>" }
\`\`\`
`;

export const IMPORT_VIDEO_ELIGIBILITY_MCP = [
  "Refuse follow-along import (do not call import_full_workout) if the video cannot be watched or playback/embedding is disabled. Tell the user it cannot be imported.",
  "Refuse Zumba, dance cardio, or choreography unless each move is labelled as a known exercise (overlay, callout, or chapter). Do not invent dance-step names.",
].join("\n");
