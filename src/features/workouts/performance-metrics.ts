import type { MetricProfile, MuscleGroup } from "@/db/schema/workout-schema";
import {
  addCalendarDays,
  inclusiveDateRange,
  localDateString,
  periodRange,
  type PeriodRange,
} from "@/features/workouts/set-day";

export type MetricsSet = {
  reps: number | null;
  weight: number | null;
  time: number | null;
  distance: number | null;
};

export type MetricsExercise = {
  id: string;
  name: string;
  metricProfile: MetricProfile;
  muscleGroup: MuscleGroup | null;
  keyMuscles: string[];
  sets: MetricsSet[];
};

export type MetricsWorkout = {
  id: string;
  name: string;
  exercises: MetricsExercise[];
};

export type MetricsDay = {
  day: string;
  workouts: MetricsWorkout[];
};

export type AllTimeBest = {
  exerciseId: string;
  bestWeight: number;
  bestReps: number;
  bestTime: number;
  bestDistance: number;
  bestVolume: number;
};

export type WindowKey =
  | "focalDay"
  | "currentWeek"
  | "priorWeek"
  | "trailing30Days";

export type MetricWindows = Record<WindowKey, PeriodRange>;

export type WindowStats = {
  range: { start: string; end: string };
  trainingDays: number;
  sessions: number;
  setCount: number;
  volume: number;
  muscleGroups: {
    group: MuscleGroup | "unspecified";
    setCount: number;
    volume: number;
    exerciseCount: number;
  }[];
};

export type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup | null;
  metric: "weight" | "volume" | "reps" | "time" | "distance";
  value: number;
  day: string;
};

export type MetricsCommentAuthor = {
  id: string;
  name: string;
  username: string;
  image: string | null;
};

export type MetricsComment = {
  id: string;
  text: string;
  createdAt: Date | string;
  author: MetricsCommentAuthor;
  exercise: {
    id: string;
    name: string;
    muscleGroup: MuscleGroup | null;
    keyMuscles: string[];
  };
  workout: {
    id: string;
    name: string;
  } | null;
};

export type DailyRollup = {
  day: string;
  setCount: number;
  volume: number;
  sessions: number;
  workouts: {
    id: string;
    name: string;
    setCount: number;
    volume: number;
    exercises: {
      id: string;
      name: string;
      muscleGroup: MuscleGroup | null;
      keyMuscles: string[];
      setCount: number;
      volume: number;
      comments: MetricsComment[];
    }[];
  }[];
};

export type PerformanceMetrics = {
  asOf: string;
  windows: Record<WindowKey, WindowStats>;
  weekOverWeek: {
    volumeDeltaPct: number | null;
    sessionDeltaPct: number | null;
    setCountDeltaPct: number | null;
    trainingDayDeltaPct: number | null;
  };
  streak: {
    currentDays: number;
    longestInRange: number;
  };
  personalRecords: PersonalRecord[];
  comments: MetricsComment[];
  days: DailyRollup[];
};

export function setVolume(set: MetricsSet): number {
  if (set.weight != null && set.reps != null) return set.weight * set.reps;
  return 0;
}

export function percentDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function metricWindows(asOf: Date): MetricWindows {
  const asOfDay = localDateString(asOf);
  const currentWeek = periodRange("week", asOf);
  const priorWeekEnd = addCalendarDays(currentWeek.startDay, -1);
  const priorWeekStart = addCalendarDays(currentWeek.startDay, -7);
  return {
    focalDay: periodRange("day", asOf),
    currentWeek,
    priorWeek: inclusiveDateRange(priorWeekStart, priorWeekEnd),
    trailing30Days: inclusiveDateRange(addCalendarDays(asOfDay, -29), asOfDay),
  };
}

export function coveringRange(windows: MetricWindows): PeriodRange {
  const starts = Object.values(windows).map((window) => window.startDay);
  const ends = Object.values(windows).map((window) => window.endDay);
  starts.sort();
  ends.sort();
  return inclusiveDateRange(starts[0]!, ends[ends.length - 1]!);
}

