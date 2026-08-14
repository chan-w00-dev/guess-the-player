#!/usr/bin/env node
/**
 * Manual-trigger entry point for the M4 player-data sync job —
 * SPEC-GAME-CORE-001 §F M4.
 *
 * Run via `npm run sync:players` once:
 *   1. `supabase/migrations/0001_create_players_table.sql` has been applied
 *      to your Supabase project (Dashboard → SQL Editor → paste → Run).
 *   2. `.env.local` is populated with `NEXT_PUBLIC_SUPABASE_URL`,
 *      `SUPABASE_ANON_KEY`, and `FOOTBALL_DATA_API_KEY`.
 *
 * This script is a plain manual entry point — no cron/scheduler is wired
 * up here. Cadence (daily/weekly) is explicitly a run-phase implementation
 * detail out of this milestone's scope (plan.md §F M4); a future SPEC may
 * wire this into a scheduled job (e.g. a Vercel Cron route, a GitHub
 * Actions workflow) without changing `runPlayerDataSync` itself. This
 * script is NOT imported by any `app/` route or component, so it is never
 * bundled into the Next.js app (REQ-SYNC-001 — sync stays out of the live
 * request path).
 */

import { FootballDataOrgProvider } from "../lib/football-api";
import { runPlayerDataSync, toSupabaseLike } from "../lib/player-data-sync";
import { getSupabaseClient } from "../lib/supabase/client";

async function main(): Promise<void> {
  const provider = new FootballDataOrgProvider();
  const supabase = toSupabaseLike(getSupabaseClient());

  const summary = await runPlayerDataSync({ provider, supabase });

  console.log(
    `[sync-players] synced=${summary.synced} skipped=${summary.skipped} (season=2026/27)`,
  );

  if (summary.errors.length > 0) {
    console.warn(`[sync-players] ${summary.errors.length} error(s) during this run:`);
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
  console.error(`[sync-players] fatal error: ${message}`);
  process.exitCode = 1;
});
