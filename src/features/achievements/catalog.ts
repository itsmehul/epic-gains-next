export const ACHIEVEMENT_CATEGORY_VALUES = [
  "ink",
  "days",
  "tapes",
  "targets",
] as const;

export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORY_VALUES)[number];

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> =
  {
    ink: "Grind",
    days: "Streaks",
    tapes: "Campaign",
    targets: "Loadout",
  };

export type AchievementStatKey =
  | "setCount"
  | "maxSetsInOneDay"
  | "uniqueExerciseCount"
  | "longestStreak"
  | "trainingDayCount"
  | "uniqueWorkoutCount"
  | "maxUniqueWorkoutsInADay"
  | "maxDaysOnOneWorkout"
  | "maxSetsOnOneWorkout"
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
  | "sideDeltSets";

export type AchievementDefinition = {
  id: string;
  name: string;
  description: string;
  gamerscore: number;
  category: AchievementCategory;
  secret?: boolean;
  target: number;
  stat: AchievementStatKey;
};

export const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
  {
    id: "wet_ink",
    name: "Tutorial Complete",
    description: "Log your first set.",
    gamerscore: 5,
    category: "ink",
    target: 1,
    stat: "setCount",
  },
  {
    id: "margin_notes",
    name: "No Longer a Noob",
    description: "Log 12 sets.",
    gamerscore: 10,
    category: "ink",
    target: 12,
    stat: "setCount",
  },
  {
    id: "filled_page",
    name: "XP Farm",
    description: "Log 40 sets.",
    gamerscore: 15,
    category: "ink",
    target: 40,
    stat: "setCount",
  },
  {
    id: "second_pad",
    name: "Power Level",
    description: "Log 120 sets.",
    gamerscore: 25,
    category: "ink",
    target: 120,
    stat: "setCount",
  },
  {
    id: "bound_volume",
    name: "Max Rank",
    description: "Log 300 sets.",
    gamerscore: 50,
    category: "ink",
    target: 300,
    stat: "setCount",
  },
  {
    id: "busy_page",
    name: "Multi-Kill",
    description: "Log 8 sets in one day.",
    gamerscore: 15,
    category: "ink",
    target: 8,
    stat: "maxSetsInOneDay",
  },
  {
    id: "overwritten",
    name: "Rampage",
    description: "Log 18 sets in one day.",
    gamerscore: 30,
    category: "ink",
    secret: true,
    target: 18,
    stat: "maxSetsInOneDay",
  },
  {
    id: "named_movements",
    name: "Move Pool",
    description: "Log sets on 8 different exercises.",
    gamerscore: 20,
    category: "ink",
    target: 8,
    stat: "uniqueExerciseCount",
  },
  {
    id: "back_to_back",
    name: "Daily Login",
    description: "Log a set on 2 consecutive days.",
    gamerscore: 10,
    category: "days",
    target: 2,
    stat: "longestStreak",
  },
  {
    id: "open_week",
    name: "On a Roll",
    description: "Log a set on 4 consecutive days.",
    gamerscore: 15,
    category: "days",
    target: 4,
    stat: "longestStreak",
  },
  {
    id: "seven_ticks",
    name: "Week 1 Clear",
    description: "Log a set on 7 consecutive days.",
    gamerscore: 25,
    category: "days",
    target: 7,
    stat: "longestStreak",
  },
  {
    id: "unbroken_fortnight",
    name: "Don't Break the Chain",
    description: "Log a set on 14 consecutive days.",
    gamerscore: 40,
    category: "days",
    target: 14,
    stat: "longestStreak",
  },
  {
    id: "month_of_checkmarks",
    name: "Hardcore Mode",
    description: "Log a set on 30 consecutive days.",
    gamerscore: 80,
    category: "days",
    secret: true,
    target: 30,
    stat: "longestStreak",
  },
  {
    id: "scattered_sessions",
    name: "Casual Queue",
    description: "Log a set on 10 different days.",
    gamerscore: 15,
    category: "days",
    target: 10,
    stat: "trainingDayCount",
  },
  {
    id: "second_tape",
    name: "New Game+",
    description: "Log sets from 2 different workouts.",
    gamerscore: 10,
    category: "tapes",
    target: 2,
    stat: "uniqueWorkoutCount",
  },
  {
    id: "mixed_follow",
    name: "DLC Collector",
    description: "Log sets from 6 different workouts.",
    gamerscore: 20,
    category: "tapes",
    target: 6,
    stat: "uniqueWorkoutCount",
  },
  {
    id: "deep_shelf",
    name: "Completionist",
    description: "Log sets from 16 different workouts.",
    gamerscore: 40,
    category: "tapes",
    target: 16,
    stat: "uniqueWorkoutCount",
  },
  {
    id: "two_follow_alongs",
    name: "Split Screen",
    description: "Log sets from 2 workouts on the same day.",
    gamerscore: 15,
    category: "tapes",
    target: 2,
    stat: "maxUniqueWorkoutsInADay",
  },
  {
    id: "replay_the_cut",
    name: "Speedrun Practice",
    description: "Hit the same workout on 5 different days.",
    gamerscore: 20,
    category: "tapes",
    target: 5,
    stat: "maxDaysOnOneWorkout",
  },
  {
    id: "house_tape",
    name: "Main Quest",
    description: "Log 25 sets on a single workout.",
    gamerscore: 25,
    category: "tapes",
    target: 25,
    stat: "maxSetsOnOneWorkout",
  },
  {
    id: "second_region",
    name: "Dual Spec",
    description: "Log sets in 2 muscle groups.",
    gamerscore: 10,
    category: "targets",
    target: 2,
    stat: "uniqueMuscleGroupCount",
  },
  {
    id: "four_corners",
    name: "Squad Fill",
    description: "Log sets in 4 muscle groups.",
    gamerscore: 20,
    category: "targets",
    target: 4,
    stat: "uniqueMuscleGroupCount",
  },
  {
    id: "whole_map",
    name: "Full Party",
    description: "Log a set in every muscle group.",
    gamerscore: 50,
    category: "targets",
    target: 6,
    stat: "uniqueMuscleGroupCount",
  },
  {
    id: "named_fibers",
    name: "Skill Tree",
    description: "Log sets tagged with 8 distinct key muscles.",
    gamerscore: 20,
    category: "targets",
    target: 8,
    stat: "uniqueKeyMuscleCount",
  },
  {
    id: "fine_print",
    name: "Min-Maxed",
    description: "Log sets tagged with 18 distinct key muscles.",
    gamerscore: 40,
    category: "targets",
    secret: true,
    target: 18,
    stat: "uniqueKeyMuscleCount",
  },
  {
    id: "press_log",
    name: "Chest Piece",
    description: "Log 30 chest sets.",
    gamerscore: 15,
    category: "targets",
    target: 30,
    stat: "chestSets",
  },
  {
    id: "pull_log",
    name: "Cape Equipped",
    description: "Log 30 back sets.",
    gamerscore: 15,
    category: "targets",
    target: 30,
    stat: "backSets",
  },
  {
    id: "squat_log",
    name: "Greaves",
    description: "Log 30 leg sets.",
    gamerscore: 20,
    category: "targets",
    target: 30,
    stat: "legSets",
  },
  {
    id: "overhead_log",
    name: "Pauldrons",
    description: "Log 20 shoulder sets.",
    gamerscore: 15,
    category: "targets",
    target: 20,
    stat: "shoulderSets",
  },
  {
    id: "isolation_log",
    name: "Gauntlets",
    description: "Log 20 arm sets.",
    gamerscore: 15,
    category: "targets",
    target: 20,
    stat: "armSets",
  },
  {
    id: "midline_log",
    name: "Belt Slot",
    description: "Log 20 core sets.",
    gamerscore: 15,
    category: "targets",
    target: 20,
    stat: "coreSets",
  },
  {
    id: "house_muscle",
    name: "One-Trick",
    description: "Log 80 sets in a single muscle group.",
    gamerscore: 40,
    category: "targets",
    target: 80,
    stat: "maxMuscleGroupSets",
  },
  {
    id: "posterior_line",
    name: "Rear Cam",
    description: "Log 12 sets tagged for rear delts.",
    gamerscore: 20,
    category: "targets",
    target: 12,
    stat: "rearDeltSets",
  },
  {
    id: "lower_leg_line",
    name: "Hidden Stat",
    description: "Log 12 sets tagged for calves.",
    gamerscore: 20,
    category: "targets",
    secret: true,
    target: 12,
    stat: "calfSets",
  },
  {
    id: "grip_line",
    name: "Button Masher",
    description: "Log 12 sets tagged for forearms.",
    gamerscore: 20,
    category: "targets",
    secret: true,
    target: 12,
    stat: "forearmSets",
  },
  {
    id: "hip_drive",
    name: "Charge Attack",
    description: "Log 12 sets tagged for glutes.",
    gamerscore: 20,
    category: "targets",
    target: 12,
    stat: "gluteSets",
  },
  {
    id: "cannon_caps",
    name: "AOE",
    description: "Log 12 sets tagged for side delts.",
    gamerscore: 20,
    category: "targets",
    target: 12,
    stat: "sideDeltSets",
  },
];

export const ACHIEVEMENT_BY_ID = new Map(
  ACHIEVEMENT_CATALOG.map((item) => [item.id, item]),
);

export const TOTAL_GAMERSCORE = ACHIEVEMENT_CATALOG.reduce(
  (sum, item) => sum + item.gamerscore,
  0,
);
