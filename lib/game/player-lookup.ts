/**
 * Player lookup by id — SPEC-GAME-CORE-001 §F M9.
 *
 * The guess-submission API route needs to resolve a search-selected
 * candidate's player id (REQ-SEARCH-004) into a full {@link Player} shape
 * before invoking M8's `submitGuess`. Mirrors the `toPlayer`/never-throw
 * conventions already established by `lib/game/player-selector.ts`: a query
 * error or a not-found id both degrade to `null` rather than throwing.
 *
 * Read-only, Supabase-only (REQ-SYNC-001, REQ-SYNC-003): this module never
 * calls the external football data provider directly.
 */

import { isPosition, type Player } from "@/types/player";

/** The subset of `players` table columns this module reads (0001 migration). */
export interface PlayerLookupPlayerRow {
  id: number;
  name: string;
  club: string | null;
  position: string;
  nationality: string | null;
  age: number | null;
  squad_number: number | null;
  photo_url: string | null;
}

interface PlayerLookupQueryResult {
  data: PlayerLookupPlayerRow | null;
  error: { message: string } | null;
}

/** Minimal query-builder surface this module needs from the `players` table. */
export interface PlayerLookupQueryBuilder {
  eq(column: "id", value: string): PlayerLookupQueryBuilder;
  maybeSingle(): PromiseLike<PlayerLookupQueryResult>;
}

/** Minimal read-only table-handle surface this module needs for `players`. */
export interface PlayerLookupTableClient {
  select(columns: string): PlayerLookupQueryBuilder;
}

/** Minimal structural surface this module needs from a Supabase client. */
export interface PlayerLookupSupabaseLike {
  from(table: "players"): PlayerLookupTableClient;
}

export interface GetPlayerByIdOptions {
  /** Injected Supabase table handle — a real client or a test fake. */
  supabase: PlayerLookupSupabaseLike;
  /** The player id to look up (as sent by the client — see the guess route). */
  id: string;
}

/**
 * Builds a {@link Player} from a raw `players`-table row, or `null` when the
 * row's synced `position` fails the canonical FW/MF/DF/GK guard (defensive
 * — mirrors `lib/game/player-selector.ts`'s `toPlayer` pattern).
 */
function toPlayer(row: PlayerLookupPlayerRow): Player | null {
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
 * Looks up a single player by id. Returns `null` — never throws — on a
 * not-found id, an invalid/non-matching id, a Supabase query error, or a
 * row whose synced `position` fails the canonical enum guard.
 */
export async function getPlayerById(options: GetPlayerByIdOptions): Promise<Player | null> {
  const { supabase, id } = options;

  const { data, error } = await supabase
    .from("players")
    .select("id,name,club,position,nationality,age,squad_number,photo_url")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toPlayer(data);
}
