import "server-only";

import { and, asc, desc, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  toPublicUser,
  type PublicUser,
} from "@/db/repositories/social.repository";
import {
  comments,
  exercise,
  set as workoutSet,
  user,
  workout,
} from "@/db/schema";
import type { MuscleGroup } from "@/db/schema/workout-schema";
import type { SetPeriod } from "@/features/workouts/set-day";
import { dayKey, periodRange } from "@/features/workouts/set-day";

export type SetInsert = typeof workoutSet.$inferInsert;
export type SetUpdate = Partial<
  Pick<SetInsert, "reps" | "weight" | "time" | "distance" | "workoutId" | "exerciseId">
>;

type LoggedSetComment = {
  id: string;
  exerciseId: string;
  workoutId: string | null;
  text: string;
  createdAt: Date;
  authorId: string;
  author: PublicUser;
};

export async function listSets(filters?: {
  workoutId?: string;
  exerciseId?: string;
}) {
  const conditions = [];
  if (filters?.workoutId) {
    conditions.push(eq(workoutSet.workoutId, filters.workoutId));
  }
  if (filters?.exerciseId) {
    conditions.push(eq(workoutSet.exerciseId, filters.exerciseId));
  }

  const query = db
    .select()
    .from(workoutSet)
    .orderBy(desc(workoutSet.updatedAt), asc(workoutSet.createdAt));
  if (conditions.length === 0) {
    return query;
  }
  return query.where(and(...conditions));
}

export async function getSetById(id: string) {
  const [row] = await db
    .select()
    .from(workoutSet)
    .where(eq(workoutSet.id, id))
    .limit(1);
  return row ?? null;
}

export async function createSet(data: SetInsert) {
  const [row] = await db.insert(workoutSet).values(data).returning();
  return row;
}

export async function updateSet(id: string, data: SetUpdate) {
  const [row] = await db
    .update(workoutSet)
    .set(data)
    .where(eq(workoutSet.id, id))
    .returning();
  return row ?? null;
}

export async function deleteSet(id: string) {
  const [row] = await db
    .delete(workoutSet)
    .where(eq(workoutSet.id, id))
    .returning();
  return row ?? null;
}

export type ListSetsByPeriodOptions = {
  period: SetPeriod;
  date?: Date;
  muscleGroup?: MuscleGroup;
  keyMuscle?: string;
};

