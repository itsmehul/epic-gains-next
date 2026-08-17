import type { MetricProfile } from "@/db/schema/workout-schema";

export const ACHIEVEMENT_CATEGORY_VALUES = [
  "ink",
  "days",
  "tapes",
  "targets",
  "hud",
] as const;

export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORY_VALUES)[number];

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> =
{
  ink: "Grind",
  days: "Streaks",
  tapes: "Campaign",
  targets: "Loadout",
  hud: "HUD",
};

export type AchievementScope = "global" | "workout";

export type GlobalAchievementStatKey =
  | "setCount"
  | "maxSetsInOneDay"
  | "uniqueExerciseCount"
  | "longestStreak"
  | "trainingDayCount"
  | "uniqueWorkoutCount"
  | "maxUniqueWorkoutsInADay"
  | "uniqueMuscleGroupCount"
  | "uniqueKeyMuscleCount"
  | "maxMuscleGroupSets"
  | "chestSets"
  | "backSets"
  | "shoulderSets"
  | "armSets"
  | "legSets"
  | "coreSets"
  | "rearDeltSets"
  | "calfSets"
  | "forearmSets"
  | "gluteSets"
  | "sideDeltSets"
  | "startedWorkoutCount"
  | "completedWorkoutCount"
  | "abandonedStartCount"
  | "maxWorkoutLadderProgress"
  | "weightRepsSets"
  | "bodyweightRepsSets"
  | "weightedRepsSets"
  | "timedHoldSets"
  | "cardioDistanceSets"
  | "loadedCarrySets"
  | "customSets"
  | "uniqueMetricProfileCount";

export type WorkoutAchievementStatKey =
  | "setCount"
  | "uniqueExerciseCount"
  | "trainingDayCount"
  | "maxSetsInOneDay"
  | "fullRoster"
  | "prescribedRoster"
  | "sameDayFullRoster"
  | "sameDayFullRosterCount"
  | "sameDayPrescribedRosterCount"
  | "longestStreak"
  | "metricSetCount"
  | "metricRoster";

export type AchievementStatKey =
  | GlobalAchievementStatKey
  | WorkoutAchievementStatKey;

type AchievementBase = {
  id: string;
  name: string;
  description: string;
  gamerscore: number;
  category: AchievementCategory;
  secret?: boolean;
  target: number;
};

export type GlobalAchievementDefinition = AchievementBase & {
  scope: "global";
  stat: GlobalAchievementStatKey;
  /** Unlock only when this other stat is exactly 0 (e.g. started many, completed none). */
  zeroStat?: GlobalAchievementStatKey;
};

export const WORKOUT_ACHIEVEMENT_TIER_VALUES = [
  "bronze",
  "silver",
  "gold",
  "platinum",
] as const;

export type WorkoutAchievementTier =
  (typeof WORKOUT_ACHIEVEMENT_TIER_VALUES)[number];

export const WORKOUT_ACHIEVEMENT_TIER_LABELS: Record<
  WorkoutAchievementTier,
  string
> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

export type WorkoutAchievementTargetScale =
  | "fixed"
  | "roster"
  | "prescribed"
  | "prescribedx4";

export type WorkoutAchievementDefinition = AchievementBase & {
  scope: "workout";
  stat: WorkoutAchievementStatKey;
  /** Rank of this rung. Bronze is the campaign clear. */
  tier?: WorkoutAchievementTier;
  /** How the listed `target` is replaced from the workout roster. */
  targetScale?: WorkoutAchievementTargetScale;
  /** Multiplier applied when `targetScale` is `prescribed`. */
  volumeMultiplier?: number;
  /**
   * When false, this is a bonus rung and does not count toward workout
   * ladder completion.
   */
  ladder?: boolean;
  /** Only offered when the workout roster includes this metric profile. */
  metricProfile?: MetricProfile;
};

export type AchievementDefinition =
  | GlobalAchievementDefinition
  | WorkoutAchievementDefinition;

