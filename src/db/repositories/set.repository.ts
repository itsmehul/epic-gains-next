import "server-only";

import { and, asc, desc, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { commentVisibleToViewer, listVisibleCommentsForOwner } from "@/db/repositories/comment.repository";
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
import type { MetricProfile, MuscleGroup } from "@/db/schema/workout-schema";
import {
  buildPerformanceMetrics,
  coveringRange,
  metricWindows,
  type AllTimeBest,
  type MetricsDay,
} from "@/features/workouts/performance-metrics";
import {
  dayKey,
  localDateString,
  periodRange,
  type SetPeriod,
} from "@/features/workouts/set-day";

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
  viewerId: string;
};

type ListSetsInRangeOptions = {
  start: Date;
  end: Date;
  muscleGroup?: MuscleGroup;
  keyMuscle?: string;
};

type LoggedSetRow = {
  set: {
    id: string;
    reps: number | null;
    weight: number | null;
    time: number | null;
    distance: number | null;
    workoutId: string;
    exerciseId: string;
    createdAt: Date;
    updatedAt: Date;
  };
  workout: {
    id: string;
    name: string;
    author: string | null;
    channelUrl: string | null;
    createdAt: Date;
  };
  exercise: {
    id: string;
    name: string;
    metricProfile: MetricProfile;
    muscleGroup: MuscleGroup | null;
    keyMuscles: string[];
  };
};

function muscleFilterConditions(options: {
  muscleGroup?: MuscleGroup;
  keyMuscle?: string;
}) {
  const conditions = [];
  if (options.muscleGroup) {
    conditions.push(eq(exercise.muscleGroup, options.muscleGroup));
  }
  const keyMuscle = options.keyMuscle?.trim();
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
  return conditions;
}

async function loadLoggedSetRows(
  userId: string,
  options: ListSetsInRangeOptions,
): Promise<LoggedSetRow[]> {
  const conditions = [
    eq(workout.userId, userId),
    gte(workoutSet.updatedAt, options.start),
    lt(workoutSet.updatedAt, options.end),
    ...muscleFilterConditions(options),
  ];

  return db
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
}

function groupLoggedSetRows(rows: LoggedSetRow[]) {
  const daysMap = new Map<
    string,
    Map<
      string,
      {
        workout: LoggedSetRow["workout"];
        exercises: Map<
          string,
          {
            exercise: LoggedSetRow["exercise"];
            sets: LoggedSetRow["set"][];
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

  return daysMap;
}

export async function listSetsByPeriodForUser(
  userId: string,
  options: ListSetsByPeriodOptions,
) {
  const range = periodRange(options.period, options.date);
  const rows = await loadLoggedSetRows(userId, {
    start: range.start,
    end: range.end,
    muscleGroup: options.muscleGroup,
    keyMuscle: options.keyMuscle,
  });

  const commentsByKey = await loadCommentsForLoggedSets(
    rows,
    options.viewerId,
  );

  const daysMap = groupLoggedSetRows(rows);
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

export async function getPerformanceMetricsForUser(
  userId: string,
  options: {
    date?: Date;
    muscleGroup?: MuscleGroup;
    keyMuscle?: string;
    viewerId: string;
  },
) {
  const asOf = options.date ?? new Date();
  const windows = metricWindows(asOf);
  const covering = coveringRange(windows);
  const [rows, comments] = await Promise.all([
    loadLoggedSetRows(userId, {
      start: covering.start,
      end: covering.end,
      muscleGroup: options.muscleGroup,
      keyMuscle: options.keyMuscle,
    }),
    listVisibleCommentsForOwner({
      ownerId: userId,
      viewerId: options.viewerId,
      muscleGroup: options.muscleGroup,
      keyMuscle: options.keyMuscle,
    }),
  ]);

  const daysMap = groupLoggedSetRows(rows);
  const days: MetricsDay[] = [...daysMap.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, workouts]) => ({
      day,
      workouts: [...workouts.values()].map((entry) => ({
        id: entry.workout.id,
        name: entry.workout.name,
        exercises: [...entry.exercises.values()].map((item) => ({
          id: item.exercise.id,
          name: item.exercise.name,
          metricProfile: item.exercise.metricProfile,
          muscleGroup: item.exercise.muscleGroup,
          keyMuscles: item.exercise.keyMuscles,
          sets: item.sets.map((set) => ({
            reps: set.reps,
            weight: set.weight,
            time: set.time,
            distance: set.distance,
          })),
        })),
      })),
    }));

  const exerciseIds = [...new Set(rows.map((row) => row.exercise.id))];
  const allTimeBests = await listAllTimeBestsForExercises(userId, exerciseIds);

  return buildPerformanceMetrics({
    asOf: localDateString(asOf),
    windows,
    days,
    allTimeBests,
    comments,
  });
}

async function listAllTimeBestsForExercises(
  userId: string,
  exerciseIds: string[],
): Promise<AllTimeBest[]> {
  if (exerciseIds.length === 0) return [];

  return db
    .select({
      exerciseId: workoutSet.exerciseId,
      bestWeight: sql<number>`coalesce(max(${workoutSet.weight}), 0)`.mapWith(
        Number,
      ),
      bestReps: sql<number>`coalesce(max(${workoutSet.reps}), 0)`.mapWith(
        Number,
      ),
      bestTime: sql<number>`coalesce(max(${workoutSet.time}), 0)`.mapWith(
        Number,
      ),
      bestDistance: sql<number>`coalesce(max(${workoutSet.distance}), 0)`.mapWith(
        Number,
      ),
      bestVolume: sql<number>`coalesce(max(
        case
          when ${workoutSet.weight} is not null and ${workoutSet.reps} is not null
          then ${workoutSet.weight} * ${workoutSet.reps}
          else 0
        end
      ), 0)`.mapWith(Number),
    })
    .from(workoutSet)
    .innerJoin(workout, eq(workout.id, workoutSet.workoutId))
    .where(
      and(
        eq(workout.userId, userId),
        inArray(workoutSet.exerciseId, exerciseIds),
      ),
    )
    .groupBy(workoutSet.exerciseId);
}

async function loadCommentsForLoggedSets(
  rows: { exercise: { id: string }; workout: { id: string } }[],
  viewerId: string,
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
        commentVisibleToViewer(viewerId),
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