function dayInRange(day: string, range: PeriodRange): boolean {
  return day >= range.startDay && day <= range.endDay;
}

function emptyWindowStats(range: PeriodRange): WindowStats {
  return {
    range: { start: range.startDay, end: range.endDay },
    trainingDays: 0,
    sessions: 0,
    setCount: 0,
    volume: 0,
    muscleGroups: [],
  };
}

function statsForRange(days: MetricsDay[], range: PeriodRange): WindowStats {
  const stats = emptyWindowStats(range);
  const muscle = new Map<
    MuscleGroup | "unspecified",
    { setCount: number; volume: number; exercises: Set<string> }
  >();

  for (const day of days) {
    if (!dayInRange(day.day, range)) continue;
    let daySets = 0;
    for (const workout of day.workouts) {
      let workoutSets = 0;
      for (const exercise of workout.exercises) {
        const volume = exercise.sets.reduce(
          (sum, set) => sum + setVolume(set),
          0,
        );
        const setCount = exercise.sets.length;
        workoutSets += setCount;
        stats.volume += volume;
        const group = exercise.muscleGroup ?? "unspecified";
        const entry = muscle.get(group) ?? {
          setCount: 0,
          volume: 0,
          exercises: new Set<string>(),
        };
        entry.setCount += setCount;
        entry.volume += volume;
        entry.exercises.add(exercise.id);
        muscle.set(group, entry);
      }
      if (workoutSets > 0) stats.sessions += 1;
      daySets += workoutSets;
    }
    if (daySets > 0) stats.trainingDays += 1;
    stats.setCount += daySets;
  }

  stats.muscleGroups = [...muscle.entries()]
    .map(([group, entry]) => ({
      group,
      setCount: entry.setCount,
      volume: entry.volume,
      exerciseCount: entry.exercises.size,
    }))
    .sort((a, b) => b.volume - a.volume || b.setCount - a.setCount);

  return stats;
}

export function commentsForExercise(
  comments: MetricsComment[],
  exerciseId: string,
  workoutId: string,
) {
  return comments.filter(
    (comment) =>
      comment.exercise.id === exerciseId &&
      (comment.workout == null || comment.workout.id === workoutId),
  );
}

export function rollupDays(
  days: MetricsDay[],
  comments: MetricsComment[] = [],
): DailyRollup[] {
  return days.map((day) => {
    const workouts = day.workouts.map((workout) => {
      const exercises = workout.exercises.map((exercise) => {
        const volume = exercise.sets.reduce(
          (sum, set) => sum + setVolume(set),
          0,
        );
        return {
          id: exercise.id,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          keyMuscles: exercise.keyMuscles,
          setCount: exercise.sets.length,
          volume,
          comments: commentsForExercise(comments, exercise.id, workout.id),
        };
      });
      return {
        id: workout.id,
        name: workout.name,
        setCount: exercises.reduce((sum, item) => sum + item.setCount, 0),
        volume: exercises.reduce((sum, item) => sum + item.volume, 0),
        exercises,
      };
    });
    return {
      day: day.day,
      setCount: workouts.reduce((sum, item) => sum + item.setCount, 0),
      volume: workouts.reduce((sum, item) => sum + item.volume, 0),
      sessions: workouts.length,
      workouts,
    };
  });
}

function trainingDaysSet(days: MetricsDay[]): Set<string> {
  return new Set(
    days
      .filter((day) =>
        day.workouts.some((workout) =>
          workout.exercises.some((exercise) => exercise.sets.length > 0),
        ),
      )
      .map((day) => day.day),
  );
}