export const GLOBAL_ACHIEVEMENT_CATALOG: GlobalAchievementDefinition[] = [
  {
    id: "wet_ink",
    name: "Tutorial Complete",
    description: "Log your first set.",
    gamerscore: 5,
    category: "ink",
    scope: "global",
    target: 1,
    stat: "setCount",
  },
  {
    id: "margin_notes",
    name: "No Longer a Noob",
    description: "Log 10 sets.",
    gamerscore: 10,
    category: "ink",
    scope: "global",
    target: 10,
    stat: "setCount",
  },
  {
    id: "filled_page",
    name: "XP Farm",
    description: "Log 40 sets.",
    gamerscore: 15,
    category: "ink",
    scope: "global",
    target: 40,
    stat: "setCount",
  },
  {
    id: "second_pad",
    name: "Power Level",
    description: "Log 160 sets.",
    gamerscore: 25,
    category: "ink",
    scope: "global",
    target: 160,
    stat: "setCount",
  },
  {
    id: "bound_volume",
    name: "Max Rank",
    description: "Log 640 sets.",
    gamerscore: 50,
    category: "ink",
    scope: "global",
    target: 640,
    stat: "setCount",
  },
  {
    id: "busy_page",
    name: "Multi-Kill",
    description: "Log 10 sets in one day.",
    gamerscore: 15,
    category: "ink",
    scope: "global",
    target: 10,
    stat: "maxSetsInOneDay",
  },
  {
    id: "overwritten",
    name: "Rampage",
    description: "Log 40 sets in one day.",
    gamerscore: 30,
    category: "ink",
    secret: true,
    scope: "global",
    target: 40,
    stat: "maxSetsInOneDay",
  },
  {
    id: "named_movements",
    name: "Move Pool",
    description: "Log sets on 20 different exercises.",
    gamerscore: 20,
    category: "ink",
    scope: "global",
    target: 20,
    stat: "uniqueExerciseCount",
  },
  {
    id: "back_to_back",
    name: "Daily Login",
    description: "Log a set on 2 consecutive days.",
    gamerscore: 10,
    category: "days",
    scope: "global",
    target: 2,
    stat: "longestStreak",
  },
  {
    id: "open_week",
    name: "On a Roll",
    description: "Log a set on 4 consecutive days.",
    gamerscore: 15,
    category: "days",
    scope: "global",
    target: 4,
    stat: "longestStreak",
  },
  {
    id: "seven_ticks",
    name: "Week 1 Clear",
    description: "Log a set on 8 consecutive days.",
    gamerscore: 25,
    category: "days",
    scope: "global",
    target: 8,
    stat: "longestStreak",
  },
  {
    id: "unbroken_fortnight",
    name: "Don't Break the Chain",
    description: "Log a set on 16 consecutive days.",
    gamerscore: 40,
    category: "days",
    scope: "global",
    target: 16,
    stat: "longestStreak",
  },
  {
    id: "month_of_checkmarks",
    name: "Hardcore Mode",
    description: "Log a set on 32 consecutive days.",
    gamerscore: 80,
    category: "days",
    secret: true,
    scope: "global",
    target: 32,
    stat: "longestStreak",
  },
  {
    id: "scattered_sessions",
    name: "Casual Queue",
    description: "Log a set on 25 different days.",
    gamerscore: 15,
    category: "days",
    scope: "global",
    target: 25,
    stat: "trainingDayCount",
  },
  {
    id: "second_tape",
    name: "New Game+",
    description: "Start 2 different workouts.",
    gamerscore: 10,
    category: "tapes",
    scope: "global",
    target: 2,
    stat: "startedWorkoutCount",
  },
  {
    id: "mixed_follow",
    name: "DLC Collector",
    description: "Start 8 different workouts.",
    gamerscore: 20,
    category: "tapes",
    scope: "global",
    target: 8,
    stat: "startedWorkoutCount",
  },
  {
    id: "deep_shelf",
    name: "Completionist",
    description: "Start 32 different workouts.",
    gamerscore: 40,
    category: "tapes",
    scope: "global",
    target: 32,
    stat: "startedWorkoutCount",
  },
  {
    id: "two_follow_alongs",
    name: "Split Screen",
    description: "Log sets from 3 workouts on the same day.",
    gamerscore: 15,
    category: "tapes",
    scope: "global",
    target: 3,
    stat: "maxUniqueWorkoutsInADay",
  },
  {
    id: "three_clears",
    name: "Party Wipe",
    description: "Finish the achievement ladder on 3 different workouts.",
    gamerscore: 20,
    category: "tapes",
    scope: "global",
    target: 3,
    stat: "completedWorkoutCount",
  },
  {
    id: "ten_clears",
    name: "Raid Leader",
    description: "Finish the achievement ladder on 10 different workouts.",
    gamerscore: 40,
    category: "tapes",
    scope: "global",
    target: 10,
    stat: "completedWorkoutCount",
  },
  {
    id: "window_shopper",
    name: "Demo Disc",
    description: "Start 10 workouts without fully completing any of them.",
    gamerscore: 15,
    category: "tapes",
    scope: "global",
    target: 10,
    stat: "startedWorkoutCount",
    zeroStat: "completedWorkoutCount",
  },
  {
    id: "commitment_issues",
    name: "Side Quest Collector",
    description: "Start 5 workouts without finishing their achievement ladders.",
    gamerscore: 15,
    category: "tapes",
    scope: "global",
    target: 5,
    stat: "abandonedStartCount",
  },
  {
    id: "almost_there",
    name: "Final Boss Nearby",
    description: "Unlock 6 of 7 achievements on a single workout.",
    gamerscore: 15,
    category: "tapes",
    scope: "global",
    target: 6,
    stat: "maxWorkoutLadderProgress",
  },
  {
    id: "second_region",
    name: "Dual Spec",
    description: "Log sets in 2 muscle groups.",
    gamerscore: 10,
    category: "targets",
    scope: "global",
    target: 2,
    stat: "uniqueMuscleGroupCount",
  },
  {
    id: "four_corners",
    name: "Squad Fill",
    description: "Log sets in 4 muscle groups.",
    gamerscore: 20,
    category: "targets",
    scope: "global",
    target: 4,
    stat: "uniqueMuscleGroupCount",
  },
  {
    id: "whole_map",
    name: "Full Party",
    description: "Log a set in every muscle group.",
    gamerscore: 50,
    category: "targets",
    scope: "global",
    target: 6,
    stat: "uniqueMuscleGroupCount",
  },
  {
    id: "named_fibers",
    name: "Skill Tree",
    description: "Log sets tagged with 10 distinct key muscles.",
    gamerscore: 20,
    category: "targets",
    scope: "global",
    target: 10,
    stat: "uniqueKeyMuscleCount",
  },
  {
    id: "fine_print",
    name: "Min-Maxed",
    description: "Log sets tagged with 40 distinct key muscles.",
    gamerscore: 40,
    category: "targets",
    secret: true,
    scope: "global",
    target: 40,
    stat: "uniqueKeyMuscleCount",
  },
  {
    id: "press_log",
    name: "Chest Piece",
    description: "Log 80 chest sets.",
    gamerscore: 15,
    category: "targets",
    scope: "global",
    target: 80,
    stat: "chestSets",
  },
  {
    id: "pull_log",
    name: "Cape Equipped",
    description: "Log 80 back sets.",
    gamerscore: 15,
    category: "targets",
    scope: "global",
    target: 80,
    stat: "backSets",
  },
  {
    id: "squat_log",
    name: "Greaves",
    description: "Log 80 leg sets.",
    gamerscore: 20,
    category: "targets",
    scope: "global",
    target: 80,
    stat: "legSets",
  },
  {
    id: "overhead_log",
    name: "Pauldrons",
    description: "Log 50 shoulder sets.",
    gamerscore: 15,
    category: "targets",
    scope: "global",
    target: 50,
    stat: "shoulderSets",
  },
  {
    id: "isolation_log",
    name: "Gauntlets",
    description: "Log 50 arm sets.",
    gamerscore: 15,
    category: "targets",
    scope: "global",
    target: 50,
    stat: "armSets",
  },
  {
    id: "midline_log",
    name: "Belt Slot",
    description: "Log 50 core sets.",
    gamerscore: 15,
    category: "targets",
    scope: "global",
    target: 50,
    stat: "coreSets",
  },
  {
    id: "house_muscle",
    name: "One-Trick",
    description: "Log 320 sets in a single muscle group.",
    gamerscore: 40,
    category: "targets",
    scope: "global",
    target: 320,
    stat: "maxMuscleGroupSets",
  },
  {
    id: "posterior_line",
    name: "Rear Cam",
    description: "Log 30 sets tagged for rear delts.",
    gamerscore: 20,
    category: "targets",
    scope: "global",
    target: 30,
    stat: "rearDeltSets",
  },
  {
    id: "lower_leg_line",
    name: "Hidden Stat",
    description: "Log 30 sets tagged for calves.",
    gamerscore: 20,
    category: "targets",
    secret: true,
    scope: "global",
    target: 30,
    stat: "calfSets",
  },
  {
    id: "grip_line",
    name: "Button Masher",
    description: "Log 30 sets tagged for forearms.",
    gamerscore: 20,
    category: "targets",
    secret: true,
    scope: "global",
    target: 30,
    stat: "forearmSets",
  },
  {
    id: "hip_drive",
    name: "Charge Attack",
    description: "Log 30 sets tagged for glutes.",
    gamerscore: 20,
    category: "targets",
    scope: "global",
    target: 30,
    stat: "gluteSets",
  },
  {
    id: "cannon_caps",
    name: "AOE",
    description: "Log 30 sets tagged for side delts.",
    gamerscore: 20,
    category: "targets",
    scope: "global",
    target: 30,
    stat: "sideDeltSets",
  },
  {
    id: "barbell_hud",
    name: "Barbell HUD",
    description: "Log a weight × reps set.",
    gamerscore: 5,
    category: "hud",
    scope: "global",
    target: 1,
    stat: "weightRepsSets",
  },
  {
    id: "plate_math",
    name: "Plate Math",
    description: "Log 25 weight × reps sets.",
    gamerscore: 15,
    category: "hud",
    scope: "global",
    target: 25,
    stat: "weightRepsSets",
  },
  {
    id: "gravity_well",
    name: "Gravity Well",
    description: "Log a bodyweight-reps set.",
    gamerscore: 5,
    category: "hud",
    scope: "global",
    target: 1,
    stat: "bodyweightRepsSets",
  },
  {
    id: "air_time",
    name: "Air Time",
    description: "Log 25 bodyweight-reps sets.",
    gamerscore: 15,
    category: "hud",
    scope: "global",
    target: 25,
    stat: "bodyweightRepsSets",
  },
  {
    id: "plus_plates",
    name: "Plus Plates",
    description: "Log a weighted-reps set.",
    gamerscore: 5,
    category: "hud",
    scope: "global",
    target: 1,
    stat: "weightedRepsSets",
  },
  {
    id: "overclocked",
    name: "Overclocked",
    description: "Log 15 weighted-reps sets.",
    gamerscore: 15,
    category: "hud",
    scope: "global",
    target: 15,
    stat: "weightedRepsSets",
  },
  {
    id: "pause_buffer",
    name: "Pause Buffer",
    description: "Log a timed hold.",
    gamerscore: 5,
    category: "hud",
    scope: "global",
    target: 1,
    stat: "timedHoldSets",
  },
  {
    id: "afk_check",
    name: "AFK Check",
    description: "Log 15 timed holds.",
    gamerscore: 15,
    category: "hud",
    scope: "global",
    target: 15,
    stat: "timedHoldSets",
  },
  {
    id: "loading_walk",
    name: "Loading Screen Walk",
    description: "Log a cardio distance set.",
    gamerscore: 5,
    category: "hud",
    scope: "global",
    target: 1,
    stat: "cardioDistanceSets",
  },
  {
    id: "open_world",
    name: "Open World",
    description: "Log 15 cardio distance sets.",
    gamerscore: 15,
    category: "hud",
    scope: "global",
    target: 15,
    stat: "cardioDistanceSets",
  },
  {
    id: "inventory_mgmt",
    name: "Inventory Management",
    description: "Log a loaded carry.",
    gamerscore: 5,
    category: "hud",
    scope: "global",
    target: 1,
    stat: "loadedCarrySets",
  },
  {
    id: "encumbered",
    name: "Encumbered",
    description: "Log 10 loaded carries.",
    gamerscore: 15,
    category: "hud",
    scope: "global",
    target: 10,
    stat: "loadedCarrySets",
  },
  {
    id: "class_change",
    name: "Class Change",
    description: "Log 3 different classes.",
    gamerscore: 15,
    category: "hud",
    scope: "global",
    target: 3,
    stat: "uniqueMetricProfileCount",
  },
  {
    id: "polymath",
    name: "Polymath",
    description: "Unlock every class.",
    gamerscore: 40,
    category: "hud",
    secret: true,
    scope: "global",
    target: 6,
    stat: "uniqueMetricProfileCount",
  },
];

