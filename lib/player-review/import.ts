/**
 * Combined CSV player-data review import — parse + batch-build side —
 * SPEC-GAME-CORE-001 §F M12 (REQ-REVIEW-002, REQ-REVIEW-003).
 *
 * This module deliberately stops at building the two write batches — it
 * never calls Supabase itself. The actual writes are performed by
 * `scripts/import-players-review.ts` via the existing, already-tested
 * `runKoreanNameSeed` (`lib/korean-name-mapping/`) and `runSquadNumberUpdate`
 * (`lib/squad-number/`) — reusing those functions verbatim (rather than
 * hand-writing a raw `.upsert()`/`.update()` call here) preserves
 * REQ-SYNC-005's sync-non-overwrite guarantee and each function's own
 * already-tested behavior without duplicating it (plan.md §G anti-pattern).
 *
 * The blank-cell-skip rule (REQ-REVIEW-003) is enforced here, once, by
 * construction: a row whose koreanName/squadNumber cell is blank is simply
 * never added to the corresponding batch array, so neither reused write
 * function ever sees — and therefore can never overwrite a stored value
 * with — a blank cell. No separate "is this blank?" branch is needed inside
 * either write path.
 */

import type { SquadNumberEntry } from "@/lib/squad-number";
import type { KoreanMapping } from "@/types/comparison";
import { parseCsv } from "@/lib/csv";
import { PLAYER_REVIEW_COLUMNS, type PlayerReviewRow } from "./types";

/**
 * Parses review CSV text (produced by `runPlayerReviewExport` /
 * `toReviewCsvText`, then hand-edited) into {@link PlayerReviewRow} objects.
 * Validates the header matches the expected {@link PLAYER_REVIEW_COLUMNS}
 * order — a mismatched header almost always means the wrong file was passed
 * in, and silently zipping columns positionally against an unexpected
 * header would misroute a cell's value to the wrong field.
 */
export function parsePlayerReviewCsv(csvText: string): PlayerReviewRow[] {
  const matrix = parseCsv(csvText);
  if (matrix.length === 0) {
    return [];
  }

  const [header, ...dataRows] = matrix;
  const expected: readonly string[] = PLAYER_REVIEW_COLUMNS;
  const headerMatches =
    header.length === expected.length && expected.every((column, i) => header[i] === column);

  if (!headerMatches) {
    throw new Error(
      `parsePlayerReviewCsv: unexpected CSV header — expected "${expected.join(",")}", got "${header.join(",")}"`,
    );
  }

  return dataRows
    .filter((row) => !(row.length === 1 && row[0] === "")) // skip blank lines
    .map((row) => {
      const record = {} as PlayerReviewRow;
      PLAYER_REVIEW_COLUMNS.forEach((column, i) => {
        record[column] = row[i] ?? "";
      });
      return record;
    });
}

export interface PlayerReviewWriteBatches {
  koreanMappings: KoreanMapping[];
  squadNumberEntries: SquadNumberEntry[];
}

function isBlank(cellValue: string): boolean {
  return cellValue.trim() === "";
}

/**
 * Builds the two write batches from parsed review rows (REQ-REVIEW-002):
 * `koreanMappings` (name-keyed, for `runKoreanNameSeed`) from every row
 * with a non-blank `koreanName` cell, and `squadNumberEntries` (id-keyed,
 * for `runSquadNumberUpdate`) from every row with a non-blank, numeric
 * `squadNumber` cell. A row with a blank cell for a given column is simply
 * never added to that column's batch array — see this module's doc comment
 * for why that construction is what satisfies REQ-REVIEW-003.
 */
export function buildReviewWriteBatches(rows: PlayerReviewRow[]): PlayerReviewWriteBatches {
  const koreanMappings: KoreanMapping[] = [];
  const squadNumberEntries: SquadNumberEntry[] = [];

  for (const row of rows) {
    if (!isBlank(row.koreanName)) {
      koreanMappings.push({ originalName: row.name, koreanName: row.koreanName.trim() });
    }

    if (!isBlank(row.squadNumber)) {
      const squadNumber = Number(row.squadNumber.trim());
      const id = Number(row.id.trim());
      if (!Number.isNaN(squadNumber) && !Number.isNaN(id)) {
        squadNumberEntries.push({ id, squadNumber });
      }
    }
  }

  return { koreanMappings, squadNumberEntries };
}
