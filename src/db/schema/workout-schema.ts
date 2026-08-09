import { relations } from "drizzle-orm";
import {
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

export type ExerciseMetaData = {
  videoStartTime?: number;
  videoEndTime?: number;
};

export const workout = pgTable(
  "workout",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("workout_userId_idx").on(table.userId)],
);

export const exercise = pgTable("exercise", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  videoUrl: text("video_url"),
  imageUrl: text("image_url"),
  metaData: jsonb("meta_data").$type<ExerciseMetaData>(),
  tags: text("tags").array().notNull().default([]),
});

export const workoutExercise = pgTable(
  "workout_exercise",
  {
    workoutId: text("workout_id").notNull(),
    exerciseId: text("exercise_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workoutId, table.exerciseId] }),
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
  ],
);

export const workoutRelations = relations(workout, ({ one, many }) => ({
  user: one(user, {
    fields: [workout.userId],
    references: [user.id],
  }),
  workoutExercises: many(workoutExercise),
  sets: many(set),
}));

export const exerciseRelations = relations(exercise, ({ many }) => ({
  workoutExercises: many(workoutExercise),
  sets: many(set),
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
