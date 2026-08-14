/**
 * Supabase client factory — SPEC-GAME-CORE-001 §F M4.
 *
 * Two client factories, both reading `NEXT_PUBLIC_SUPABASE_URL` from
 * `process.env` (`.env.local` — see `.env.local.example`) but pairing it
 * with a different key depending on the caller's trust level:
 *
 * - {@link createSupabaseClient} / {@link getSupabaseClient} — the `anon`
 *   key. Subject to Row Level Security (RLS); the `players` table grants
 *   `anon` a public SELECT-only policy (no write policy) — see
 *   `supabase/migrations/0001_create_players_table.sql`. Intended for
 *   future live-gameplay read consumers (M6/M7/M2), which run in a request
 *   handler and must stay RLS-scoped.
 * - {@link createSupabaseServiceRoleClient} / {@link getSupabaseServiceRoleClient} —
 *   the `service_role` key. Bypasses RLS entirely. Reserved EXCLUSIVELY for
 *   the M4 sync job's writes (`lib/player-data-sync/`) — the sync job's
 *   `upsert` calls would otherwise be rejected by RLS since `anon` has no
 *   write policy. This key MUST NEVER be used by client-shipped code or a
 *   live gameplay request handler; treat it with at least the same
 *   protection level as the football-data.org API key (REQ-NFR-001).
 *
 * M4 context: this module's only consumer today is the player-data sync
 * job (`lib/player-data-sync/`), used server-side only (the sync job never
 * runs in a client component or a live gameplay request handler).
 *
 * M5 (Korean name mapping) will read from this same module for its own
 * Supabase table access — do NOT add Korean-mapping-specific query logic
 * here; this module stays a thin, general-purpose client factory that any
 * later milestone can reuse.
 *
 * @MX:NOTE: [AUTO] the `NEXT_PUBLIC_` prefix on the URL var name is an
 * existing project convention (see `.env.local.example`, authored at M1) —
 * this module itself is server-side-only in every current consumer (the M4
 * sync job); it is not itself a client-component boundary decision.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

/**
 * Creates a fresh Supabase client from `NEXT_PUBLIC_SUPABASE_URL` and
 * `SUPABASE_ANON_KEY`. Throws a descriptive (secret-free) error when either
 * variable is missing or empty — never includes the actual key value in the
 * thrown message.
 */
export function createSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error(
      "createSupabaseClient: NEXT_PUBLIC_SUPABASE_URL is not set. See .env.local.example.",
    );
  }

  if (!anonKey) {
    throw new Error(
      "createSupabaseClient: SUPABASE_ANON_KEY is not set. See .env.local.example.",
    );
  }

  return createClient(url, anonKey);
}

/**
 * Lazily-created, process-wide singleton client. Prefer this in server-side
 * entry points (e.g. the sync job's manual-trigger script) so a single
 * process reuses one client rather than opening a new one per call.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createSupabaseClient();
  }
  return cachedClient;
}

let cachedServiceRoleClient: SupabaseClient | null = null;

/**
 * Creates a fresh Supabase client from `NEXT_PUBLIC_SUPABASE_URL` and
 * `SUPABASE_SERVICE_ROLE_KEY`. This client BYPASSES Row Level Security —
 * reserved exclusively for the M4 sync job's writes (see the module doc
 * comment above). Throws a descriptive (secret-free) error when either
 * variable is missing or empty — never includes the actual key value in the
 * thrown message.
 */
export function createSupabaseServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "createSupabaseServiceRoleClient: NEXT_PUBLIC_SUPABASE_URL is not set. See .env.local.example.",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "createSupabaseServiceRoleClient: SUPABASE_SERVICE_ROLE_KEY is not set. See .env.local.example.",
    );
  }

  return createClient(url, serviceRoleKey);
}

/**
 * Lazily-created, process-wide singleton service_role client — cached
 * independently from {@link getSupabaseClient}'s anon-key singleton (two
 * distinct cache slots, since the two clients carry different privileges).
 * Prefer this in the sync job's manual-trigger script so a single process
 * reuses one service_role client rather than opening a new one per call.
 */
export function getSupabaseServiceRoleClient(): SupabaseClient {
  if (!cachedServiceRoleClient) {
    cachedServiceRoleClient = createSupabaseServiceRoleClient();
  }
  return cachedServiceRoleClient;
}
