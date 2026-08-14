/**
 * Player search module types — SPEC-GAME-CORE-001 §F M6.
 *
 * Two minimal structural Supabase surfaces this module needs, mirroring the
 * narrow-DI pattern established by `lib/korean-name-mapping/types.ts` and
 * `lib/player-data-sync/types.ts`: a read-only `ilike`/`in`-capable surface
 * over the `players` table (original-language partial match, REQ-SEARCH-003,
 * plus the `.in()` lookup that resolves a Korean-matched candidate back to
 * its player row) and a read-only `ilike`-capable surface over the
 * `korean_name_mappings` table (Korean-language partial match,
 * REQ-SEARCH-002). Kept deliberately narrow so tests inject a lightweight
 * in-memory fake instead of a real `@supabase/supabase-js` client — see
 * `lib/player-search/supabase-adapter.ts` for the bridge to a real client.
 */

import type { Position } from "@/types/player";

/** The subset of `players` table columns this module reads (0001 migration). */
export interface PlayerSearchRow {
  id: number;
  name: string;
  club: string | null;
  position: string;
}

interface PlayersSearchQueryResult {
  data: PlayerSearchRow[] | null;
  error: { message: string } | null;
}

/** Minimal query-builder surface `search.ts` needs from the `players` table. */
export interface PlayersSearchQueryBuilder {
  /** Case-insensitive partial match on `name` (REQ-SEARCH-003). */
  ilike(column: "name", pattern: string): PromiseLike<PlayersSearchQueryResult>;
  /**
   * Exact-name membership lookup — resolves the players whose `name`
   * matches an `original_name` found via the Korean-mapping match path.
   */
  in(column: "name", values: string[]): PromiseLike<PlayersSearchQueryResult>;
}

/** Minimal read-only table-handle surface `search.ts` needs for `players`. */
export interface PlayersSearchTableClient {
  select(columns: string): PlayersSearchQueryBuilder;
}

/** The subset of `korean_name_mappings` table columns this module reads. */
export interface KoreanMappingSearchRow {
  original_name: string;
  korean_name: string;
}

interface KoreanMappingsSearchQueryResult {
  data: KoreanMappingSearchRow[] | null;
  error: { message: string } | null;
}

/** Minimal query-builder surface `search.ts` needs from `korean_name_mappings`. */
export interface KoreanMappingsSearchQueryBuilder {
  /** Case-insensitive partial match on `korean_name` (REQ-SEARCH-002). */
  ilike(column: "korean_name", pattern: string): PromiseLike<KoreanMappingsSearchQueryResult>;
}

/** Minimal read-only table-handle surface `search.ts` needs for `korean_name_mappings`. */
export interface KoreanMappingsSearchTableClient {
  select(columns: string): KoreanMappingsSearchQueryBuilder;
}

/** Minimal structural surface `search.ts` needs from a Supabase client. */
export interface PlayerSearchSupabaseLike {
  from(table: "players"): PlayersSearchTableClient;
  from(table: "korean_name_mappings"): KoreanMappingsSearchTableClient;
}

/**
 * A player search/autocomplete candidate (spec.md §B.5, REQ-SEARCH-001..006).
 * Deliberately small — only the fields a search/autocomplete UI (M10) and
 * the later guess-submission flow (M8) need, not the full `Player` shape
 * from `types/player.ts`.
 */
export interface PlayerSearchCandidate {
  id: string;
  originalName: string;
  koreanName: string;
  club: string | null;
  position: Position;
}
