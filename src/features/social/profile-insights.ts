import type { MuscleGroup } from "@/db/schema/workout-schema";

export type ProfileNamedCount = {
  id: string;
  name: string;
  setCount: number;
};

export type ProfileMuscleCount = {
  group: MuscleGroup;
  setCount: number;
};

export type ProfileLatestAchievement = {
  id: string;
  name: string;
  gamerscore: number;
  unlockedAt: Date | string;
  secret?: boolean;
};

export type ProfileInsights = {
  setCount: number;
  trainingDays: number;
  streakDays: number;
  favoriteWorkout: ProfileNamedCount | null;
  favoriteExercise: ProfileNamedCount | null;
  topMuscle: ProfileMuscleCount | null;
  latestAchievement: ProfileLatestAchievement | null;
};
