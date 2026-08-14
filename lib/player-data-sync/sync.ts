/**
 * Player-data sync job — SPEC-GAME-CORE-001 §F M4.
 *
 * The sole caller of the M3 {@link FootballDataProvider} abstraction
 * (REQ-SYNC-001). Fetches the Premier League 2026/27 season player pool and
 * the 4 required attribute fields — plus the optional display-only `photo`
 * field when present — and writes/refreshes the Supabase `players` table.
 *
 * This module is resilient to a single player's write failure: a failure
 * (a returned `{ error }` from the injected `SupabaseLike`, OR a thrown
 * exception) is collected into the summary's `errors` array and the loop
 * continues with the remaining players — consistent with M3's own
 * fallback-skip conventions (plan.md §B position-taxonomy fallback).
 *
 * Cadence (daily/weekly cron, manual trigger, etc.) is deliberately NOT
 * decided here — this module is a plain callable function; wiring a
 * schedule around it is a run-phase implementation detail out of this
 * milestone's scope (plan.md §F M4). See `scripts/sync-players.ts` for the
 * manual-trigger entry point.
 *
 * @MX:ANCHOR: [AUTO] runPlayerDataSync is the ONLY code path (besides this
 * module's own tests and M3's tests) permitted to import from
 * `lib/football-api/football-data-org-provider` (REQ-SYNC-001).
 * @MX:REASON: football-data.org's free-tier rate limit (10 req/min) is
 * global across all app users — live gameplay must never call it directly
 * (spec.md REQ-SYNC-001, REQ-NFR-004); this sync job is the sole exception.
 */

import type { FootballDataProvider } from "@/lib/football-api";
import type { Player } from "@/types/player";
import type { PlayerRow, SupabaseLike } from "./types";

/** Premier League 2026/27 season — the sole scope of this SPEC (spec.md §D). */
export const DEFAULT_SEASON = "2026/27";

export interface RunPlayerDataSyncOptions {
  /** The M3 abstraction this sync job is the sole consumer of. */
  provider: FootballDataProvider;
  /** Injected Supabase table handle — a real client or a test fake. */
  supabase: SupabaseLike;
  /** Season stamp written to every row. Defaults to {@link DEFAULT_SEASON}. */
  season?: string;
  /** Clock override for deterministic tests. Defaults to `() => new Date()`. */
  now?: () => Date;
}

export interface PlayerDataSyncSummary {
  /** Count of players successfully upserted. */
  synced: number;
  /** Count of players whose upsert failed (error or thrown exception). */
  skipped: number;
  /** One human-readable message per skipped player, in encounter order. */
  errors: string[];
}

/**
 * Maps a synced {@link Player} onto the sync job's upsert payload shape.
 *
 * Deliberately omits `squad_number` (REQ-SYNC-005, spec.md HISTORY 0.5.0):
 * `player.squadNumber` is NEVER read here, even though `Player` carries the
 * field again as of the 0.5.0 reinstatement. Squad numbers are populated
 * exclusively by the manual entry mechanism (`lib/squad-number/`), and this
 * upsert runs on every periodic sync — if `squad_number` were included, a
 * manually-entered value would be silently wiped to null on the very next
 * sync run, since football-data.org never returns this field (confirmed
 * 0.4.0). `PlayerRow` (see `./types.ts`) structurally has no `squad_number`
 * field at all, so this omission is enforced at the type level, not just by
 * convention.
 */
function toPlayerRow(player: Player, season: string, syncedAt: string): PlayerRow {
  return {
    id: Number(player.id),
    name: player.name,
    club: player.club,
    position: player.position,
    nationality: player.nationality,
    age: player.age,
    photo_url: player.photo ?? null,
    season,
    synced_at: syncedAt,
  };
}

/**
 * Fetches the current player pool from the injected provider and
 * upserts (insert-or-update-on-conflict-by-id) each player into the
 * Supabase `players` table via the injected client. Never throws on a
 * single player's write failure — see the module doc comment above.
 */
export async function runPlayerDataSync(
  options: RunPlayerDataSyncOptions,
): Promise<PlayerDataSyncSummary> {
  const { provider, supabase, season = DEFAULT_SEASON, now = () => new Date() } = options;

  const players = await provider.fetchPlayerPool();
  const syncedAt = now().toISOString();

  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const player of players) {
    try {
      const row = toPlayerRow(player, season, syncedAt);
      const { error } = await supabase.from("players").upsert(row, { onConflict: "id" });

      if (error) {
        skipped += 1;
        errors.push(`player id=${player.id} (${player.name}): ${error.message}`);
        continue;
      }

      synced += 1;
    } catch (err) {
      skipped += 1;
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`player id=${player.id} (${player.name}): ${message}`);
    }
  }

  return { synced, skipped, errors };
}
