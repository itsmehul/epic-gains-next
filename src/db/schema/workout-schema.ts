import { relations } from "drizzle-orm";
import {
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
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

export const workout = pgTable(
  "workout",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    author: text("author"),
    channelUrl: text("channel_url"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("workout_userId_idx").on(table.userId),
    index("workout_createdAt_idx").on(table.createdAt),
  ],
);

/** Canonical exercise identity (per-user). Presentation lives on workout_exercise. */
export const exercise = pgTable(
  "exercise",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    metricProfile: metricProfileEnum("metric_profile")
      .notNull()
      .default("CUSTOM"),
    muscleGroup: muscleGroupEnum("muscle_group"),
    keyMuscles: text("key_muscles").array().notNull().default([]),
  },
  (table) => [index("exercise_userId_idx").on(table.userId)],
);

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
    index("set_workoutId_idx").on(table.workoutId),
    index("set_exerciseId_idx").on(table.exerciseId),
    index("set_workoutId_exerciseId_idx").on(table.workoutId, table.exerciseId),
    index("set_createdAt_idx").on(table.createdAt),
    index("set_updatedAt_idx").on(table.updatedAt),
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
  user: one(user, {
    fields: [workout.userId],
    references: [user.id],
  }),
  workoutExercises: many(workoutExercise),
  sets: many(set),
  comments: many(comments),
}));

export const exerciseRelations = relations(exercise, ({ one, many }) => ({
  user: one(user, {
    fields: [exercise.userId],
    references: [user.id],
  }),
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
  workout: one(workout, {
    fields: [set.workoutId],
    references: [workout.id],
  }),
  exercise: one(exercise, {
    fields: [set.exerciseId],
    references: [exercise.id],
  }),
}));

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
