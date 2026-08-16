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
    description: "Log 10 sets.",
    gamerscore: 10,
    category: "ink",
    target: 10,
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
    description: "Log 160 sets.",
    gamerscore: 25,
    category: "ink",
    target: 160,
    stat: "setCount",
  },
  {
    id: "bound_volume",
    name: "Max Rank",
    description: "Log 640 sets.",
    gamerscore: 50,
    category: "ink",
    target: 640,
    stat: "setCount",
  },
  {
    id: "busy_page",
    name: "Multi-Kill",
    description: "Log 10 sets in one day.",
    gamerscore: 15,
    category: "ink",
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
    target: 40,
    stat: "maxSetsInOneDay",
  },
  {
    id: "named_movements",
    name: "Move Pool",
    description: "Log sets on 20 different exercises.",
    gamerscore: 20,
    category: "ink",
    target: 20,
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
    description: "Log a set on 8 consecutive days.",
    gamerscore: 25,
    category: "days",
    target: 8,
    stat: "longestStreak",
  },
  {
    id: "unbroken_fortnight",
    name: "Don't Break the Chain",
    description: "Log a set on 16 consecutive days.",
    gamerscore: 40,
    category: "days",
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
    target: 32,
    stat: "longestStreak",
  },
  {
    id: "scattered_sessions",
    name: "Casual Queue",
    description: "Log a set on 25 different days.",
    gamerscore: 15,
    category: "days",
    target: 25,
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
    description: "Log sets from 8 different workouts.",
    gamerscore: 20,
    category: "tapes",
    target: 8,
    stat: "uniqueWorkoutCount",
  },
  {
    id: "deep_shelf",
    name: "Completionist",
    description: "Log sets from 32 different workouts.",
    gamerscore: 40,
    category: "tapes",
    target: 32,
    stat: "uniqueWorkoutCount",
  },
  {
    id: "two_follow_alongs",
    name: "Split Screen",
    description: "Log sets from 3 workouts on the same day.",
    gamerscore: 15,
    category: "tapes",
    target: 3,
    stat: "maxUniqueWorkoutsInADay",
  },
  {
    id: "replay_the_cut",
    name: "Speedrun Practice",
    description: "Hit the same workout on 10 different days.",
    gamerscore: 20,
    category: "tapes",
    target: 10,
    stat: "maxDaysOnOneWorkout",
  },
  {
    id: "house_tape",
    name: "Main Quest",
    description: "Log 100 sets on a single workout.",
    gamerscore: 25,
    category: "tapes",
    target: 100,
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
    description: "Log sets tagged with 10 distinct key muscles.",
    gamerscore: 20,
    category: "targets",
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
    target: 40,
    stat: "uniqueKeyMuscleCount",
  },
  {
    id: "press_log",
    name: "Chest Piece",
    description: "Log 80 chest sets.",
    gamerscore: 15,
    category: "targets",
    target: 80,
    stat: "chestSets",
  },
  {
    id: "pull_log",
    name: "Cape Equipped",
    description: "Log 80 back sets.",
    gamerscore: 15,
    category: "targets",
    target: 80,
    stat: "backSets",
  },
  {
    id: "squat_log",
    name: "Greaves",
    description: "Log 80 leg sets.",
    gamerscore: 20,
    category: "targets",
    target: 80,
    stat: "legSets",
  },
  {
    id: "overhead_log",
    name: "Pauldrons",
    description: "Log 50 shoulder sets.",
    gamerscore: 15,
    category: "targets",
    target: 50,
    stat: "shoulderSets",
  },
  {
    id: "isolation_log",
    name: "Gauntlets",
    description: "Log 50 arm sets.",
    gamerscore: 15,
    category: "targets",
    target: 50,
    stat: "armSets",
  },
  {
    id: "midline_log",
    name: "Belt Slot",
    description: "Log 50 core sets.",
    gamerscore: 15,
    category: "targets",
    target: 50,
    stat: "coreSets",
  },
  {
    id: "house_muscle",
    name: "One-Trick",
    description: "Log 320 sets in a single muscle group.",
    gamerscore: 40,
    category: "targets",
    target: 320,
    stat: "maxMuscleGroupSets",
  },
  {
    id: "posterior_line",
    name: "Rear Cam",
    description: "Log 30 sets tagged for rear delts.",
    gamerscore: 20,
    category: "targets",
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
    target: 30,
    stat: "forearmSets",
  },
  {
    id: "hip_drive",
    name: "Charge Attack",
    description: "Log 30 sets tagged for glutes.",
    gamerscore: 20,
    category: "targets",
    target: 30,
    stat: "gluteSets",
  },
  {
    id: "cannon_caps",
    name: "AOE",
    description: "Log 30 sets tagged for side delts.",
    gamerscore: 20,
    category: "targets",
    target: 30,
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
