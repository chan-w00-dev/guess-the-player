#!/usr/bin/env node
/**
 * Manual-trigger entry point for the M5 Korean-name-mapping one-time seed
 * bootstrap — SPEC-GAME-CORE-001 §F M5 (REQ-KOREAN-004).
 *
 * Run via `npm run seed:korean-names` once:
 *   1. `supabase/migrations/0003_create_korean_name_mappings_table.sql` has
 *      been applied to your Supabase project (Dashboard → SQL Editor →
 *      paste → Run).
 *   2. `.env.local` is populated with `NEXT_PUBLIC_SUPABASE_URL` and
 *      `SUPABASE_SERVICE_ROLE_KEY`.
 *
 * This script is the ONLY module in this SPEC's Korean-name-mapping scope
 * that reads the bundled seed dataset file (REQ-KOREAN-005) —
 * `lib/korean-name-mapping/` never imports it; that module only ever reads
 * from Supabase at request-handling time (see `mapper.ts`).
 *
 * Writes via the `service_role` key, NOT `anon` — Row Level Security on the
 * `korean_name_mappings` table grants `anon` a public SELECT-only policy (no
 * write policy), mirroring the `players` table pattern
 * (`scripts/sync-players.ts`).
 *
 * Safe to re-run: `runKoreanNameSeed` upserts on the `original_name`
 * conflict target, so running this script again after editing the seed
 * dataset simply refreshes existing rows rather than duplicating them.
 */

import koreanNameSeedData from "../data/korean-name-seed.json";
import { createSeedSupabaseClient, runKoreanNameSeed } from "../lib/korean-name-mapping";
import type { KoreanMapping } from "../types/comparison";

async function main(): Promise<void> {
  const mappings = koreanNameSeedData as KoreanMapping[];
  const supabase = createSeedSupabaseClient();

  const summary = await runKoreanNameSeed({ mappings, supabase });

  console.log(
    `[seed-korean-names] synced=${summary.synced} skipped=${summary.skipped} (total=${mappings.length})`,
  );

  if (summary.errors.length > 0) {
    console.warn(`[seed-korean-names] ${summary.errors.length} error(s) during this run:`);
    for (const error of summary.errors) {
      console.warn(`  - ${error}`);
    }
  }

  if (summary.synced === 0 && summary.errors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[seed-korean-names] fatal error: ${message}`);
  process.exitCode = 1;
});