export const WORKOUT_BRONZE_CATALOG: WorkoutAchievementDefinition[] = [
  {
    id: "wo_tutorial",
    name: "Tutorial Complete",
    description: "Log your first set on this workout.",
    gamerscore: 5,
    category: "ink",
    scope: "workout",
    tier: "bronze",
    target: 1,
    stat: "setCount",
  },
  {
    id: "wo_roster",
    name: "Full Cast",
    description: "Log at least one set on every exercise in this workout.",
    gamerscore: 10,
    category: "ink",
    scope: "workout",
    tier: "bronze",
    target: 1,
    targetScale: "roster",
    stat: "fullRoster",
  },
  {
    id: "wo_volume_i",
    name: "Warm-Up Sets",
    description: "Log {target} sets on this workout.",
    gamerscore: 10,
    category: "ink",
    scope: "workout",
    tier: "bronze",
    target: 12,
    targetScale: "prescribed",
    stat: "setCount",
  },
  {
    id: "wo_volume_ii",
    name: "Main Quest",
    description: "Log {target} sets on this workout.",
    gamerscore: 15,
    category: "ink",
    scope: "workout",
    tier: "bronze",
    target: 48,
    targetScale: "prescribedx4",
    stat: "setCount",
  },
  {
    id: "wo_days",
    name: "Replay Value",
    description: "Train this workout on 5 different days.",
    gamerscore: 15,
    category: "days",
    scope: "workout",
    tier: "bronze",
    target: 5,
    stat: "trainingDayCount",
  },
  {
    id: "wo_same_day",
    name: "One Sitting",
    description: "Log every exercise in this workout on the same day.",
    gamerscore: 20,
    category: "tapes",
    scope: "workout",
    tier: "bronze",
    target: 1,
    stat: "sameDayFullRoster",
  },
  {
    id: "wo_one_sitting",
    name: "Speedrun",
    description: "Log {target} sets on this workout in one day.",
    gamerscore: 25,
    category: "ink",
    secret: true,
    scope: "workout",
    tier: "bronze",
    target: 20,
    targetScale: "prescribed",
    stat: "maxSetsInOneDay",
  },
];

