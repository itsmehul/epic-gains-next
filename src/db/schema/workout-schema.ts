import { relations, sql } from "drizzle-orm";
import {
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

export type TargetSet = {
  reps?: number | null;
  weight?: number | null;
  time?: number | null;
  distance?: number | null;
};

export type ExerciseMetaData = {
  videoStartTime?: number;
  videoEndTime?: number;
  targets?: TargetSet[];
  /** Workout chapter / block this appearance belongs to (e.g. Warm Up, Cooldown, Day 1). */
  chapter?: string;
};

export type ImportPromptAnnotation = {
  instructionId: string;
  verdict: "accurate" | "inaccurate" | "unclear";
  note?: string;
};

export const METRIC_PROFILE_VALUES = [
  "WEIGHT_REPS",
  "BODYWEIGHT_REPS",
  "WEIGHTED_REPS",
  "TIMED_HOLD",
  "CARDIO_DISTANCE",
  "LOADED_CARRY",
  "CUSTOM",
] as const;

export type MetricProfile = (typeof METRIC_PROFILE_VALUES)[number];

export const metricProfileEnum = pgEnum(
  "metric_profile",
  METRIC_PROFILE_VALUES,
);

export const MUSCLE_GROUP_VALUES = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "legs",
  "core",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUP_VALUES)[number];

export const muscleGroupEnum = pgEnum("muscle_group", MUSCLE_GROUP_VALUES);

export const WORKOUT_MEMBERSHIP_ROLE_VALUES = ["OWNER", "MEMBER"] as const;

export type WorkoutMembershipRole =
  (typeof WORKOUT_MEMBERSHIP_ROLE_VALUES)[number];

export const workoutMembershipRoleEnum = pgEnum(
  "workout_membership_role",
  WORKOUT_MEMBERSHIP_ROLE_VALUES,
);

export const workout = pgTable(
  "workout",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    author: text("author"),
    channelUrl: text("channel_url"),
    youtubeVideoId: text("youtube_video_id"),
    /** Owner; null when the owner account was deleted (workout is frozen). */
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("workout_userId_idx").on(table.userId),
    index("workout_createdAt_idx").on(table.createdAt),
    uniqueIndex("workout_youtubeVideoId_unique")
      .on(table.youtubeVideoId)
      .where(sql`${table.youtubeVideoId} is not null`),
  ],
);

export const workoutMembership = pgTable(
  "workout_membership",
  {
    workoutId: text("workout_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: workoutMembershipRoleEnum("role").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.workoutId, table.userId],
      name: "workout_membership_pk",
    }),
    foreignKey({
      columns: [table.workoutId],
      foreignColumns: [workout.id],
      name: "workout_membership_workout_id_fk",
    }).onDelete("cascade"),
    index("workout_membership_userId_idx").on(table.userId),
    uniqueIndex("workout_membership_one_owner_idx")
      .on(table.workoutId)
      .where(sql`${table.role} = 'OWNER'`),
  ],
);

/** Canonical exercise identity (global catalog). Presentation lives on workout_exercise. */
export const exercise = pgTable("exercise", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  metricProfile: metricProfileEnum("metric_profile")
    .notNull()
    .default("CUSTOM"),
  muscleGroup: muscleGroupEnum("muscle_group"),
  keyMuscles: text("key_muscles").array().notNull().default([]),
});

/** One appearance of an exercise in a workout. The same exercise may appear more than once. */
export const workoutExercise = pgTable(
  "workout_exercise",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workoutId: text("workout_id").notNull(),
    exerciseId: text("exercise_id").notNull(),
    /** Local display name / alias for this workout appearance. */
    name: text("name").notNull(),
    videoUrl: text("video_url"),
    imageUrl: text("image_url"),
    metaData: jsonb("meta_data").$type<ExerciseMetaData>(),
    tags: text("tags").array().notNull().default([]),
  },
  (table) => [
    foreignKey({
      columns: [table.workoutId],
      foreignColumns: [workout.id],
      name: "workout_exercise_workout_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.exerciseId],
      foreignColumns: [exercise.id],
      name: "workout_exercise_exercise_id_fk",
    }).onDelete("cascade"),
    index("workout_exercise_workoutId_idx").on(table.workoutId),
    index("workout_exercise_exerciseId_idx").on(table.exerciseId),
  ],
);

