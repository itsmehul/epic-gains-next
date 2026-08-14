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

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isoDate === localDateString(yesterday)) return "Yesterday";

  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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
