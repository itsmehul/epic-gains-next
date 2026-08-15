import type { MuscleGroup } from "@/db/schema/workout-schema";
import type { exercise, set, workout, workoutExercise } from "@/db/schema";

export type Workout = typeof workout.$inferSelect;
export type Exercise = typeof exercise.$inferSelect;
export type WorkoutExercise = typeof workoutExercise.$inferSelect;
export type Set = typeof set.$inferSelect;

export type WorkoutListStats = {
  exerciseCount: number;
  setCount: number;
  loggedExerciseCount: number;
  volume: number;
  lastLoggedAt: Date | string | null;
  /** Volume change vs previous workout (by createdAt). Null when not comparable. */
  volumeChangePct: number | null;
};

export type WorkoutWithStats = Workout & {
  videoUrl: string | null;
  stats: WorkoutListStats;
};

export type WorkoutDetail = Workout & {
  owner: {
    id: string;
    name: string;
    username: string;
    image: string | null;
    isPrivate: boolean;
  };
  exercises: Exercise[];
};

export type SimilarExerciseCandidate = {
  id: string;
  name: string;
  score: number;
  matchedAlias: string | null;
  muscleGroup?: MuscleGroup | null;
  setCount?: number;
  workoutCount?: number;
};

export type MergeExerciseImpact = {
  sourceExerciseId: string;
  targetExerciseId: string;
  setCount: number;
  workoutCount: number;
  localSetCount: number;
  willDeleteSource: boolean;
};

export type MergeExerciseResult = {
  impact: MergeExerciseImpact;
  workoutExercise: WorkoutExercise | null;
  targetExerciseId: string;
};

export type ListWorkoutsResult = { items: WorkoutWithStats[] };
export type ListExercisesResult = { items: Exercise[] };
export type ListExerciseSearchResult = { items: SimilarExerciseCandidate[] };
export type ListSimilarExercisesResult = {
  items: SimilarExerciseCandidate[];
  query: string;
};
export type ListWorkoutExercisesResult = { items: WorkoutExercise[] };
export type ListSetsResult = { items: Set[] };
