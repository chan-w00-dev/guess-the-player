/**
 * One-time Korean-name-mapping seed bootstrap core logic —
 * SPEC-GAME-CORE-001 §F M5 (REQ-KOREAN-004).
 *
 * Takes an already-parsed `KoreanMapping[]` — the caller
 * (`scripts/seed-korean-names.ts`) is the sole reader of the bundled seed
 * dataset file; REQ-KOREAN-005 requires this module to never read the seed
 * file itself — and upserts each mapping into the
 * Supabase `korean_name_mappings` table via the injected
 * {@link SeedSupabaseLike} (service_role — RLS grants `anon` no write
 * policy on this table, mirroring `lib/player-data-sync/sync.ts`).
 *
 * Resilient by design: a single mapping's upsert failure is recorded in
 * `errors` and does not stop the remaining mappings from being attempted —
 * matching the M4 sync job's partial-failure-resilience pattern.
 */

import type { KoreanMapping } from "@/types/comparison";
import type { KoreanMappingRow, SeedSupabaseLike } from "./types";

export interface RunKoreanNameSeedOptions {
  mappings: KoreanMapping[];
  supabase: SeedSupabaseLike;
}

export interface KoreanNameSeedSummary {
  synced: number;
  skipped: number;
  errors: string[];
}

function toRow(mapping: KoreanMapping): KoreanMappingRow {
  return {
    original_name: mapping.originalName,
    korean_name: mapping.koreanName,
  };
}

/**
 * Upserts every mapping in `mappings` into the `korean_name_mappings` table,
 * conflicting on `original_name` (so re-running the seed after editing the
 * dataset refreshes existing rows rather than duplicating them). Never
 * throws — every per-mapping failure (a returned error or a thrown
 * exception) is recorded in the returned summary's `errors` list and the
 * loop continues to the next mapping.
 */
export async function runKoreanNameSeed({
  mappings,
  supabase,
}: RunKoreanNameSeedOptions): Promise<KoreanNameSeedSummary> {
  const summary: KoreanNameSeedSummary = { synced: 0, skipped: 0, errors: [] };

  for (const mapping of mappings) {
    const row = toRow(mapping);
    try {
      const { error } = await supabase
        .from("korean_name_mappings")
        .upsert(row, { onConflict: "original_name" });

      if (error) {
        summary.skipped += 1;
        summary.errors.push(`originalName=${mapping.originalName}: ${error.message}`);
        continue;
      }

      summary.synced += 1;
    } catch (thrown: unknown) {
      summary.skipped += 1;
      const message = thrown instanceof Error ? thrown.message : String(thrown);
      summary.errors.push(`originalName=${mapping.originalName}: ${message}`);
    }
  }

  return summary;
}
