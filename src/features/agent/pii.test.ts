import { describe, expect, it } from "vitest";

import { hasPii, redactPii, redactPiiDeep } from "@/features/agent/pii";

describe("pii guards", () => {
  it("redacts email, phone, ssn, and luhn cards", () => {
    expect(
      redactPii(
        "email me at alex@gym.test or 555-123-4567 ssn 123-45-6789 card 4111111111111111",
      ),
    ).toBe(
      "email me at [EMAIL] or [PHONE] ssn [SSN] card [CARD]",
    );
  });

  it("leaves training numbers alone", () => {
    const note = "Hit 3x8 at 185 lbs, last set 12 reps on 2024-01-15.";
    expect(redactPii(note)).toBe(note);
    expect(hasPii(note)).toBe(false);
  });

  it("redacts nested tool payloads", () => {
    expect(
      redactPiiDeep({
        notes: [{ text: "Call me at (415) 555-0100" }],
        weight: 185,
      }),
    ).toEqual({
      notes: [{ text: "Call me at [PHONE]" }],
      weight: 185,
    });
  });

  it("redacts secret-like tokens", () => {
    expect(redactPii("key sk-abcdefghijklmnopqrstuvwxyz1234")).toContain(
      "[SECRET]",
    );
  });
});
