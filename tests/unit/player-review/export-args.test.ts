import { describe, expect, it } from "vitest";
import { parseExportArgs } from "@/scripts/export-players-for-review";

describe("parseExportArgs", () => {
  it("defaults to data/player-review-export.csv when no --out flag is given", () => {
    expect(parseExportArgs([])).toEqual({ outPath: "data/player-review-export.csv" });
  });

  it("uses the path from --out=<path> when given", () => {
    expect(parseExportArgs(["--out=tmp/review.csv"])).toEqual({ outPath: "tmp/review.csv" });
  });
});