export const WORKOUT_SILVER_CATALOG: WorkoutAchievementDefinition[] = [
  {
    id: "wo_ag_quota",
    name: "Set Quota",
    description: "Log the prescribed sets on every exercise in this workout.",
    gamerscore: 15,
    category: "ink",
    scope: "workout",
    tier: "silver",
    target: 1,
    targetScale: "roster",
    stat: "prescribedRoster",
  },
  {
    id: "wo_ag_volume",
    name: "New Game+",
    description: "Log {target} sets on this workout.",
    gamerscore: 20,
    category: "ink",
    scope: "workout",
    tier: "silver",
    target: 96,
    targetScale: "prescribed",
    volumeMultiplier: 8,
    stat: "setCount",
  },
  {
    id: "wo_ag_days",
    name: "Season Pass",
    description: "Train this workout on 10 different days.",
    gamerscore: 20,
    category: "days",
    scope: "workout",
    tier: "silver",
    target: 10,
    stat: "trainingDayCount",
  },
  {
    id: "wo_ag_roster_days",
    name: "Triple Feature",
    description: "Log every exercise in this workout on 3 different days.",
    gamerscore: 25,
    category: "tapes",
    scope: "workout",
    tier: "silver",
    target: 3,
    stat: "sameDayFullRosterCount",
  },
  {
    id: "wo_ag_streak",
    name: "Login Streak",
    description: "Train this workout on 3 consecutive days.",
    gamerscore: 25,
    category: "days",
    scope: "workout",
    tier: "silver",
    target: 3,
    stat: "longestStreak",
  },
  {
    id: "wo_ag_session",
    name: "Session Clear",
    description: "Log {target} sets on this workout in one day.",
    gamerscore: 30,
    category: "ink",
    scope: "workout",
    tier: "silver",
    target: 20,
    targetScale: "prescribed",
    stat: "maxSetsInOneDay",
  },
  {
    id: "wo_ag_speedrun",
    name: "NG+ Speedrun",
    description: "Log {target} sets on this workout in one day.",
    gamerscore: 40,
    category: "ink",
    secret: true,
    scope: "workout",
    tier: "silver",
    target: 40,
    targetScale: "prescribed",
    volumeMultiplier: 2,
    stat: "maxSetsInOneDay",
  },
];

