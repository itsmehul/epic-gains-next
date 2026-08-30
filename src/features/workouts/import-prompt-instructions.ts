export const IMPORT_PROMPT_VERSION = "2";

export const IMPORT_PROMPT_VERDICTS = [
  "accurate",
  "inaccurate",
  "unclear",
] as const;

export type ImportPromptVerdict = (typeof IMPORT_PROMPT_VERDICTS)[number];

export type ImportPromptInstruction = {
  id: string;
  group: string;
  title: string;
  body: string;
};

/** Stable IDs for the YouTube import prompt. Used to score extraction quality. */
export const IMPORT_PROMPT_INSTRUCTIONS = [
  {
    id: "eligibility-playback",
    group: "This video",
    title: "The video plays",
    body: "You can watch it here without a blocked or missing stream.",
  },
  {
    id: "eligibility-dance",
    group: "This video",
    title: "This is a named workout",
    body: "Moves are real exercises, not unlabeled dance or choreography.",
  },
  {
    id: "core-skip-non-exercise-chapters",
    group: "The exercise list",
    title: "Intros and breaks are skipped",
    body: "Preview, intro, and rest chapters aren’t treated as exercises.",
  },
  {
    id: "core-extract-chapters",
    group: "The exercise list",
    title: "Chapters are labelled",
    body: "Each move has a chapter when the video has real blocks — Warm Up, Cooldown, Day 1 — and no invented chapter when it doesn’t.",
  },
  {
    id: "naming-canonical",
    group: "Exercise names",
    title: "Names are easy to recognize",
    body: "Familiar names like Squat — not a nickname only this video uses.",
  },
  {
    id: "naming-strip-angles",
    group: "Exercise names",
    title: "Names stay simple",
    body: "Bench angles and degree settings aren’t packed into the name.",
  },
  {
    id: "naming-omit-form-cues",
    group: "Exercise names",
    title: "Grip and form tips aren’t in the name",
    body: "How to do the move isn’t crammed into the title.",
  },
  {
    id: "timestamp-exact-clock",
    group: "Timing",
    title: "Each move starts at the right time",
    body: "The listed start matches the video — not a rounded guess.",
  },
  {
    id: "timestamp-no-synthetic-grid",
    group: "Timing",
    title: "Start times aren’t on a fake grid",
    body: "Moves don’t all start on the same second every minute.",
  },
  {
    id: "timestamp-visual-audio-triggers",
    group: "Timing",
    title: "Times follow the timer or beep",
    body: "We use the on-screen timer or chime, not when they say “let’s go.”",
  },
  {
    id: "timestamp-one-row-per-move",
    group: "Timing",
    title: "The same move isn’t listed twice",
    body: "If a move runs back-to-back, it shows up once.",
  },
  {
    id: "classification-metric-profile",
    group: "How you log it",
    title: "The right way to track the move",
    body: "Reps, a hold, weight, or cardio — whichever matches what you do.",
  },
  {
    id: "classification-muscle-group",
    group: "How you log it",
    title: "The main muscle group is right",
    body: "Chest, back, shoulders, arms, legs, or core.",
  },
  {
    id: "classification-key-muscles",
    group: "How you log it",
    title: "The target muscles make sense",
    body: "The listed muscles match what this move actually works.",
  },
  {
    id: "classification-targets",
    group: "How you log it",
    title: "Sets and reps match the video",
    body: "Suggested sets, reps, time, or weight match what the video asks for.",
  },
] as const satisfies readonly ImportPromptInstruction[];

export const IMPORT_PROMPT_INSTRUCTION_IDS = IMPORT_PROMPT_INSTRUCTIONS.map(
  (item) => item.id,
);

export function importPromptInstructionById(id: string) {
  return IMPORT_PROMPT_INSTRUCTIONS.find((item) => item.id === id) ?? null;
}
