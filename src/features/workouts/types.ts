import type { exercise, set, workout, workoutExercise } from "@/db/schema";

export type Workout = typeof workout.$inferSelect;
export type Exercise = typeof exercise.$inferSelect;
export type WorkoutExercise = typeof workoutExercise.$inferSelect;
export type Set = typeof set.$inferSelect;

export type ListWorkoutsResult = { items: Workout[] };
export type ListExercisesResult = { items: Exercise[] };
export type ListWorkoutExercisesResult = { items: WorkoutExercise[] };
export type ListSetsResult = { items: Set[] };
