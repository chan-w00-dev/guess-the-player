/**
 * Bridges a real `@supabase/supabase-js` client onto the sync job's minimal
 * {@link SupabaseLike} surface — SPEC-GAME-CORE-001 §F M4.
 *
 * Kept as a separate, explicit adapter (rather than typing `sync.ts`'s
 * `supabase` parameter directly against `SupabaseClient`) so `sync.ts`'s
 * own tests never need to construct or mock a real Supabase client — a
 * lightweight `SupabaseLike` fake is enough (`tests/unit/player-data-sync/sync.test.ts`).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/client";
import type { PlayerRow, SupabaseLike } from "./types";

export function toSupabaseLike(client: SupabaseClient): SupabaseLike {
  return {
    from(table: "players") {
      return {
        upsert(values: PlayerRow, options: { onConflict: string }) {
          return client.from(table).upsert(values, options);
        },
      };
    },
  };
}

/**
 * Sync-job-specific Supabase client factory — the single place that decides
 * the M4 sync job uses the `service_role` key, not `anon`.
 *
 * Row Level Security on the `players` table (`supabase/migrations/0001_create_players_table.sql`)
 * grants `anon` a public SELECT-only policy — there is no write policy, so
 * an `anon`-key upsert is rejected once RLS is enabled. `service_role`
 * bypasses RLS entirely and is reserved exclusively for this sync job; it
 * MUST NEVER be used by client-facing or live gameplay code.
 */
export function createSyncSupabaseClient(): SupabaseLike {
  return toSupabaseLike(getSupabaseServiceRoleClient());
}
