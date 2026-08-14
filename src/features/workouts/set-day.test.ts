import { describe, expect, it } from "vitest";

import { parseIsoDate, periodRange } from "@/features/workouts/set-day";

describe("parseIsoDate", () => {
  it("parses a calendar date", () => {
    const parsed = parseIsoDate("2026-08-14");
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(7);
    expect(parsed?.getDate()).toBe(14);
  });

  it("rejects invalid dates", () => {
    expect(parseIsoDate("2026-13-01")).toBeNull();
    expect(parseIsoDate("2026-02-31")).toBeNull();
    expect(parseIsoDate("08-14-2026")).toBeNull();
  });
});

describe("periodRange", () => {
  const friday = new Date(2026, 7, 14);

  it("returns a single day", () => {
    const range = periodRange("day", friday);
    expect(range.startDay).toBe("2026-08-14");
    expect(range.endDay).toBe("2026-08-14");
    expect(range.end.getTime()).toBe(new Date(2026, 7, 15).getTime());
  });

  it("returns the Monday–Sunday week containing the date", () => {
    const range = periodRange("week", friday);
    expect(range.startDay).toBe("2026-08-10");
    expect(range.endDay).toBe("2026-08-16");
  });

  it("returns the calendar month", () => {
    const range = periodRange("month", friday);
    expect(range.startDay).toBe("2026-08-01");
    expect(range.endDay).toBe("2026-08-31");
  });

  it("returns the calendar year", () => {
    const range = periodRange("year", friday);
    expect(range.startDay).toBe("2026-01-01");
    expect(range.endDay).toBe("2026-12-31");
  });
});
