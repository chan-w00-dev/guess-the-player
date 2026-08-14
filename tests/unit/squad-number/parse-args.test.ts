import { describe, expect, it } from "vitest";
import { parseSquadNumberArgs } from "@/scripts/update-squad-numbers";

describe("parseSquadNumberArgs — single-player form (--id, --number)", () => {
  it("parses --id=<n> --number=<n> into a single id-keyed entry", () => {
    const entries = parseSquadNumberArgs(["--id=1001", "--number=9"]);
    expect(entries).toEqual([{ id: 1001, squadNumber: 9 }]);
  });

  it("throws when --id is missing", () => {
    expect(() => parseSquadNumberArgs(["--number=9"])).toThrow(/--id/);
  });

  it("throws when --number is missing", () => {
    expect(() => parseSquadNumberArgs(["--id=1001"])).toThrow(/--number/);
  });

  it("throws when --id or --number is not numeric", () => {
    expect(() => parseSquadNumberArgs(["--id=abc", "--number=9"])).toThrow(/numeric/);
  });
});

describe("parseSquadNumberArgs — small-batch form (--entries)", () => {
  it("parses a JSON array of {id, squadNumber} entries", () => {
    const entries = parseSquadNumberArgs([
      '--entries=[{"id":1001,"squadNumber":9},{"id":1002,"squadNumber":7}]',
    ]);
    expect(entries).toEqual([
      { id: 1001, squadNumber: 9 },
      { id: 1002, squadNumber: 7 },
    ]);
  });

  it("throws when --entries is not a JSON array", () => {
    expect(() => parseSquadNumberArgs(['--entries={"id":1001,"squadNumber":9}'])).toThrow(
      /array/,
    );
  });

  it("throws when an --entries item is missing a numeric id or squadNumber", () => {
    expect(() => parseSquadNumberArgs(['--entries=[{"id":1001}]'])).toThrow(
      /numeric id and squadNumber/,
    );
  });

  it("--entries takes precedence over --id/--number when both are given", () => {
    const entries = parseSquadNumberArgs([
      "--id=1",
      "--number=1",
      '--entries=[{"id":2,"squadNumber":2}]',
    ]);
    expect(entries).toEqual([{ id: 2, squadNumber: 2 }]);
  });
});

describe("parseSquadNumberArgs — no bundled seed dataset (spec.md §D exclusion)", () => {
  it("throws with a helpful message when no recognized flag is provided", () => {
    expect(() => parseSquadNumberArgs([])).toThrow(/--id.*--number|--entries/);
  });
});
