#!/usr/bin/env node
/**
 * Manual-trigger entry point for the squad-number manual entry mechanism —
 * SPEC-GAME-CORE-001 §F, HISTORY 0.5.0 (REQ-SYNC-004, AC-GAME-CORE-030).
 *
 * Run via `npm run update:squad-number -- --id=<player id> --number=<squad
 * number>` for a single player, or
 * `npm run update:squad-number -- --entries='[{"id":1,"squadNumber":9}]'`
 * for a small batch. Deliberately does NOT read a bundled, checked-in seed
 * dataset file the way `scripts/seed-korean-names.ts` reads
 * `data/korean-name-seed.json` — spec.md §D "Out of Scope — Squad Number
 * Administration Tooling" explicitly excludes a seed-and-replace bulk-import
 * pattern for this attribute (unlike the Korean mapping table). The `id` is
 * the numeric `players.id` primary key — look it up via
 * `select id, name from public.players where name = '<player name>';` in
 * the Supabase SQL Editor before running this script.
 *
 * Requires:
 *   1. `supabase/migrations/0004_add_squad_number_column.sql` has been
 *      applied to your Supabase project (Dashboard → SQL Editor → paste →
 *      Run).
 *   2. `.env.local` is populated with `NEXT_PUBLIC_SUPABASE_URL` and
 *      `SUPABASE_SERVICE_ROLE_KEY`.
 *
 * Writes via the `service_role` key, NOT `anon` — Row Level Security on the
 * `players` table grants `anon` a public SELECT-only policy (no write
 * policy), mirroring `scripts/sync-players.ts` and
 * `scripts/seed-korean-names.ts`.
 */

import { createSquadNumberSupabaseClient, runSquadNumberUpdate } from "../lib/squad-number";
import type { SquadNumberEntry } from "../lib/squad-number";

/**
 * Parses `--id=<n> --number=<n>` (single entry) or `--entries='<json>'`
 * (small batch) from a raw argv-style string array into a
 * {@link SquadNumberEntry} list. Exported as a pure function for unit
 * testing — never touches `process.argv` itself.
 */
export function parseSquadNumberArgs(argv: string[]): SquadNumberEntry[] {
  const flags = new Map<string, string>();
  for (const arg of argv) {
    const match = /^--([a-z]+)=(.*)$/.exec(arg);
    if (match) {
      flags.set(match[1], match[2]);
    }
  }

  const entriesFlag = flags.get("entries");
  if (entriesFlag !== undefined) {
    const parsed = JSON.parse(entriesFlag) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("update-squad-numbers: --entries must be a JSON array");
    }
    return parsed.map((raw): SquadNumberEntry => {
      const entry = raw as { id?: unknown; squadNumber?: unknown };
      if (typeof entry.id !== "number" || typeof entry.squadNumber !== "number") {
        throw new Error(
          "update-squad-numbers: each --entries item must have numeric id and squadNumber",
        );
      }
      return { id: entry.id, squadNumber: entry.squadNumber };
    });
  }

  const idFlag = flags.get("id");
  const numberFlag = flags.get("number");
  if (idFlag === undefined || numberFlag === undefined) {
    throw new Error(
      "update-squad-numbers: pass --id=<player id> --number=<squad number>, or --entries='<json array>'",
    );
  }

  const id = Number(idFlag);
  const squadNumber = Number(numberFlag);
  if (Number.isNaN(id) || Number.isNaN(squadNumber)) {
    throw new Error("update-squad-numbers: --id and --number must be numeric");
  }

  return [{ id, squadNumber }];
}

async function main(): Promise<void> {
  const entries = parseSquadNumberArgs(process.argv.slice(2));
  const supabase = createSquadNumberSupabaseClient();

  const summary = await runSquadNumberUpdate({ entries, supabase });

  console.log(
    `[update-squad-numbers] updated=${summary.updated} skipped=${summary.skipped} (total=${entries.length})`,
  );

  if (summary.errors.length > 0) {
    console.warn(`[update-squad-numbers] ${summary.errors.length} error(s) during this run:`);
    for (const error of summary.errors) {
      console.warn(`  - ${error}`);
    }
  }

  if (summary.updated === 0 && summary.errors.length > 0) {
    process.exitCode = 1;
  }
}

// Only run when invoked directly (not when imported by a test for
// parseSquadNumberArgs), mirroring the pattern of this script's siblings
// which are always run directly via `npm run <script>`.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[update-squad-numbers] fatal error: ${message}`);
    process.exitCode = 1;
  });
}