export function currentStreak(asOf: string, trainingDays: Set<string>): number {
  let streak = 0;
  let cursor = asOf;
  while (trainingDays.has(cursor)) {
    streak += 1;
    cursor = addCalendarDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(
  trainingDays: Set<string>,
  range: PeriodRange,
): number {
  let longest = 0;
  let run = 0;
  let cursor = range.startDay;
  while (cursor <= range.endDay) {
    if (trainingDays.has(cursor)) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
    cursor = addCalendarDays(cursor, 1);
  }
  return longest;
}

function bestInWindow(
  days: MetricsDay[],
  range: PeriodRange,
  allTime: Map<string, AllTimeBest>,
): PersonalRecord[] {
  const records: PersonalRecord[] = [];
  const seen = new Set<string>();

  for (const day of days) {
    if (!dayInRange(day.day, range)) continue;
    for (const workout of day.workouts) {
      for (const exercise of workout.exercises) {
        const lifetime = allTime.get(exercise.id);
        if (!lifetime) continue;
        for (const set of exercise.sets) {
          const volume = setVolume(set);
          const candidates: Omit<
            PersonalRecord,
            "exerciseId" | "exerciseName" | "muscleGroup" | "day"
          >[] = [];
          if (
            set.weight != null &&
            set.weight >= lifetime.bestWeight &&
            lifetime.bestWeight > 0
          ) {
            candidates.push({ metric: "weight", value: set.weight });
          }
          if (volume >= lifetime.bestVolume && lifetime.bestVolume > 0) {
            candidates.push({ metric: "volume", value: volume });
          }
          if (set.reps != null && set.reps >= lifetime.bestReps && lifetime.bestReps > 0) {
            candidates.push({ metric: "reps", value: set.reps });
          }
          if (set.time != null && set.time >= lifetime.bestTime && lifetime.bestTime > 0) {
            candidates.push({ metric: "time", value: set.time });
          }
          if (
            set.distance != null &&
            set.distance >= lifetime.bestDistance &&
            lifetime.bestDistance > 0
          ) {
            candidates.push({ metric: "distance", value: set.distance });
          }
          for (const candidate of candidates) {
            const key = `${exercise.id}:${candidate.metric}:${candidate.value}`;
            if (seen.has(key)) continue;
            seen.add(key);
            records.push({
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              muscleGroup: exercise.muscleGroup,
              metric: candidate.metric,
              value: candidate.value,
              day: day.day,
            });
          }
        }
      }
    }
  }

  return records.sort((a, b) => b.value - a.value);
}

export function buildPerformanceMetrics(input: {
  asOf: string;
  windows: MetricWindows;
  days: MetricsDay[];
  allTimeBests: AllTimeBest[];
  comments?: MetricsComment[];
}): PerformanceMetrics {
  const covering = coveringRange(input.windows);
  const windows = {
    focalDay: statsForRange(input.days, input.windows.focalDay),
    currentWeek: statsForRange(input.days, input.windows.currentWeek),
    priorWeek: statsForRange(input.days, input.windows.priorWeek),
    trailing30Days: statsForRange(input.days, input.windows.trailing30Days),
  };
  const trainingDays = trainingDaysSet(input.days);
  const allTime = new Map(
    input.allTimeBests.map((item) => [item.exerciseId, item]),
  );

  return {
    asOf: input.asOf,
    windows,
    weekOverWeek: {
      volumeDeltaPct: percentDelta(
        windows.currentWeek.volume,
        windows.priorWeek.volume,
      ),
      sessionDeltaPct: percentDelta(
        windows.currentWeek.sessions,
        windows.priorWeek.sessions,
      ),
      setCountDeltaPct: percentDelta(
        windows.currentWeek.setCount,
        windows.priorWeek.setCount,
      ),
      trainingDayDeltaPct: percentDelta(
        windows.currentWeek.trainingDays,
        windows.priorWeek.trainingDays,
      ),
    },
    streak: {
      currentDays: currentStreak(input.asOf, trainingDays),
      longestInRange: longestStreak(trainingDays, covering),
    },
    personalRecords: bestInWindow(
      input.days,
      input.windows.trailing30Days,
      allTime,
    ),
    comments: input.comments ?? [],
    days: rollupDays(input.days, input.comments ?? []),
  };
}
