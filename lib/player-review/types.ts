/**
 * Combined CSV player-data review module types — SPEC-GAME-CORE-001 §F M12
 * (REQ-REVIEW-001..003).
 *
 * This module is additive to, not a replacement for, the M5 Korean-name-
 * mapping seed bootstrap (`lib/korean-name-mapping/`) and the 0.5.0 id-keyed
 * squad-number manual entry mechanism (`lib/squad-number/`) — both remain
 * valid, already-implemented mechanisms for their original use cases (see
 * `spec.md` HISTORY 0.6.0). `lib/player-review/` only builds and parses the
 * CSV shape and the read-side of the export join; the actual writes are
 * delegated to those two existing modules' already-tested functions
 * (`runKoreanNameSeed`, `runSquadNumberUpdate` — see `lib/player-review/import.ts`
 * and `scripts/import-players-review.ts`), never re-implemented here
 * (plan.md §G anti-pattern).
 */

/**
 * The fixed column order for the review CSV (REQ-REVIEW-001). Declared once
 * so the export header, the import header-validation check, and the row
 * object shape can never drift out of sync with each other.
 */
export const PLAYER_REVIEW_COLUMNS = [
  "id",
  "name",
  "nationality",
  "club",
  "age",
  "koreanName",
  "squadNumber",
] as const;

export type PlayerReviewColumn = (typeof PLAYER_REVIEW_COLUMNS)[number];

/**
 * One review CSV row, cell values as they appear in the file — every field
 * is a string (including `id`), and a missing/unknown value is an empty
 * string, never the literal `"null"` (REQ-REVIEW-001).
 */
export type PlayerReviewRow = Record<PlayerReviewColumn, string>;

/** The subset of `players` table columns the review export reads (0001/0004 migrations). */
export interface PlayerReviewPlayerRow {
  id: number;
  name: string;
  nationality: string | null;
  club: string | null;
  age: number | null;
  squad_number: number | null;
}

/** The subset of `korean_name_mappings` table columns the review export reads. */
export interface PlayerReviewMappingRow {
  original_name: string;
  korean_name: string;
}

interface PlayersReviewQueryResult {
  data: PlayerReviewPlayerRow[] | null;
  error: { message: string } | null;
}

/** Minimal read-only table-handle surface the export needs for `players`. */
export interface PlayersReviewTableClient {
  select(columns: string): PromiseLike<PlayersReviewQueryResult>;
}

interface MappingsReviewQueryResult {
  data: PlayerReviewMappingRow[] | null;
  error: { message: string } | null;
}

/** Minimal read-only table-handle surface the export needs for `korean_name_mappings`. */
export interface MappingsReviewTableClient {
  select(columns: string): PromiseLike<MappingsReviewQueryResult>;
}

/**
 * Minimal structural surface `lib/player-review/export.ts` needs from a
 * Supabase client — read-only, both `players` and `korean_name_mappings`
 * (REQ-REVIEW-001). Mirrors the two-table narrow-DI pattern established by
 * `lib/player-search/types.ts`'s `PlayerSearchSupabaseLike`.
 */
export interface PlayerReviewExportSupabaseLike {
  from(table: "players"): PlayersReviewTableClient;
  from(table: "korean_name_mappings"): MappingsReviewTableClient;
}
