/**
 * Supabase client factory — SPEC-GAME-CORE-001 §F M4.
 *
 * A small, general-purpose Supabase client factory reading
 * `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_ANON_KEY` from `process.env`
 * (`.env.local` — see `.env.local.example`).
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
