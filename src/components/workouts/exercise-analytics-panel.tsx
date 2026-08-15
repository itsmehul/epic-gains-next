"use client";

import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { chartCssVars } from "@/components/charts/chart-context";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip";
import { IconChartBar } from "@tabler/icons-react";
import type { MetricProfile } from "@/db/schema/workout-schema";
import { fieldsForMetricProfile } from "@/features/workouts/metric-profile";
import {
  formatDayHeading,
  groupSetsByDay,
} from "@/features/workouts/set-day";
import type { Set } from "@/features/workouts/types";
import { cn } from "@/shared/utils";

type ExerciseAnalyticsPanelProps = {
  sets: Set[];
  metricProfile?: MetricProfile | null;
};

type SessionMetric = {
  day: string;
  setCount: number;
  value: number;
  best: number;
};

function formatCompact(value: number) {
  if (value <= 0) return "0";
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value % 1 === 0 ? String(value) : value.toFixed(1);
}

function formatDelta(current: number, previous: number | null) {
  if (previous == null || previous <= 0 || current <= 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct);
  if (rounded === 0) return "flat";
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function setVolume(set: Set) {
  if (set.weight != null && set.reps != null) return set.weight * set.reps;
  return 0;
}

function metricCopy(profile: MetricProfile | null | undefined) {
  if (profile === "TIMED_HOLD") {
    return { label: "time", bestLabel: "best hold" };
  }
  if (profile === "CARDIO_DISTANCE") {
    return { label: "distance", bestLabel: "best distance" };
  }
  if (profile === "LOADED_CARRY") {
    return { label: "load", bestLabel: "best carry" };
  }
  if (profile === "BODYWEIGHT_REPS") {
    return { label: "reps", bestLabel: "best set" };
  }
  return { label: "volume", bestLabel: "best weight" };
}

function sessionValue(
  daySets: Set[],
  profile: MetricProfile | null | undefined,
): { value: number; best: number } {
  const fields = fieldsForMetricProfile(profile);

  if (
    profile === "TIMED_HOLD" ||
    (fields.primary.length === 1 && fields.primary[0] === "time")
  ) {
    const times = daySets.map((set) => set.time ?? 0);
    return {
      value: times.reduce((sum, n) => sum + n, 0),
      best: Math.max(0, ...times),
    };
  }

  if (profile === "CARDIO_DISTANCE") {
    const distances = daySets.map((set) => set.distance ?? 0);
    return {
      value: distances.reduce((sum, n) => sum + n, 0),
      best: Math.max(0, ...distances),
    };
  }

  if (profile === "LOADED_CARRY") {
    const loads = daySets.map((set) => (set.weight ?? 0) * (set.distance ?? 0));
    return {
      value: loads.reduce((sum, n) => sum + n, 0),
      best: Math.max(0, ...loads),
    };
  }

  if (profile === "BODYWEIGHT_REPS") {
    const reps = daySets.map((set) => set.reps ?? 0);
    return {
      value: reps.reduce((sum, n) => sum + n, 0),
      best: Math.max(0, ...reps),
    };
  }

  const volumes = daySets.map(setVolume);
  const weights = daySets.map((set) => set.weight ?? 0);
  return {
    value: volumes.reduce((sum, n) => sum + n, 0),
    best: Math.max(0, ...weights),
  };
}

function shortDayLabel(isoDate: string) {
  const heading = formatDayHeading(isoDate);
  if (heading === "Today" || heading === "Yesterday") return heading.slice(0, 3);
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
}

function epley1rm(set: Set) {
  if (set.weight == null || set.reps == null || set.reps <= 0) return 0;
  if (set.reps === 1) return set.weight;
  return set.weight * (1 + set.reps / 30);
}

export function ExerciseAnalyticsPanel({
  sets,
  metricProfile,
}: ExerciseAnalyticsPanelProps) {
  const dayGroups = groupSetsByDay(sets);
  const sessionsOldestFirst = [...dayGroups].reverse();
  const { label: metricLabel, bestLabel } = metricCopy(metricProfile);

  const sessions: SessionMetric[] = sessionsOldestFirst.map((group) => {
    const { value, best } = sessionValue(group.sets, metricProfile);
    return {
      day: group.day,
      setCount: group.sets.length,
      value,
      best,
    };
  });

  const chartSessions = sessions.slice(-12);
  const chartData = chartSessions.map((session) => ({
    name: shortDayLabel(session.day),
    [metricLabel]: session.value,
    best: session.best,
    sets: session.setCount,
    day: session.day,
  }));
  const totalSets = sets.length;
  const totalValue = sessions.reduce((sum, session) => sum + session.value, 0);
  const lastSession = sessions.at(-1) ?? null;
  const previousSession = sessions.at(-2) ?? null;
  const delta = lastSession
    ? formatDelta(lastSession.value, previousSession?.value ?? null)
    : null;

  const estimated1rm = Math.max(0, ...sets.map(epley1rm));
  const show1rm =
    estimated1rm > 0 &&
    (metricProfile == null ||
      metricProfile === "WEIGHT_REPS" ||
      metricProfile === "WEIGHTED_REPS" ||
      metricProfile === "CUSTOM");

  if (sets.length === 0) {
    return (
      <div className="px-4 md:px-0">
        <div className="text-muted-foreground flex flex-col items-center gap-1.5 py-6 text-center">
          <IconChartBar
            className="text-muted-foreground/50 size-5"
            stroke={1.5}
          />
          <p className="text-foreground text-sm font-medium">
            No analytics yet
          </p>
          <p className="max-w-64 text-sm leading-5">
            Log a few sets to see volume, session trends, and personal bests for
            this exercise.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 md:px-0">
      <section
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        aria-label="Exercise totals"
      >
        <StatTile label="Sessions" value={String(sessions.length)} />
        <StatTile label="Sets" value={String(totalSets)} />
        <StatTile
          label={metricLabel}
          value={formatCompact(totalValue)}
        />
        <StatTile
          label={show1rm ? "est. 1RM" : bestLabel}
          value={formatCompact(show1rm ? estimated1rm : Math.max(0, ...sessions.map((s) => s.best)))}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between px-1">
          <h3 className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            {metricLabel} by session
          </h3>
          {delta ? (
            <p
              className={cn(
                "text-[11px] font-medium tabular-nums",
                delta.startsWith("+")
                  ? "text-emerald-600 dark:text-emerald-400"
                  : delta.startsWith("-")
                    ? "text-destructive"
                    : "text-muted-foreground",
              )}
            >
              {delta} vs last
            </p>
          ) : null}
        </div>

        <BarChart
          data={chartData}
          xDataKey="name"
          aspectRatio="2.4 / 1"
          barGap={0.42}
          barWidth={28}
          margin={{ top: 12, right: 20, bottom: 36, left: 20 }}
          className="max-h-52 rounded-2xl bg-muted/40"
        >
          <Grid horizontal />
          <Bar
            dataKey={metricLabel}
            fill={chartCssVars.linePrimary}
            lineCap="round"
            minBarHeight={6}
          />
          <BarXAxis showAllLabels maxLabels={12} />
          <ChartTooltip showDatePill={false} />
        </BarChart>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-muted-foreground px-1 text-[11px] font-medium tracking-wide uppercase">
          Recent sessions
        </h3>
        <ul className="divide-border/50 divide-y overflow-clip rounded-xl bg-muted/10">
          {[...sessions].reverse().slice(0, 8).map((session, index, list) => {
            const older = list[index + 1];
            const change = formatDelta(session.value, older?.value ?? null);
            return (
              <li
                key={session.day}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {formatDayHeading(session.day)}
                  </p>
                  <p className="text-muted-foreground text-[11px] tabular-nums">
                    {session.setCount} {session.setCount === 1 ? "set" : "sets"}
                    {session.best > 0
                      ? ` · ${bestLabel} ${formatCompact(session.best)}`
                      : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium tabular-nums">
                    {formatCompact(session.value)}
                  </p>
                  {change ? (
                    <p
                      className={cn(
                        "text-[11px] tabular-nums",
                        change.startsWith("+")
                          ? "text-emerald-600 dark:text-emerald-400"
                          : change.startsWith("-")
                            ? "text-destructive"
                            : "text-muted-foreground",
                      )}
                    >
                      {change}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/40 px-3 py-2.5">
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-1 text-lg font-medium tabular-nums leading-none">
        {value}
      </p>
    </div>
  );
}
