import type { MetricProfile, MuscleGroup } from "@/db/schema/workout-schema";
import {
  addCalendarDays,
  inclusiveDateRange,
  localDateString,
  periodRange,
  type PeriodRange,
  type SetPeriod,
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

export type CompactSet = {
  reps: number | null;
  weight: number | null;
  time: number | null;
  distance: number | null;
  count: number;
};

export type MuscleMixShift = {
  group: MuscleGroup | "unspecified";
  volumeDeltaPct: number | null;
  setCountDelta: number;
};

export type AgentComment = {
  text: string;
  createdAt: string;
  authorUsername: string;
  exerciseName: string;
  muscleGroup: MuscleGroup | null;
  workoutName: string | null;
};

export type RecentSetDay = {
  day: string;
  setCount: number;
  volume: number;
  sessions: number;
  workouts: {
    name: string;
    setCount: number;
    volume: number;
    exercises: {
      name: string;
      muscleGroup: MuscleGroup | null;
      keyMuscles: string[];
      setCount: number;
      volume: number;
      sets: CompactSet[];
      notes: string[];
    }[];
  }[];
};

export type OlderHistory = {
  range: { start: string; end: string };
  trainingDays: number;
  sessions: number;
  setCount: number;
  volume: number;
  muscleGroups: WindowStats["muscleGroups"];
  daily: { day: string; setCount: number; volume: number; sessions: number }[];
};

export type PerformanceAnalytics = {
  restDaysInTwoWeeks: number;
  trainedDaysInTwoWeeks: string[];
  topExercisesByVolume: {
    name: string;
    muscleGroup: MuscleGroup | null;
    volume: number;
    setCount: number;
  }[];
  muscleLeaders: {
    currentWeek: MuscleGroup | "unspecified" | null;
    priorWeek: MuscleGroup | "unspecified" | null;
  };
  muscleMixShift: MuscleMixShift[];
  personalRecordCount: number;
  personalRecordsByGroup: { group: MuscleGroup | "unspecified"; count: number }[];
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
  analytics: PerformanceAnalytics;
  personalRecords: PersonalRecord[];
  comments: AgentComment[];
  recentSets: {
    range: { start: string; end: string };
    days: RecentSetDay[];
  };
  olderHistory: OlderHistory;
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

export function compactSets(sets: MetricsSet[]): CompactSet[] {
  const grouped = new Map<string, CompactSet>();
  for (const set of sets) {
    const key = `${set.reps}|${set.weight}|${set.time}|${set.distance}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    grouped.set(key, {
      reps: set.reps,
      weight: set.weight,
      time: set.time,
      distance: set.distance,
      count: 1,
    });
  }
  return [...grouped.values()];
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

const PR_SAMPLE_LIMIT = 10;
const COMMENT_LIMIT = 40;
const TOP_EXERCISE_LIMIT = 8;

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
  const records = bestInWindow(
    input.days,
    input.windows.trailing30Days,
    allTime,
  );
  const twoWeekStart = input.windows.priorWeek.startDay;
  const twoWeekEnd = input.asOf;
  const twoWeekRange = inclusiveDateRange(twoWeekStart, twoWeekEnd);
  const comments = input.comments ?? [];

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
    analytics: buildAnalytics({
      days: input.days,
      twoWeekRange,
      windows,
      records,
    }),
    personalRecords: records.slice(0, PR_SAMPLE_LIMIT),
    comments: slimComments(comments),
    recentSets: {
      range: { start: twoWeekStart, end: twoWeekEnd },
      days: buildRecentSetDays(input.days, comments, twoWeekRange),
    },
    olderHistory: buildOlderHistory(
      input.days,
      input.windows.trailing30Days,
      twoWeekStart,
    ),
  };
}

export type PeriodPerformance = {
  period: SetPeriod;
  asOf: string;
  range: { start: string; end: string };
  stats: WindowStats;
  topExercisesByVolume: PerformanceAnalytics["topExercisesByVolume"];
  comments: AgentComment[];
  recentSets: PerformanceMetrics["recentSets"];
  olderHistory: OlderHistory;
};

export function recentSetRangeForPeriod(
  period: SetPeriod,
  range: PeriodRange,
  asOfDay: string,
): PeriodRange {
  const endDay = asOfDay < range.endDay ? asOfDay : range.endDay;
  if (period === "day" || period === "week") {
    return inclusiveDateRange(range.startDay, endDay);
  }
  const startCandidate = addCalendarDays(endDay, -13);
  const startDay =
    startCandidate < range.startDay ? range.startDay : startCandidate;
  return inclusiveDateRange(startDay, endDay);
}

export function buildPeriodPerformance(input: {
  period: SetPeriod;
  asOf: string;
  range: PeriodRange;
  days: MetricsDay[];
  comments?: MetricsComment[];
}): PeriodPerformance {
  const comments = input.comments ?? [];
  const setRange = recentSetRangeForPeriod(
    input.period,
    input.range,
    input.asOf,
  );
  return {
    period: input.period,
    asOf: input.asOf,
    range: { start: input.range.startDay, end: input.range.endDay },
    stats: statsForRange(input.days, input.range),
    topExercisesByVolume: topExercises(input.days, input.range),
    comments: slimComments(comments),
    recentSets: {
      range: { start: setRange.startDay, end: setRange.endDay },
      days: buildRecentSetDays(input.days, comments, setRange),
    },
    olderHistory: buildOlderHistory(
      input.days,
      input.range,
      setRange.startDay,
    ),
  };
}

export type CirclePulseMember = {
  username: string | null;
  canViewWorkouts: boolean;
  metrics?: {
    windows: PerformanceMetrics["windows"];
    streak: PerformanceMetrics["streak"];
  };
};

export type CirclePulse = {
  visibleCount: number;
  trainedFocalDay: number;
  trainedCurrentWeek: number;
  volumeLeader: { username: string | null; volume: number } | null;
  medianCurrentWeekVolume: number | null;
};

export function buildCirclePulse(members: CirclePulseMember[]): CirclePulse {
  const visible = members.filter(
    (member): member is CirclePulseMember & { metrics: NonNullable<CirclePulseMember["metrics"]> } =>
      member.canViewWorkouts && member.metrics != null,
  );
  const volumes = visible
    .map((member) => member.metrics.windows.currentWeek.volume)
    .sort((a, b) => a - b);
  const leader = visible.reduce<
    { username: string | null; volume: number } | null
  >((best, member) => {
    const volume = member.metrics.windows.currentWeek.volume;
    if (!best || volume > best.volume) {
      return { username: member.username, volume };
    }
    return best;
  }, null);

  return {
    visibleCount: visible.length,
    trainedFocalDay: visible.filter(
      (member) => member.metrics.windows.focalDay.setCount > 0,
    ).length,
    trainedCurrentWeek: visible.filter(
      (member) => member.metrics.windows.currentWeek.trainingDays > 0,
    ).length,
    volumeLeader: leader && leader.volume > 0 ? leader : null,
    medianCurrentWeekVolume: median(volumes),
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const mid = Math.floor(values.length / 2);
  if (values.length % 2 === 1) return values[mid]!;
  return (values[mid - 1]! + values[mid]!) / 2;
}

export function toCirclePerformanceMetrics(
  metrics: PerformanceMetrics,
): Omit<PerformanceMetrics, "recentSets"> {
  const { recentSets: _recentSets, ...rest } = metrics;
  return {
    ...rest,
    olderHistory: {
      ...rest.olderHistory,
      daily: [],
    },
    comments: rest.comments.slice(0, 12),
  };
}

function buildAnalytics(input: {
  days: MetricsDay[];
  twoWeekRange: PeriodRange;
  windows: Record<WindowKey, WindowStats>;
  records: PersonalRecord[];
}): PerformanceAnalytics {
  const trainedDaysInTwoWeeks = [...trainingDaysSet(input.days)]
    .filter((day) => dayInRange(day, input.twoWeekRange))
    .sort();
  const spanDays = calendarDayCount(input.twoWeekRange);
  const byGroup = new Map<MuscleGroup | "unspecified", number>();
  for (const record of input.records) {
    const group = record.muscleGroup ?? "unspecified";
    byGroup.set(group, (byGroup.get(group) ?? 0) + 1);
  }

  return {
    restDaysInTwoWeeks: Math.max(0, spanDays - trainedDaysInTwoWeeks.length),
    trainedDaysInTwoWeeks,
    topExercisesByVolume: topExercises(input.days, input.twoWeekRange),
    muscleLeaders: {
      currentWeek: input.windows.currentWeek.muscleGroups[0]?.group ?? null,
      priorWeek: input.windows.priorWeek.muscleGroups[0]?.group ?? null,
    },
    muscleMixShift: muscleMixShift(
      input.windows.currentWeek,
      input.windows.priorWeek,
    ),
    personalRecordCount: input.records.length,
    personalRecordsByGroup: [...byGroup.entries()]
      .map(([group, count]) => ({ group, count }))
      .sort((a, b) => b.count - a.count),
  };
}

function muscleMixShift(
  current: WindowStats,
  prior: WindowStats,
): MuscleMixShift[] {
  const groups = new Set([
    ...current.muscleGroups.map((item) => item.group),
    ...prior.muscleGroups.map((item) => item.group),
  ]);
  const priorByGroup = new Map(
    prior.muscleGroups.map((item) => [item.group, item]),
  );
  const currentByGroup = new Map(
    current.muscleGroups.map((item) => [item.group, item]),
  );
  return [...groups]
    .map((group) => {
      const now = currentByGroup.get(group);
      const then = priorByGroup.get(group);
      return {
        group,
        volumeDeltaPct: percentDelta(now?.volume ?? 0, then?.volume ?? 0),
        setCountDelta: (now?.setCount ?? 0) - (then?.setCount ?? 0),
      };
    })
    .sort(
      (a, b) =>
        Math.abs(b.setCountDelta) - Math.abs(a.setCountDelta) ||
        (b.volumeDeltaPct ?? 0) - (a.volumeDeltaPct ?? 0),
    );
}

function topExercises(days: MetricsDay[], range: PeriodRange) {
  const totals = new Map<
    string,
    {
      name: string;
      muscleGroup: MuscleGroup | null;
      volume: number;
      setCount: number;
    }
  >();
  for (const day of days) {
    if (!dayInRange(day.day, range)) continue;
    for (const workout of day.workouts) {
      for (const exercise of workout.exercises) {
        const volume = exercise.sets.reduce(
          (sum, set) => sum + setVolume(set),
          0,
        );
        const existing = totals.get(exercise.id) ?? {
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          volume: 0,
          setCount: 0,
        };
        existing.volume += volume;
        existing.setCount += exercise.sets.length;
        totals.set(exercise.id, existing);
      }
    }
  }
  return [...totals.values()]
    .sort((a, b) => b.volume - a.volume || b.setCount - a.setCount)
    .slice(0, TOP_EXERCISE_LIMIT);
}

function buildRecentSetDays(
  days: MetricsDay[],
  comments: MetricsComment[],
  range: PeriodRange,
): RecentSetDay[] {
  return days
    .filter((day) => dayInRange(day.day, range))
    .map((day) => {
      const workouts = day.workouts.map((workout) => {
        const exercises = workout.exercises.map((exercise) => {
          const volume = exercise.sets.reduce(
            (sum, set) => sum + setVolume(set),
            0,
          );
          return {
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            keyMuscles: exercise.keyMuscles,
            setCount: exercise.sets.length,
            volume,
            sets: compactSets(exercise.sets),
            notes: commentsForExercise(
              comments,
              exercise.id,
              workout.id,
            ).map((comment) => comment.text),
          };
        });
        return {
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
        sessions: workouts.filter((workout) => workout.setCount > 0).length,
        workouts,
      };
    });
}

function buildOlderHistory(
  days: MetricsDay[],
  trailing: PeriodRange,
  twoWeekStart: string,
): OlderHistory {
  const olderEnd = addCalendarDays(twoWeekStart, -1);
  const range =
    trailing.startDay <= olderEnd
      ? inclusiveDateRange(trailing.startDay, olderEnd)
      : inclusiveDateRange(trailing.startDay, trailing.startDay);
  const stats = statsForRange(days, range);
  const daily = days
    .filter((day) => day.day >= range.startDay && day.day <= range.endDay)
    .map((day) => {
      let setCount = 0;
      let volume = 0;
      let sessions = 0;
      for (const workout of day.workouts) {
        let workoutSets = 0;
        for (const exercise of workout.exercises) {
          workoutSets += exercise.sets.length;
          volume += exercise.sets.reduce((sum, set) => sum + setVolume(set), 0);
        }
        if (workoutSets > 0) sessions += 1;
        setCount += workoutSets;
      }
      return { day: day.day, setCount, volume, sessions };
    })
    .filter((day) => day.setCount > 0);

  if (trailing.startDay > olderEnd) {
    return {
      range: { start: trailing.startDay, end: olderEnd },
      trainingDays: 0,
      sessions: 0,
      setCount: 0,
      volume: 0,
      muscleGroups: [],
      daily: [],
    };
  }

  return {
    range: { start: range.startDay, end: range.endDay },
    trainingDays: stats.trainingDays,
    sessions: stats.sessions,
    setCount: stats.setCount,
    volume: stats.volume,
    muscleGroups: stats.muscleGroups,
    daily,
  };
}

function slimComments(comments: MetricsComment[]): AgentComment[] {
  return [...comments]
    .sort((a, b) => commentTime(b.createdAt) - commentTime(a.createdAt))
    .slice(0, COMMENT_LIMIT)
    .map((comment) => ({
      text: comment.text,
      createdAt:
        typeof comment.createdAt === "string"
          ? comment.createdAt
          : comment.createdAt.toISOString(),
      authorUsername: comment.author.username,
      exerciseName: comment.exercise.name,
      muscleGroup: comment.exercise.muscleGroup,
      workoutName: comment.workout?.name ?? null,
    }));
}

function calendarDayCount(range: PeriodRange): number {
  let count = 0;
  let cursor = range.startDay;
  while (cursor <= range.endDay) {
    count += 1;
    cursor = addCalendarDays(cursor, 1);
  }
  return count;
}

function commentTime(value: Date | string): number {
  return typeof value === "string" ? Date.parse(value) : value.getTime();
}
