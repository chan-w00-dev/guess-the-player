import { describe, expect, it } from "vitest";
import { parseImportArgs } from "@/scripts/import-players-review";

describe("parseImportArgs", () => {
  it("defaults to data/player-review-export.csv when no --in flag is given", () => {
    expect(parseImportArgs([])).toEqual({ inPath: "data/player-review-export.csv" });
  });

  it("uses the path from --in=<path> when given", () => {
    expect(parseImportArgs(["--in=tmp/review-edited.csv"])).toEqual({
      inPath: "tmp/review-edited.csv",
    });
  });
});
