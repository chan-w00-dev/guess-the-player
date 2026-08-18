/**
 * Player selection engine — SPEC-GAME-CORE-001 §F M7.
 *
 * Selects the target player for a new round (REQ-SELECT-001..005). The
 * REQ-SELECT-005 pool filter (both a registered squad number AND a Korean
 * name mapping) is applied FIRST, before REQ-SELECT-001's random pick ever
 * runs — the random pick must only ever choose from an already-guaranteed-
 * playable pool, so filtering after picking would risk selecting an
 * ineligible player on an unlucky draw instead of deterministically
 * excluding them up front.
 *
 * Read-only, Supabase-only (REQ-SYNC-001, REQ-SYNC-003): this module never
 * calls the external football data provider directly — anon-key reads only,
 * mirroring `lib/player-search/search.ts` and `lib/player-review/export.ts`.
 * No DB-level FK exists between `players` and `korean_name_mappings`, so the
 * REQ-SELECT-005 join happens in application code — the same
 * query-both-tables-then-Map-by-name convention already established by
 * `lib/player-search/search.ts` and `lib/player-review/export.ts`.
 *
 * Never throws and never returns a partial/undefined player: a query error
 * on either underlying table degrades to `{ status: "empty-pool" }` instead
 * of failing (mirrors the never-throw contract used across this SPEC's
 * other read-only modules).
 *
 * The `random` option follows this SPEC's established injectable-
 * non-determinism convention (`lib/player-data-sync/sync.ts`'s `now?: () =>
 * Date`): defaulting to `Math.random`, so unit tests can inject a
 * deterministic function instead of asserting against real randomness.
 *
 * @MX:ANCHOR: [AUTO] selectTargetPlayer is the sole entry point every
 * round-start flow (M8 guess-submission service, the Next.js round-start API
 * route, replay) depends on to obtain a new round's target player (expected
 * fan_in >= 3 once those call sites land).
 * @MX:REASON: every round's target identity originates from this function's
 * result — changing its pool-filter or duplicate-avoidance behavior ripples
 * into round-start, replay, and the reveal shown on round end.
 */

import { isPosition, type Player } from "@/types/player";

/** The subset of `players` table columns this module reads (0001 migration). */
export interface PlayerSelectorPlayerRow {
  id: number;
  name: string;
  club: string | null;
  position: string;
  nationality: string | null;
  age: number | null;
  squad_number: number | null;
  photo_url: string | null;
}

interface PlayersSelectorQueryResult {
  data: PlayerSelectorPlayerRow[] | null;
  error: { message: string } | null;
}

/** Minimal read-only table-handle surface this module needs for `players`. */
export interface PlayersSelectorTableClient {
  select(columns: string): PromiseLike<PlayersSelectorQueryResult>;
}

/** The subset of `korean_name_mappings` table columns this module reads. */
export interface PlayerSelectorMappingRow {
  original_name: string;
  korean_name: string;
}

interface MappingsSelectorQueryResult {
  data: PlayerSelectorMappingRow[] | null;
  error: { message: string } | null;
}

/** Minimal read-only table-handle surface this module needs for `korean_name_mappings`. */
export interface MappingsSelectorTableClient {
  select(columns: string): PromiseLike<MappingsSelectorQueryResult>;
}

/**
 * Minimal structural surface this module needs from a Supabase client —
 * read-only, both `players` and `korean_name_mappings` (REQ-SELECT-005).
 * Mirrors the two-table narrow-DI pattern established by
 * `lib/player-search/types.ts` and `lib/player-review/types.ts`.
 */
export interface PlayerSelectorSupabaseLike {
  from(table: "players"): PlayersSelectorTableClient;
  from(table: "korean_name_mappings"): MappingsSelectorTableClient;
}

export interface SelectTargetPlayerOptions {
  /** Injected Supabase table handle — a real client or a test fake. */
  supabase: PlayerSelectorSupabaseLike;
  /** The immediately preceding round's target id, if any (REQ-SELECT-002/003). */
  excludePlayerId?: string | null;
  /** Injected RNG returning a value in `[0, 1)`. Defaults to `Math.random`. */
  random?: () => number;
}

export type SelectTargetPlayerResult =
  | { status: "selected"; player: Player }
  | { status: "empty-pool" };

/**
 * Builds a {@link Player} from a raw `players`-table row, or `null` when the
 * row's synced `position` fails the canonical FW/MF/DF/GK guard (defensive
 * — mirrors `lib/player-search/search.ts`'s `toCandidate` pattern; the
 * `players` table's CHECK constraint already enforces this at write time,
 * so this guard exists so a target is never selected from unvalidated data).
 */
function toPlayer(row: PlayerSelectorPlayerRow): Player | null {
  if (!isPosition(row.position)) {
    return null;
  }

  const player: Player = {
    id: String(row.id),
    name: row.name,
    club: row.club,
    position: row.position,
    nationality: row.nationality,
    age: row.age,
    squadNumber: row.squad_number,
  };

  if (row.photo_url) {
    player.photo = row.photo_url;
  }

  return player;
}

/**
 * Selects the target player for a new round (REQ-SELECT-001..005). Never
 * throws and never returns a partial/undefined player — see the module doc
 * comment above.
 */
export async function selectTargetPlayer(
  options: SelectTargetPlayerOptions,
): Promise<SelectTargetPlayerResult> {
  const { supabase, excludePlayerId = null, random = Math.random } = options;

  const { data: playerRows, error: playersError } = await supabase
    .from("players")
    .select("id,name,club,position,nationality,age,squad_number,photo_url");

  if (playersError || !playerRows) {
    return { status: "empty-pool" };
  }

  const { data: mappingRows, error: mappingsError } = await supabase
    .from("korean_name_mappings")
    .select("original_name,korean_name");

  if (mappingsError || !mappingRows) {
    return { status: "empty-pool" };
  }

  // REQ-SELECT-005: restrict the pool to players with BOTH a registered
  // squad number AND a Korean name mapping, applied BEFORE REQ-SELECT-001's
  // random pick below — see the module doc comment for the "why first".
  const namesWithKoreanMapping = new Set(mappingRows.map((row) => row.original_name));
  const eligiblePlayers: Player[] = [];

  for (const row of playerRows) {
    if (row.squad_number === null || row.squad_number === undefined) {
      continue;
    }
    if (!namesWithKoreanMapping.has(row.name)) {
      continue;
    }
    const player = toPlayer(row);
    if (player) {
      eligiblePlayers.push(player);
    }
  }

  // REQ-SELECT-004: an empty eligible pool never starts a round.
  if (eligiblePlayers.length === 0) {
    return { status: "empty-pool" };
  }

  // REQ-SELECT-002/003: exclude the immediately preceding target only when
  // the pool has more than one player — ids are unique, so filtering out at
  // most one row always leaves >= 1 candidate. A pool of exactly one player
  // is always selected regardless of a match (REQ-SELECT-003's explicit
  // allowance).
  const candidates =
    eligiblePlayers.length > 1 && excludePlayerId
      ? eligiblePlayers.filter((player) => player.id !== excludePlayerId)
      : eligiblePlayers;

  const index = Math.min(Math.floor(random() * candidates.length), candidates.length - 1);

  return { status: "selected", player: candidates[index] };
}
