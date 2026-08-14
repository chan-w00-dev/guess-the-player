/**
 * Manual squad-number entry core logic — SPEC-GAME-CORE-001 §F, HISTORY
 * 0.5.0 (REQ-SYNC-004, AC-GAME-CORE-030).
 *
 * Takes an already-parsed `SquadNumberEntry[]` — id-keyed, NOT name-keyed
 * (unlike `lib/korean-name-mapping/seed.ts`'s `KoreanMapping[]`, which is
 * keyed by original-language name) — and performs a targeted
 * `update players set squad_number = ? where id = ?` for each entry via the
 * injected {@link SquadNumberSupabaseLike} (service_role — RLS grants
 * `anon` no write policy on `players`, mirroring
 * `lib/player-data-sync/sync.ts`).
 *
 * This is deliberately NOT a bulk seed-and-replace operation over a
 * checked-in dataset file (spec.md §D "Out of Scope — Squad Number
 * Administration Tooling"): the caller (`scripts/update-squad-numbers.ts`)
 * supplies a small, ad-hoc entries list — one player at a time, or a small
 * batch — never a bundled repo-committed dataset analogous to
 * `data/korean-name-seed.json`.
 *
 * Resilient by design: a single entry's update failure is recorded in
 * `errors` and does not stop the remaining entries from being attempted —
 * matching the M4 sync job's and M5 seed script's partial-failure-resilience
 * pattern.
 */

import type { SquadNumberEntry, SquadNumberSupabaseLike } from "./types";

export interface RunSquadNumberUpdateOptions {
  entries: SquadNumberEntry[];
  supabase: SquadNumberSupabaseLike;
}

export interface SquadNumberUpdateSummary {
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Updates `players.squad_number` for every entry in `entries`, one targeted
 * `update ... where id = ?` per entry (REQ-SYNC-004). Never throws — every
 * per-entry failure (a returned error or a thrown exception) is recorded in
 * the returned summary's `errors` list and the loop continues to the next
 * entry.
 *
 * @MX:ANCHOR: [AUTO] runSquadNumberUpdate is the sole write path for the
 * `players.squad_number` column (expected fan_in >= 3 once
 * scripts/update-squad-numbers.ts and this module's own test suite are
 * counted alongside any future admin-facing caller).
 * @MX:REASON: the ONLY code path in this SPEC's scope permitted to write
 * `squad_number` — the M4 sync job's upsert payload structurally excludes
 * this column (REQ-SYNC-005); any future write path for this column MUST
 * route through here to preserve that invariant.
 */
export async function runSquadNumberUpdate({
  entries,
  supabase,
}: RunSquadNumberUpdateOptions): Promise<SquadNumberUpdateSummary> {
  const summary: SquadNumberUpdateSummary = { updated: 0, skipped: 0, errors: [] };

  for (const entry of entries) {
    try {
      const { error } = await supabase
        .from("players")
        .update({ squad_number: entry.squadNumber })
        .eq("id", entry.id);

      if (error) {
        summary.skipped += 1;
        summary.errors.push(`id=${entry.id}: ${error.message}`);
        continue;
      }

      summary.updated += 1;
    } catch (thrown: unknown) {
      summary.skipped += 1;
      const message = thrown instanceof Error ? thrown.message : String(thrown);
      summary.errors.push(`id=${entry.id}: ${message}`);
    }
  }

  return summary;
}
