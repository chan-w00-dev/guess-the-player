/**
 * Combined CSV player-data review export — SPEC-GAME-CORE-001 §F M12
 * (REQ-REVIEW-001).
 *
 * Reads the `players` table and the `korean_name_mappings` table via the
 * injected {@link PlayerReviewExportSupabaseLike} (anon-key client — see
 * `lib/player-review/supabase-adapter.ts`; this module is read-only and
 * never imports the service_role factories from `lib/korean-name-mapping/`
 * or `lib/squad-number/`) and joins them in application code by
 * `players.name === korean_name_mappings.original_name` — the same
 * name-matching pattern `lib/player-search/search.ts` already uses, since no
 * DB-level FK exists between these two tables.
 */

import { writeCsv } from "@/lib/csv";
import {
  PLAYER_REVIEW_COLUMNS,
  type PlayerReviewExportSupabaseLike,
  type PlayerReviewMappingRow,
  type PlayerReviewPlayerRow,
  type PlayerReviewRow,
} from "./types";

/** Renders a possibly-null/undefined synced value as its CSV cell — never the literal `"null"`. */
function cell(value: string | number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

/**
 * Joins `players` rows with `korean_name_mappings` rows (by name) into the
 * review CSV row shape. Pure — no Supabase access — so REQ-REVIEW-001's
 * pre-fill/blank behavior is directly unit-testable against plain arrays.
 */
export function buildPlayerReviewRows(
  players: PlayerReviewPlayerRow[],
  mappings: PlayerReviewMappingRow[],
): PlayerReviewRow[] {
  const koreanNameByOriginal = new Map(mappings.map((m) => [m.original_name, m.korean_name]));

  return players.map((player) => ({
    id: String(player.id),
    name: player.name,
    nationality: cell(player.nationality),
    club: cell(player.club),
    age: cell(player.age),
    koreanName: koreanNameByOriginal.get(player.name) ?? "",
    squadNumber: cell(player.squad_number),
  }));
}

/** Converts review rows into CSV text, header row first (REQ-REVIEW-001 column order). */
export function toReviewCsvText(rows: PlayerReviewRow[]): string {
  const matrix: string[][] = [
    [...PLAYER_REVIEW_COLUMNS],
    ...rows.map((row) => PLAYER_REVIEW_COLUMNS.map((column) => row[column])),
  ];
  return writeCsv(matrix);
}

export interface RunPlayerReviewExportOptions {
  supabase: PlayerReviewExportSupabaseLike;
}

/**
 * Reads the current player pool + Korean name mappings and returns the
 * joined review rows (REQ-REVIEW-001). Throws a descriptive error when
 * either underlying query fails — unlike the live-gameplay read paths
 * (`lib/player-search/search.ts`), this is an operator-run CLI export with
 * no partial-result fallback story, so a query failure should surface
 * loudly rather than silently degrade to an incomplete export file.
 */
export async function runPlayerReviewExport({
  supabase,
}: RunPlayerReviewExportOptions): Promise<PlayerReviewRow[]> {
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id,name,nationality,club,age,squad_number");

  if (playersError) {
    throw new Error(`runPlayerReviewExport: failed to read players: ${playersError.message}`);
  }

  const { data: mappings, error: mappingsError } = await supabase
    .from("korean_name_mappings")
    .select("original_name,korean_name");

  if (mappingsError) {
    throw new Error(
      `runPlayerReviewExport: failed to read korean_name_mappings: ${mappingsError.message}`,
    );
  }

  return buildPlayerReviewRows(players ?? [], mappings ?? []);
}
