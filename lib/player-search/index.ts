/**
 * Barrel export for the `lib/player-search/` module —
 * SPEC-GAME-CORE-001 §F M6.
 */

export { searchPlayers } from "./search";
export type { SearchPlayersOptions } from "./search";
export { createSearchSupabaseClient, toPlayerSearchSupabaseLike } from "./supabase-adapter";
export type {
  KoreanMappingSearchRow,
  KoreanMappingsSearchQueryBuilder,
  KoreanMappingsSearchTableClient,
  PlayerSearchCandidate,
  PlayerSearchRow,
  PlayerSearchSupabaseLike,
  PlayersSearchQueryBuilder,
  PlayersSearchTableClient,
} from "./types";
