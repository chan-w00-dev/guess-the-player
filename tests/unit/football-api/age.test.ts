import { describe, expect, it } from "vitest";
import { computeAge } from "@/lib/football-api/age";

describe("computeAge — calendar-year-only ('연 나이'), no birthday adjustment", () => {
  it("computes age as referenceYear - birthYear when the birthday has already passed this year", () => {
    // Born 1993-07-18; reference 2026-08-14 -> 2026 - 1993 = 33.
    expect(computeAge("1993-07-18", new Date("2026-08-14T00:00:00Z"))).toBe(33);
  });

  it("computes age as referenceYear - birthYear even when the birthday has NOT yet occurred this year", () => {
    // Born 1993-09-18; reference 2026-08-14 -> still 2026 - 1993 = 33
    // (calendar-year-only: no month/day comparison, unlike a birthday-adjusted method).
    expect(computeAge("1993-09-18", new Date("2026-08-14T00:00:00Z"))).toBe(33);
  });

  it("counts the full year on the exact birthday", () => {
    expect(computeAge("1993-08-14", new Date("2026-08-14T00:00:00Z"))).toBe(33);
  });

  it("counts the full year the day after the birthday", () => {
    expect(computeAge("1993-08-13", new Date("2026-08-14T00:00:00Z"))).toBe(33);
  });

  it("still counts the full year on the day BEFORE the birthday (no birthday adjustment)", () => {
    // A birthday-adjusted ("만 나이") method would return 32 here; the
    // calendar-year-only method always returns 33, since only the year
    // components are compared (2026 - 1993).
    expect(computeAge("1993-08-15", new Date("2026-08-14T00:00:00Z"))).toBe(33);
  });

  it("gives the same result regardless of whether the birthday falls earlier or later in the year", () => {
    const earlierInYear = computeAge("2000-01-01", new Date("2026-08-14T00:00:00Z"));
    const laterInYear = computeAge("2000-12-31", new Date("2026-08-14T00:00:00Z"));

    expect(earlierInYear).toBe(26);
    expect(laterInYear).toBe(26);
    expect(earlierInYear).toBe(laterInYear);
  });

  it("age increments exactly on January 1st (calendar-year boundary), not on the individual's birthday", () => {
    const dob = "1998-06-15";

    const lastDayOfPriorYear = computeAge(dob, new Date("2025-12-31T00:00:00Z"));
    const firstDayOfNewYear = computeAge(dob, new Date("2026-01-01T00:00:00Z"));

    expect(lastDayOfPriorYear).toBe(27);
    expect(firstDayOfNewYear).toBe(28);
  });

  it("is stable across repeated calls with the same inputs (deterministic, no live now())", () => {
    const dob = "1998-03-05";
    const reference = new Date("2026-08-14T00:00:00Z");

    const first = computeAge(dob, reference);
    const second = computeAge(dob, reference);

    expect(second).toBe(first);
  });
});
