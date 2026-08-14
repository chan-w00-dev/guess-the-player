#!/usr/bin/env node
/**
 * Manual-trigger entry point for the M4 player-data sync job —
 * SPEC-GAME-CORE-001 §F M4.
 *
 * Run via `npm run sync:players` once:
 *   1. `supabase/migrations/0001_create_players_table.sql` has been applied
 *      to your Supabase project (Dashboard → SQL Editor → paste → Run).
 *   2. `.env.local` is populated with `NEXT_PUBLIC_SUPABASE_URL`,
 *      `SUPABASE_SERVICE_ROLE_KEY`, and `FOOTBALL_DATA_API_KEY`.
 *
 * This script writes via the `service_role` key, NOT `anon` — Row Level
 * Security on the `players` table grants `anon` a public SELECT-only
 * policy (no write policy), so an `anon`-key upsert would be rejected by
 * RLS. `service_role` bypasses RLS entirely and is reserved exclusively
 * for this sync job (see `lib/supabase/client.ts` doc comment and
 * `supabase/migrations/0001_create_players_table.sql`). Client construction
 * (via {@link createSyncSupabaseClient}) happens before any network call to
 * football-data.org, so a missing `SUPABASE_SERVICE_ROLE_KEY` fails fast
 * with a clear, secret-free error before a real run is attempted.
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
import { createSyncSupabaseClient, runPlayerDataSync } from "../lib/player-data-sync";

async function main(): Promise<void> {
  const provider = new FootballDataOrgProvider();
  const supabase = createSyncSupabaseClient();

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