export async function listSetsByPeriodForUser(
  userId: string,
  options: ListSetsByPeriodOptions,
) {
  const range = periodRange(options.period, options.date);
  const keyMuscle = options.keyMuscle?.trim();
  const conditions = [
    eq(workout.userId, userId),
    gte(workoutSet.updatedAt, range.start),
    lt(workoutSet.updatedAt, range.end),
  ];

  if (options.muscleGroup) {
    conditions.push(eq(exercise.muscleGroup, options.muscleGroup));
  }

  if (keyMuscle) {
    const pattern = `%${keyMuscle.replace(/[%_]/g, "\\$&")}%`;
    conditions.push(
      sql`exists (
        select 1
        from unnest(${exercise.keyMuscles}) as muscle
        where muscle ilike ${pattern} escape '\\'
      )`,
    );
  }

  const rows = await db
    .select({
      set: {
        id: workoutSet.id,
        reps: workoutSet.reps,
        weight: workoutSet.weight,
        time: workoutSet.time,
        distance: workoutSet.distance,
        workoutId: workoutSet.workoutId,
        exerciseId: workoutSet.exerciseId,
        createdAt: workoutSet.createdAt,
        updatedAt: workoutSet.updatedAt,
      },
      workout: {
        id: workout.id,
        name: workout.name,
        author: workout.author,
        channelUrl: workout.channelUrl,
        createdAt: workout.createdAt,
      },
      exercise: {
        id: exercise.id,
        name: exercise.name,
        metricProfile: exercise.metricProfile,
        muscleGroup: exercise.muscleGroup,
        keyMuscles: exercise.keyMuscles,
      },
    })
    .from(workoutSet)
    .innerJoin(workout, eq(workout.id, workoutSet.workoutId))
    .innerJoin(exercise, eq(exercise.id, workoutSet.exerciseId))
    .where(and(...conditions))
    .orderBy(desc(workoutSet.updatedAt), asc(workoutSet.createdAt));

  const commentsByKey = await loadCommentsForLoggedSets(rows);

  const daysMap = new Map<
    string,
    Map<
      string,
      {
        workout: (typeof rows)[number]["workout"];
        exercises: Map<
          string,
          {
            exercise: (typeof rows)[number]["exercise"];
            sets: (typeof rows)[number]["set"][];
          }
        >;
      }
    >
  >();

  for (const row of rows) {
    const day = dayKey(row.set.updatedAt);
    const workouts = daysMap.get(day) ?? new Map();
    const existing = workouts.get(row.workout.id) ?? {
      workout: row.workout,
      exercises: new Map(),
    };
    const exerciseEntry = existing.exercises.get(row.exercise.id) ?? {
      exercise: row.exercise,
      sets: [],
    };
    exerciseEntry.sets.push(row.set);
    existing.exercises.set(row.exercise.id, exerciseEntry);
    workouts.set(row.workout.id, existing);
    daysMap.set(day, workouts);
  }

  const days = [...daysMap.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, workouts]) => ({
      day,
      workouts: [...workouts.values()].map((entry) => ({
        ...entry.workout,
        exercises: [...entry.exercises.values()].map((item) => ({
          ...item.exercise,
          sets: item.sets,
          comments: commentsForExercise(
            commentsByKey,
            item.exercise.id,
            entry.workout.id,
          ),
        })),
      })),
    }));

  return {
    period: options.period,
    range: {
      start: range.startDay,
      end: range.endDay,
    },
    days,
  };
}

async function loadCommentsForLoggedSets(
  rows: { exercise: { id: string }; workout: { id: string } }[],
) {
  const commentsByKey = new Map<string, LoggedSetComment[]>();
  const exerciseIds = [...new Set(rows.map((row) => row.exercise.id))];
  const workoutIds = [...new Set(rows.map((row) => row.workout.id))];
  if (exerciseIds.length === 0) return commentsByKey;

  const commentRows = await db
    .select({
      id: comments.id,
      exerciseId: comments.exerciseId,
      workoutId: comments.workoutId,
      text: comments.text,
      createdAt: comments.createdAt,
      authorId: comments.authorId,
      author: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
        isPrivate: user.isPrivate,
      },
    })
    .from(comments)
    .innerJoin(user, eq(user.id, comments.authorId))
    .where(
      and(
        inArray(comments.exerciseId, exerciseIds),
        or(isNull(comments.workoutId), inArray(comments.workoutId, workoutIds))!,
      ),
    )
    .orderBy(asc(comments.createdAt));

  for (const row of commentRows) {
    const author = toPublicUser(row.author);
    if (!author) continue;
    const mapped: LoggedSetComment = {
      id: row.id,
      exerciseId: row.exerciseId,
      workoutId: row.workoutId,
      text: row.text,
      createdAt: row.createdAt,
      authorId: row.authorId,
      author,
    };
    const key = commentKey(row.exerciseId, row.workoutId);
    const list = commentsByKey.get(key) ?? [];
    list.push(mapped);
    commentsByKey.set(key, list);
  }

  return commentsByKey;
}

function commentKey(exerciseId: string, workoutId: string | null) {
  return `${exerciseId}:${workoutId ?? ""}`;
}

function commentsForExercise(
  commentsByKey: Map<string, LoggedSetComment[]>,
  exerciseId: string,
  workoutId: string,
) {
  const scoped = commentsByKey.get(commentKey(exerciseId, workoutId)) ?? [];
  const general = commentsByKey.get(commentKey(exerciseId, null)) ?? [];
  const seen = new Set<string>();
  return [...scoped, ...general].filter((comment) => {
    if (seen.has(comment.id)) return false;
    seen.add(comment.id);
    return true;
  });
}