export const WORKOUT_GOLD_CATALOG: WorkoutAchievementDefinition[] = [
  {
    id: "wo_au_perfect",
    name: "Perfect Loop",
    description:
      "Log the prescribed sets on every exercise in this workout in one day.",
    gamerscore: 20,
    category: "tapes",
    scope: "workout",
    tier: "gold",
    target: 1,
    stat: "sameDayPrescribedRosterCount",
  },
  {
    id: "wo_au_volume",
    name: "Prestige",
    description: "Log {target} sets on this workout.",
    gamerscore: 30,
    category: "ink",
    scope: "workout",
    tier: "gold",
    target: 192,
    targetScale: "prescribed",
    volumeMultiplier: 16,
    stat: "setCount",
  },
  {
    id: "wo_au_days",
    name: "Campaign Hours",
    description: "Train this workout on 20 different days.",
    gamerscore: 30,
    category: "days",
    scope: "workout",
    tier: "gold",
    target: 20,
    stat: "trainingDayCount",
  },
  {
    id: "wo_au_roster_days",
    name: "Penta Clear",
    description: "Log every exercise in this workout on 5 different days.",
    gamerscore: 35,
    category: "tapes",
    scope: "workout",
    tier: "gold",
    target: 5,
    stat: "sameDayFullRosterCount",
  },
  {
    id: "wo_au_streak",
    name: "Don't Break",
    description: "Train this workout on 5 consecutive days.",
    gamerscore: 35,
    category: "days",
    scope: "workout",
    tier: "gold",
    target: 5,
    stat: "longestStreak",
  },
  {
    id: "wo_au_split",
    name: "Gold Split",
    description: "Log {target} sets on this workout in one day.",
    gamerscore: 40,
    category: "ink",
    scope: "workout",
    tier: "gold",
    target: 60,
    targetScale: "prescribed",
    volumeMultiplier: 3,
    stat: "maxSetsInOneDay",
  },
  {
    id: "wo_au_nohit",
    name: "No-Hit Run",
    description: "Log {target} sets on this workout in one day.",
    gamerscore: 50,
    category: "ink",
    secret: true,
    scope: "workout",
    tier: "gold",
    target: 80,
    targetScale: "prescribed",
    volumeMultiplier: 4,
    stat: "maxSetsInOneDay",
  },
];

