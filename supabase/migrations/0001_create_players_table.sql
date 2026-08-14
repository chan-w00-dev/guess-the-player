-- Migration: 0001_create_players_table.sql
-- SPEC-GAME-CORE-001 §F M4 — Player-Data Sync Job
--
-- Runtime source of truth for the Premier League 2026/27 season player pool
-- and its five compared attributes (spec.md REQ-SYNC-002, REQ-COMPARE-001..
-- 007). Populated exclusively by the M4 sync job (lib/player-data-sync/);
-- read by player selection (M7), player search (M6), and the comparison
-- engine (M2) at request-handling time (REQ-SYNC-003).
--
-- HOW TO RUN THIS MIGRATION (manual — no DB credentials are available to
-- the implementing agent, so this file is NOT executed automatically):
--   1. Open the Supabase Dashboard for your project.
--   2. Go to the SQL Editor.
--   3. Paste the full contents of this file.
--   4. Click "Run".
--   5. Verify: `select * from public.players limit 1;` returns an empty
--      result set with no error (table exists, zero rows before the first
--      sync job run).

create table if not exists public.players (
  -- football-data.org's numeric person id. This is both the primary key
  -- and the sync job's upsert conflict target (`onConflict: "id"` —
  -- lib/player-data-sync/sync.ts). A plain `id` primary key is correct for
  -- this SPEC's single-season scope (spec.md §D "Out of Scope — Multi-
  -- League / Multi-Season Expansion" — only Premier League 2026/27 is
  -- synced). A future multi-season SPEC would need to migrate this to a
  -- composite (id, season) key instead of a plain `id` PK.
  id bigint primary key,

  name text not null,
  club text,

  -- Canonical 4-value position taxonomy (REQ-COMPARE-005). This CHECK is
  -- defense-in-depth: the M4 sync job already guarantees the invariant
  -- before ever calling upsert — an unmapped raw provider position string
  -- is logged and the player is skipped from the pool for that sync run
  -- (plan.md §B fallback), so this constraint should never actually reject
  -- a row from a correctly-behaving sync job.
  position text not null check (position in ('FW', 'MF', 'DF', 'GK')),

  nationality text,
  age integer,
  squad_number integer,

  -- Optional, display-only field (types/player.ts `Player.photo`). NOT one
  -- of the 5 compared/synced attributes (REQ-SYNC-002 / REQ-COMPARE-001)
  -- and does NOT enable the photo-guessing mode (out of scope, spec.md §D).
  photo_url text,

  -- e.g. '2026/27'. This SPEC scopes sync exclusively to the Premier
  -- League 2026/27 season (spec.md §D); the column is still recorded (not
  -- hardcoded elsewhere) so a future multi-season SPEC can extend without
  -- a schema rewrite.
  season text not null,

  -- REQ-SYNC freshness tracking — set to "now" by the sync job on every
  -- upsert (both insert and update paths).
  synced_at timestamptz not null default now()
);

-- Supports a future multi-season filter/history query without a table scan.
create index if not exists players_season_idx on public.players (season);
