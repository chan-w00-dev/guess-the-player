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

/** The UTF-8 byte-order mark — see {@link withUtf8Bom}'s doc comment for why it's added here. */
const UTF8_BOM = "﻿";

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

/**
 * Prepends the UTF-8 byte-order mark to `csvText`. Microsoft Excel's
 * default CSV-open behavior (double-click / File > Open, as opposed to the
 * explicit Data > Get Data > From Text/CSV import wizard) does not reliably
 * auto-detect UTF-8 without a BOM — it falls back to the system's legacy
 * codepage, corrupting any multi-byte UTF-8 character in a player name
 * (e.g. "Ødegaard") into mojibake. The BOM signals Excel to treat the file
 * as UTF-8 on open. This is a file-on-disk/Excel-consumption concern, so it
 * is applied only at this script's file-write boundary — deliberately NOT
 * inside `lib/player-review/export.ts`'s `toReviewCsvText` or
 * `lib/csv/write.ts`'s `writeCsv`, which stay general-purpose, pure
 * string-producing functions with no file-writing concern. Exported as a
 * pure function for unit testing — never touches `fs.writeFileSync` itself.
 */
export function withUtf8Bom(csvText: string): string {
  return `${UTF8_BOM}${csvText}`;
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
  fs.writeFileSync(outPath, withUtf8Bom(csvText), "utf8");

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
