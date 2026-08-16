import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { listAchievementsForUser } from "@/db/repositories/achievement.repository";
import { exercise, set as workoutSet, workout } from "@/db/schema";
import type { MuscleGroup } from "@/db/schema/workout-schema";
import type { ProfileInsights } from "@/features/social/profile-insights";
import {
  addCalendarDays,
  dayKey,
  localDateString,
} from "@/features/workouts/set-day";

function topNamed(
  counts: Map<string, { id: string; name: string; setCount: number }>,
) {
  let best: { id: string; name: string; setCount: number } | null = null;
  for (const item of counts.values()) {
    if (!best || item.setCount > best.setCount) best = item;
  }
  return best;
}

function currentStreak(days: Iterable<string>, today: string) {
  const unique = [...new Set(days)].sort().reverse();
  const latest = unique[0];
  if (!latest) return 0;
  if (latest !== today && latest !== addCalendarDays(today, -1)) return 0;

  let count = 0;
  let expected = latest;
  for (const day of unique) {
    if (day !== expected) break;
    count += 1;
    expected = addCalendarDays(expected, -1);
  }
  return count;
}

export async function getProfileInsights(
  userId: string,
): Promise<ProfileInsights> {
  const [rows, achievements] = await Promise.all([
    db
      .select({
        workoutId: workoutSet.workoutId,
        workoutName: workout.name,
        exerciseId: workoutSet.exerciseId,
        exerciseName: exercise.name,
        muscleGroup: exercise.muscleGroup,
        updatedAt: workoutSet.updatedAt,
      })
      .from(workoutSet)
      .innerJoin(exercise, eq(exercise.id, workoutSet.exerciseId))
      .innerJoin(workout, eq(workout.id, workoutSet.workoutId))
      .where(eq(workoutSet.userId, userId)),
    listAchievementsForUser(userId, { persistUnlocks: false }),
  ]);

  const workouts = new Map<
    string,
    { id: string; name: string; setCount: number }
  >();
  const exercises = new Map<
    string,
    { id: string; name: string; setCount: number }
  >();
  const muscles = new Map<MuscleGroup, number>();
  const days: string[] = [];

  for (const row of rows) {
    const workoutEntry = workouts.get(row.workoutId) ?? {
      id: row.workoutId,
      name: row.workoutName,
      setCount: 0,
    };
    workoutEntry.setCount += 1;
    workouts.set(row.workoutId, workoutEntry);

    const exerciseEntry = exercises.get(row.exerciseId) ?? {
      id: row.exerciseId,
      name: row.exerciseName,
      setCount: 0,
    };
    exerciseEntry.setCount += 1;
    exercises.set(row.exerciseId, exerciseEntry);

    if (row.muscleGroup) {
      muscles.set(row.muscleGroup, (muscles.get(row.muscleGroup) ?? 0) + 1);
    }
    days.push(dayKey(row.updatedAt));
  }

  let topMuscle: ProfileInsights["topMuscle"] = null;
  for (const [group, setCount] of muscles) {
    if (!topMuscle || setCount > topMuscle.setCount) {
      topMuscle = { group, setCount };
    }
  }

  const latestAchievement = [...achievements.items]
    .filter((item) => item.unlocked && item.unlockedAt)
    .sort(
      (a, b) =>
        new Date(b.unlockedAt as Date).getTime() -
        new Date(a.unlockedAt as Date).getTime(),
    )[0];

  return {
    setCount: rows.length,
    trainingDays: new Set(days).size,
    streakDays: currentStreak(days, localDateString()),
    favoriteWorkout: topNamed(workouts),
    favoriteExercise: topNamed(exercises),
    topMuscle,
    latestAchievement: latestAchievement
      ? {
          id: latestAchievement.id,
          name: latestAchievement.name,
          gamerscore: latestAchievement.gamerscore,
          unlockedAt: latestAchievement.unlockedAt as Date,
          secret: latestAchievement.secret,
        }
      : null,
  };
}
