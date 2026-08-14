import { describe, expect, it } from "vitest";
import { computeAge } from "@/lib/football-api/age";

describe("computeAge — whole-year age against a fixed reference date", () => {
  it("computes age when the birthday has already passed this year", () => {
    // Born 1993-07-18; reference 2026-08-14 -> birthday already passed this year.
    expect(computeAge("1993-07-18", new Date("2026-08-14T00:00:00Z"))).toBe(33);
  });

  it("computes age when the birthday has not yet occurred this year", () => {
    // Born 1993-09-18; reference 2026-08-14 -> birthday not yet reached this year.
    expect(computeAge("1993-09-18", new Date("2026-08-14T00:00:00Z"))).toBe(32);
  });

  it("counts the full year on the exact birthday", () => {
    expect(computeAge("1993-08-14", new Date("2026-08-14T00:00:00Z"))).toBe(33);
  });

  it("counts the full year the day after the birthday", () => {
    expect(computeAge("1993-08-13", new Date("2026-08-14T00:00:00Z"))).toBe(33);
  });

  it("does not yet count the new year the day before the birthday", () => {
    expect(computeAge("1993-08-15", new Date("2026-08-14T00:00:00Z"))).toBe(32);
  });

  it("handles a same-month, later-day birthday not yet reached", () => {
    // Born on the 20th, reference is the 14th of the same month -> not yet reached.
    expect(computeAge("2000-08-20", new Date("2026-08-14T00:00:00Z"))).toBe(25);
  });

  it("handles a same-month, earlier-day birthday already passed", () => {
    expect(computeAge("2000-08-01", new Date("2026-08-14T00:00:00Z"))).toBe(26);
  });

  it("is stable across repeated calls with the same inputs (deterministic, no live now())", () => {
    const dob = "1998-03-05";
    const reference = new Date("2026-08-14T00:00:00Z");

    const first = computeAge(dob, reference);
    const second = computeAge(dob, reference);

    expect(second).toBe(first);
  });
});
