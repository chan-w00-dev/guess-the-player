#!/usr/bin/env node
/**
 * Manual-trigger entry point for the M12 combined player-data review CSV
 * export — SPEC-GAME-CORE-001 §F M12 (REQ-REVIEW-001).
 *
 * Run via `npm run export:players-review` (optionally
 * `-- --out=<path>` to override the default output path, e.g.
 * `npm run export:players-review -- --out=data/my-review.csv`).
 *
 * Read-only: reads the `players` table and the `korean_name_mappings` table
 * exclusively via the `anon` key
 * (`lib/player-review/supabase-adapter.ts` -> `getSupabaseClient()`) — this
 * script never imports `createSeedSupabaseClient` or
 * `createSquadNumberSupabaseClient` (the service_role factories are a
 * write-only concern reserved for the sibling import script).
 *
 * The two tables are joined in application code
 * (`players.name === korean_name_mappings.original_name`,
 * `lib/player-review/export.ts`'s `buildPlayerReviewRows`) the same way
 * `lib/player-search/search.ts` already does — no DB-level FK exists
 * between these tables.
 *
 * The written CSV file is a generated artifact, not committed seed data —
 * see `.gitignore`.
 */

import fs from "node:fs";
import path from "node:path";
import {
  createPlayerReviewExportSupabaseClient,
  runPlayerReviewExport,
  toReviewCsvText,
} from "../lib/player-review";

const DEFAULT_OUT_PATH = "data/player-review-export.csv";

/**
 * Parses `--out=<path>` from a raw argv-style string array. Exported as a
 * pure function for unit testing — never touches `process.argv` itself.
 * Mirrors the flag-parsing style of `scripts/update-squad-numbers.ts`'s
 * `parseSquadNumberArgs`.
 */
export function parseExportArgs(argv: string[]): { outPath: string } {
  const flags = new Map<string, string>();
  for (const arg of argv) {
    const match = /^--([a-z]+)=(.*)$/.exec(arg);
    if (match) {
      flags.set(match[1], match[2]);
    }
  }
  return { outPath: flags.get("out") ?? DEFAULT_OUT_PATH };
}

async function main(): Promise<void> {
  const { outPath } = parseExportArgs(process.argv.slice(2));
  const supabase = createPlayerReviewExportSupabaseClient();

  const rows = await runPlayerReviewExport({ supabase });
  const csvText = toReviewCsvText(rows);

  const outDir = path.dirname(outPath);
  if (outDir !== ".") {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(outPath, csvText, "utf8");

  console.log(`[export-players-for-review] wrote ${rows.length} row(s) to ${outPath}`);
}

// Only run when invoked directly (not when imported by a test for
// parseExportArgs), mirroring scripts/update-squad-numbers.ts's guard.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[export-players-for-review] fatal error: ${message}`);
    process.exitCode = 1;
  });
}