export const set = pgTable(
  "set",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reps: integer("reps"),
    weight: doublePrecision("weight"),
    time: doublePrecision("time"),
    distance: doublePrecision("distance"),
    workoutId: text("workout_id").notNull(),
    exerciseId: text("exercise_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.workoutId],
      foreignColumns: [workout.id],
      name: "set_workout_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.exerciseId],
      foreignColumns: [exercise.id],
      name: "set_exercise_id_fk",
    }).onDelete("cascade"),
    index("set_userId_idx").on(table.userId),
    index("set_workoutId_idx").on(table.workoutId),
    index("set_exerciseId_idx").on(table.exerciseId),
    index("set_workoutId_exerciseId_idx").on(table.workoutId, table.exerciseId),
    index("set_workoutId_userId_idx").on(table.workoutId, table.userId),
    index("set_createdAt_idx").on(table.createdAt),
    index("set_updatedAt_idx").on(table.updatedAt),
  ],
);

export const importPromptFeedback = pgTable(
  "import_prompt_feedback",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workoutId: text("workout_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    promptVersion: text("prompt_version").notNull(),
    annotations: jsonb("annotations")
      .$type<ImportPromptAnnotation[]>()
      .notNull(),
    comment: text("comment"),
    videoTimestamp: doublePrecision("video_timestamp").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.workoutId],
      foreignColumns: [workout.id],
      name: "import_prompt_feedback_workout_id_fk",
    }).onDelete("cascade"),
    index("import_prompt_feedback_workoutId_idx").on(table.workoutId),
    index("import_prompt_feedback_userId_idx").on(table.userId),
    index("import_prompt_feedback_createdAt_idx").on(table.createdAt),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    exerciseId: text("exercise_id").notNull(),
    workoutId: text("workout_id"),
    text: text("text").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    foreignKey({
      columns: [table.exerciseId],
      foreignColumns: [exercise.id],
      name: "comments_exercise_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workoutId],
      foreignColumns: [workout.id],
      name: "comments_workout_id_fk",
    }).onDelete("cascade"),
    index("comments_exerciseId_idx").on(table.exerciseId),
    index("comments_workoutId_idx").on(table.workoutId),
    index("comments_authorId_idx").on(table.authorId),
    index("comments_createdAt_idx").on(table.createdAt),
    index("comments_exerciseId_workoutId_idx").on(
      table.exerciseId,
      table.workoutId,
    ),
  ],
);

export const workoutRelations = relations(workout, ({ one, many }) => ({
  owner: one(user, {
    fields: [workout.userId],
    references: [user.id],
  }),
  memberships: many(workoutMembership),
  workoutExercises: many(workoutExercise),
  sets: many(set),
  comments: many(comments),
  importPromptFeedback: many(importPromptFeedback),
}));

export const workoutMembershipRelations = relations(
  workoutMembership,
  ({ one }) => ({
    workout: one(workout, {
      fields: [workoutMembership.workoutId],
      references: [workout.id],
    }),
    user: one(user, {
      fields: [workoutMembership.userId],
      references: [user.id],
    }),
  }),
);

export const exerciseRelations = relations(exercise, ({ many }) => ({
  workoutExercises: many(workoutExercise),
  sets: many(set),
  comments: many(comments),
}));

export const workoutExerciseRelations = relations(
  workoutExercise,
  ({ one }) => ({
    workout: one(workout, {
      fields: [workoutExercise.workoutId],
      references: [workout.id],
    }),
    exercise: one(exercise, {
      fields: [workoutExercise.exerciseId],
      references: [exercise.id],
    }),
  }),
);

export const setRelations = relations(set, ({ one }) => ({
  user: one(user, {
    fields: [set.userId],
    references: [user.id],
  }),
  workout: one(workout, {
    fields: [set.workoutId],
    references: [workout.id],
  }),
  exercise: one(exercise, {
    fields: [set.exerciseId],
    references: [exercise.id],
  }),
}));

export const importPromptFeedbackRelations = relations(
  importPromptFeedback,
  ({ one }) => ({
    workout: one(workout, {
      fields: [importPromptFeedback.workoutId],
      references: [workout.id],
    }),
    user: one(user, {
      fields: [importPromptFeedback.userId],
      references: [user.id],
    }),
  }),
);

export const commentsRelations = relations(comments, ({ one }) => ({
  exercise: one(exercise, {
    fields: [comments.exerciseId],
    references: [exercise.id],
  }),
  workout: one(workout, {
    fields: [comments.workoutId],
    references: [workout.id],
  }),
  author: one(user, {
    fields: [comments.authorId],
    references: [user.id],
  }),
}));
