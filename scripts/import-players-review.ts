#!/usr/bin/env node
/**
 * Manual-trigger entry point for the M12 combined player-data review CSV
 * import — SPEC-GAME-CORE-001 §F M12 (REQ-REVIEW-002, REQ-REVIEW-003).
 *
 * Run via `npm run import:players-review` (optionally `-- --in=<path>` to
 * override the default input path — the CSV produced by
 * `npm run export:players-review`, then hand-edited).
 *
 * Writes exclusively through the already-tested reused write paths — this
 * file never issues a raw Supabase upsert or update call directly:
 *   - `runKoreanNameSeed` (`lib/korean-name-mapping/`) for the `koreanName`
 *     column, upserted keyed by the row's `name` (that module's existing
 *     `original_name` conflict target).
 *   - `runSquadNumberUpdate` (`lib/squad-number/`) for the `squadNumber`
 *     column, updated keyed by the row's numeric `id`.
 * Reusing these functions verbatim (rather than re-deriving their logic
 * here) preserves REQ-SYNC-005's sync-non-overwrite guarantee and each
 * function's own already-tested behavior without duplicating it (plan.md
 * §G anti-pattern).
 *
 * Blank cells are excluded from both write batches before either reused
 * function is called (`buildReviewWriteBatches`,
 * `lib/player-review/import.ts`) — this is what satisfies REQ-REVIEW-003
 * (never overwrite an existing value with blank) by construction, since
 * neither reused function ever touches a row that was never included in
 * its input array.
 *
 * Writes via the `service_role` key (through `createSeedSupabaseClient` /
 * `createSquadNumberSupabaseClient`), not `anon` — mirrors
 * `scripts/seed-korean-names.ts` and `scripts/update-squad-numbers.ts`.
 */

import fs from "node:fs";
import { createSeedSupabaseClient, runKoreanNameSeed } from "../lib/korean-name-mapping";
import { buildReviewWriteBatches, parsePlayerReviewCsv } from "../lib/player-review";
import { createSquadNumberSupabaseClient, runSquadNumberUpdate } from "../lib/squad-number";

const DEFAULT_IN_PATH = "data/player-review-export.csv";

/** The UTF-8 byte-order mark — see {@link stripUtf8Bom}'s doc comment for why it's stripped here. */
const UTF8_BOM = "﻿";

/**
 * Parses `--in=<path>` from a raw argv-style string array. Exported as a
 * pure function for unit testing — never touches `process.argv` itself.
 * Mirrors the flag-parsing style of `scripts/update-squad-numbers.ts`'s
 * `parseSquadNumberArgs`.
 */
export function parseImportArgs(argv: string[]): { inPath: string } {
  const flags = new Map<string, string>();
  for (const arg of argv) {
    const match = /^--([a-z]+)=(.*)$/.exec(arg);
    if (match) {
      flags.set(match[1], match[2]);
    }
  }
  return { inPath: flags.get("in") ?? DEFAULT_IN_PATH };
}

/**
 * Strips a single leading UTF-8 byte-order mark from `csvText`, if present.
 * Defensive on two fronts: (a) re-importing a file this tool itself
 * exported, which now carries the BOM (see
 * `scripts/export-players-for-review.ts`'s `withUtf8Bom` — Excel does not
 * reliably auto-detect UTF-8 without a BOM on a direct file-open), and (b)
 * importing a file the user edited and re-saved from Excel as "CSV UTF-8",
 * which commonly also writes a BOM. Left unstripped, the BOM would corrupt
 * the parsed header's first column name (`"﻿id"` instead of `"id"`),
 * failing `parsePlayerReviewCsv`'s header-match check. Exported as a pure
 * function for unit testing — never touches `fs.readFileSync` itself.
 */
export function stripUtf8Bom(csvText: string): string {
  return csvText.startsWith(UTF8_BOM) ? csvText.slice(UTF8_BOM.length) : csvText;
}

async function main(): Promise<void> {
  const { inPath } = parseImportArgs(process.argv.slice(2));
  const csvText = stripUtf8Bom(fs.readFileSync(inPath, "utf8"));

  const rows = parsePlayerReviewCsv(csvText);
  const { koreanMappings, squadNumberEntries } = buildReviewWriteBatches(rows);

  const koreanNameSummary = await runKoreanNameSeed({
    mappings: koreanMappings,
    supabase: createSeedSupabaseClient(),
  });
  const squadNumberSummary = await runSquadNumberUpdate({
    entries: squadNumberEntries,
    supabase: createSquadNumberSupabaseClient(),
  });

  console.log(
    `[import-players-review] koreanName: synced=${koreanNameSummary.synced} skipped=${koreanNameSummary.skipped} (of ${koreanMappings.length})`,
  );
  console.log(
    `[import-players-review] squadNumber: updated=${squadNumberSummary.updated} skipped=${squadNumberSummary.skipped} (of ${squadNumberEntries.length})`,
  );

  const allErrors = [...koreanNameSummary.errors, ...squadNumberSummary.errors];
  if (allErrors.length > 0) {
    console.warn(`[import-players-review] ${allErrors.length} error(s) during this run:`);
    for (const error of allErrors) {
      console.warn(`  - ${error}`);
    }
  }

  const attempted = koreanMappings.length + squadNumberEntries.length;
  const succeeded = koreanNameSummary.synced + squadNumberSummary.updated;
  if (attempted > 0 && succeeded === 0 && allErrors.length > 0) {
    process.exitCode = 1;
  }
}

// Only run when invoked directly (not when imported by a test for
// parseImportArgs), mirroring scripts/update-squad-numbers.ts's guard.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[import-players-review] fatal error: ${message}`);
    process.exitCode = 1;
  });
}
