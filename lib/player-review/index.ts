/**
 * Barrel export for the `lib/player-review/` module —
 * SPEC-GAME-CORE-001 §F M12.
 */

export { buildPlayerReviewRows, runPlayerReviewExport, toReviewCsvText } from "./export";
export type { RunPlayerReviewExportOptions } from "./export";
export { buildReviewWriteBatches, parsePlayerReviewCsv } from "./import";
export type { PlayerReviewWriteBatches } from "./import";
export {
  createPlayerReviewExportSupabaseClient,
  toPlayerReviewExportSupabaseLike,
} from "./supabase-adapter";
export { PLAYER_REVIEW_COLUMNS } from "./types";
export type {
  MappingsReviewTableClient,
  PlayerReviewColumn,
  PlayerReviewExportSupabaseLike,
  PlayerReviewMappingRow,
  PlayerReviewPlayerRow,
  PlayerReviewRow,
  PlayersReviewTableClient,
} from "./types";
