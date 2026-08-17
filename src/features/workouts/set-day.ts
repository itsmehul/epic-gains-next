export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const SET_PERIOD_VALUES = ["day", "week", "month", "year"] as const;
export type SetPeriod = (typeof SET_PERIOD_VALUES)[number];

export type PeriodRange = {
  start: Date;
  end: Date;
  startDay: string;
  endDay: string;
};

export function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE_RE.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (localDateString(parsed) !== value) return null;
  return parsed;
}

/** Inclusive calendar range for the period containing `on` (local timezone). `end` is exclusive. */
export function periodRange(period: SetPeriod, on = new Date()): PeriodRange {
  const d = new Date(on);
  d.setHours(0, 0, 0, 0);

  if (period === "day") {
    const start = new Date(d);
    const end = new Date(d);
    end.setDate(end.getDate() + 1);
    return {
      start,
      end,
      startDay: localDateString(start),
      endDay: localDateString(start),
    };
  }

  if (period === "week") {
    const weekday = d.getDay();
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    const start = new Date(d);
    start.setDate(d.getDate() + mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const lastDay = new Date(end);
    lastDay.setDate(end.getDate() - 1);
    return {
      start,
      end,
      startDay: localDateString(start),
      endDay: localDateString(lastDay),
    };
  }

  if (period === "month") {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const lastDay = new Date(end);
    lastDay.setDate(end.getDate() - 1);
    return {
      start,
      end,
      startDay: localDateString(start),
      endDay: localDateString(lastDay),
    };
  }

  const start = new Date(d.getFullYear(), 0, 1);
  const end = new Date(d.getFullYear() + 1, 0, 1);
  const lastDay = new Date(end);
  lastDay.setDate(end.getDate() - 1);
  return {
    start,
    end,
    startDay: localDateString(start),
    endDay: localDateString(lastDay),
  };
}

export function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addCalendarDays(isoDate: string, days: number): string {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return isoDate;
  parsed.setDate(parsed.getDate() + days);
  return localDateString(parsed);
}

/**
 * Logged flags for the previous and current Monday–Sunday weeks
 * (14 days, oldest → newest).
 */
export function lastTwoIsoWeeksLogged(
  days: Iterable<string>,
  today = localDateString(),
): boolean[] {
  const unique = new Set(days);
  const on = parseIsoDate(today) ?? new Date();
  const start = addCalendarDays(periodRange("week", on).startDay, -7);
  return Array.from({ length: 14 }, (_, index) =>
    unique.has(addCalendarDays(start, index)),
  );
}

/** Inclusive calendar range. `end` on the returned PeriodRange is exclusive. */
export function inclusiveDateRange(
  startDay: string,
  endDay: string,
): PeriodRange {
  const start = parseIsoDate(startDay);
  const last = parseIsoDate(endDay);
  if (!start || !last) {
    return periodRange("day");
  }
  const end = new Date(last);
  end.setDate(end.getDate() + 1);
  return {
    start,
    end,
    startDay,
    endDay,
  };
}

export function dayKey(value: string | Date): string {
  if (typeof value === "string") {
    const iso = value.slice(0, 10);
    if (ISO_DATE_RE.test(iso) && value.length === 10) return iso;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return localDateString(parsed);
    return localDateString();
  }
  return localDateString(value);
}

export function formatDayHeading(
  isoDate: string,
  today = localDateString(),
): string {
  if (isoDate === today) return "Today";

  const yesterday = parseIsoDate(today);
  if (yesterday) {
    yesterday.setDate(yesterday.getDate() - 1);
    if (isoDate === localDateString(yesterday)) return "Yesterday";
  }

  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatRelativeDayHeading(
  isoDate: string,
  today = localDateString(),
): string {
  if (isoDate === today) return "Today";

  const start = parseIsoDate(isoDate);
  const todayDate = parseIsoDate(today);
  if (!start || !todayDate) return formatDayHeading(isoDate, today);

  const diffDays = Math.round(
    (todayDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  if (diffDays >= 7 && diffDays < 14) return "Last week";
  if (diffDays >= 14 && diffDays < 30) {
    const weeks = Math.round(diffDays / 7);
    return weeks === 1 ? "Last week" : `${weeks} weeks ago`;
  }

  return formatDayHeading(isoDate, today);
}

export function lastSessionHeading(
  isoDate: string,
  today = localDateString(),
): string {
  const relative = formatRelativeDayHeading(isoDate, today);
  const when =
    relative === "Today" ||
      relative === "Yesterday" ||
      relative === "Last week" ||
      / ago$/.test(relative)
      ? relative.toLowerCase()
      : relative;
  return `Last session · ${when}`;
}

export function groupSetsByDay<
  T extends { updatedAt: string | Date; createdAt?: string | Date },
>(sets: T[]): { day: string; sets: T[] }[] {
  const map = new Map<string, T[]>();
  for (const set of sets) {
    const key = dayKey(set.updatedAt);
    const list = map.get(key) ?? [];
    list.push(set);
    map.set(key, list);
  }

  for (const daySets of map.values()) {
    daySets.sort((a, b) => {
      const aTime = new Date(a.createdAt ?? a.updatedAt).getTime();
      const bTime = new Date(b.createdAt ?? b.updatedAt).getTime();
      return aTime - bTime;
    });
  }

  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, daySets]) => ({ day, sets: daySets }));
}
