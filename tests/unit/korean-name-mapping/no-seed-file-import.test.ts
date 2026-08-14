import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Static import-boundary check backing REQ-KOREAN-005 / AC-GAME-CORE-018 —
 * the bundled seed dataset file must never be imported/read from any module
 * under `lib/korean-name-mapping/`; it is a one-time bootstrap artifact read
 * only by the seed script. This test is a fast unit-level complement to the
 * plan.md §E static grep check (which additionally scans the whole repo,
 * not just this module).
 *
 * The seed filename is built via concatenation, not written as a literal,
 * so this test file itself never becomes a false-positive match in the
 * repo-wide plan.md §E grep for that filename.
 */
const SEED_FILE_NAME = ["korean-name-seed", "json"].join(".");

describe("lib/korean-name-mapping — no direct seed-file import (REQ-KOREAN-005)", () => {
  it("never references the seed dataset filename from any module in lib/korean-name-mapping/", () => {
    const libDir = join(process.cwd(), "lib", "korean-name-mapping");
    const files = readdirSync(libDir).filter((file) => file.endsWith(".ts"));

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const content = readFileSync(join(libDir, file), "utf-8");
      expect(content).not.toContain(SEED_FILE_NAME);
    }
  });
});