export const WORKOUT_PLATINUM_CATALOG: WorkoutAchievementDefinition[] = [
  {
    id: "wo_pt_mythic",
    name: "Mythic Loop",
    description:
      "Log the prescribed sets on every exercise in this workout on 3 different days.",
    gamerscore: 30,
    category: "tapes",
    scope: "workout",
    tier: "platinum",
    target: 3,
    stat: "sameDayPrescribedRosterCount",
  },
  {
    id: "wo_pt_volume",
    name: "Endgame",
    description: "Log {target} sets on this workout.",
    gamerscore: 40,
    category: "ink",
    scope: "workout",
    tier: "platinum",
    target: 384,
    targetScale: "prescribed",
    volumeMultiplier: 32,
    stat: "setCount",
  },
  {
    id: "wo_pt_days",
    name: "Lifetime",
    description: "Train this workout on 40 different days.",
    gamerscore: 40,
    category: "days",
    scope: "workout",
    tier: "platinum",
    target: 40,
    stat: "trainingDayCount",
  },
  {
    id: "wo_pt_roster_days",
    name: "Octo Clear",
    description: "Log every exercise in this workout on 8 different days.",
    gamerscore: 50,
    category: "tapes",
    scope: "workout",
    tier: "platinum",
    target: 8,
    stat: "sameDayFullRosterCount",
  },
  {
    id: "wo_pt_streak",
    name: "Hardcore Chain",
    description: "Train this workout on 8 consecutive days.",
    gamerscore: 50,
    category: "days",
    scope: "workout",
    tier: "platinum",
    target: 8,
    stat: "longestStreak",
  },
  {
    id: "wo_pt_split",
    name: "Platinum Split",
    description: "Log {target} sets on this workout in one day.",
    gamerscore: 60,
    category: "ink",
    scope: "workout",
    tier: "platinum",
    target: 80,
    targetScale: "prescribed",
    volumeMultiplier: 4,
    stat: "maxSetsInOneDay",
  },
  {
    id: "wo_pt_record",
    name: "World Record",
    description: "Log {target} sets on this workout in one day.",
    gamerscore: 80,
    category: "ink",
    secret: true,
    scope: "workout",
    tier: "platinum",
    target: 100,
    targetScale: "prescribed",
    volumeMultiplier: 5,
    stat: "maxSetsInOneDay",
  },
];

