-- Migration: 0003_create_korean_name_mappings_table.sql
-- SPEC-GAME-CORE-001 §F M5 — Korean Name Mapping Module
--
-- Runtime source of truth for resolving a player's original-language name
-- to its Korean media-convention display name (spec.md REQ-KOREAN-001, 002,
-- 005). Populated once by the one-time seed bootstrap script
-- (scripts/seed-korean-names.ts, REQ-KOREAN-004); read at request-handling
-- time by lib/korean-name-mapping/mapper.ts via the anon-key client
-- (REQ-KOREAN-001). After the initial seed, Supabase is the sole runtime
-- source of truth (REQ-KOREAN-005) — the bundled seed dataset file is never
-- read again.
--
-- HOW TO RUN THIS MIGRATION (manual — no DB credentials are available to
-- the implementing agent, so this file is NOT executed automatically):
--   1. Open the Supabase Dashboard for your project.
--   2. Go to the SQL Editor.
--   3. Paste the full contents of this file.
--   4. Click "Run".
--   5. Verify: `select * from public.korean_name_mappings limit 1;` returns
--      an empty result set with no error (table exists, zero rows before
--      the seed script's first run).
--   6. After running this migration, populate the table once via
--      `npm run seed:korean-names` (see scripts/seed-korean-names.ts).

create table if not exists public.korean_name_mappings (
  -- Original-language / romanized display name (types/player.ts Player.name,
  -- as synced by the M4 sync job). Primary key doubles as the mapper's
  -- lookup key and the seed script's upsert conflict target
  -- (`onConflict: "original_name"`).
  original_name text primary key,

  -- Korean media-convention display name (e.g. "손흥민").
  korean_name text not null
);

-- Row Level Security (RLS): this table is public read-only data (a name
-- lookup table, not sensitive). Live gameplay (search, comparison rows,
-- round reveal) reads via the public `anon` key; only the one-time seed
-- script writes, using the `service_role` key, which bypasses RLS entirely
-- by design — mirrors the `players` table pattern
-- (supabase/migrations/0001_create_players_table.sql). Therefore:
--   - RLS is enabled (a table with RLS enabled and NO policies denies all
--     access by default until a policy explicitly grants it).
--   - Exactly one policy is added: public SELECT for everyone (anon +
--     authenticated). No INSERT/UPDATE/DELETE policy is added for anon —
--     writes are only possible via service_role, which ignores RLS.
alter table public.korean_name_mappings enable row level security;

create policy "Allow public read access to korean_name_mappings"
  on public.korean_name_mappings
  for select
  using (true);