export const WORKOUT_ACHIEVEMENT_CATALOG: WorkoutAchievementDefinition[] = [
  ...WORKOUT_BRONZE_CATALOG,
  ...WORKOUT_SILVER_CATALOG,
  ...WORKOUT_GOLD_CATALOG,
  ...WORKOUT_PLATINUM_CATALOG,
];

export const WORKOUT_HUD_CATALOG: WorkoutAchievementDefinition[] = [
  {
    id: "wo_hud_weight_reps",
    name: "Iron Cast",
    description: "Log every weight × reps exercise in this workout.",
    gamerscore: 10,
    category: "hud",
    scope: "workout",
    target: 1,
    targetScale: "roster",
    stat: "metricRoster",
    ladder: false,
    metricProfile: "WEIGHT_REPS",
  },
  {
    id: "wo_hud_bodyweight",
    name: "No-Equip Run",
    description: "Log every bodyweight exercise in this workout.",
    gamerscore: 10,
    category: "hud",
    scope: "workout",
    target: 1,
    targetScale: "roster",
    stat: "metricRoster",
    ladder: false,
    metricProfile: "BODYWEIGHT_REPS",
  },
  {
    id: "wo_hud_weighted",
    name: "Extra Life",
    description: "Log every weighted-reps exercise in this workout.",
    gamerscore: 10,
    category: "hud",
    scope: "workout",
    target: 1,
    targetScale: "roster",
    stat: "metricRoster",
    ladder: false,
    metricProfile: "WEIGHTED_REPS",
  },
  {
    id: "wo_hud_hold",
    name: "Hold Party",
    description: "Log every timed hold in this workout.",
    gamerscore: 10,
    category: "hud",
    scope: "workout",
    target: 1,
    targetScale: "roster",
    stat: "metricRoster",
    ladder: false,
    metricProfile: "TIMED_HOLD",
  },
  {
    id: "wo_hud_cardio",
    name: "Cardio Side Quest",
    description: "Log every cardio distance exercise in this workout.",
    gamerscore: 10,
    category: "hud",
    scope: "workout",
    target: 1,
    targetScale: "roster",
    stat: "metricRoster",
    ladder: false,
    metricProfile: "CARDIO_DISTANCE",
  },
  {
    id: "wo_hud_carry",
    name: "Carry Quest",
    description: "Log every loaded carry in this workout.",
    gamerscore: 10,
    category: "hud",
    scope: "workout",
    target: 1,
    targetScale: "roster",
    stat: "metricRoster",
    ladder: false,
    metricProfile: "LOADED_CARRY",
  },
  {
    id: "wo_hud_custom",
    name: "House Rules",
    description: "Log every house-rules exercise in this workout.",
    gamerscore: 10,
    category: "hud",
    scope: "workout",
    target: 1,
    targetScale: "roster",
    stat: "metricRoster",
    ladder: false,
    metricProfile: "CUSTOM",
  },
];

export const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
  ...GLOBAL_ACHIEVEMENT_CATALOG,
  ...WORKOUT_ACHIEVEMENT_CATALOG,
  ...WORKOUT_HUD_CATALOG,
];

export const ACHIEVEMENT_BY_ID = new Map(
  ACHIEVEMENT_CATALOG.map((item) => [item.id, item]),
);

export function isWorkoutLadderAchievement(
  definition: WorkoutAchievementDefinition,
) {
  return definition.ladder !== false;
}

export function isBronzeWorkoutAchievement(id: string) {
  return WORKOUT_BRONZE_CATALOG.some((definition) => definition.id === id);
}

/** Campaign clear: bronze rungs only. */
export const WORKOUT_ACHIEVEMENT_COUNT = WORKOUT_BRONZE_CATALOG.length;

export const GLOBAL_GAMERSCORE = GLOBAL_ACHIEVEMENT_CATALOG.reduce(
  (sum, item) => sum + item.gamerscore,
  0,
);

export const WORKOUT_LADDER_GAMERSCORE = WORKOUT_ACHIEVEMENT_CATALOG.reduce(
  (sum, item) => sum + item.gamerscore,
  0,
);

export const TOTAL_GAMERSCORE = GLOBAL_GAMERSCORE;
