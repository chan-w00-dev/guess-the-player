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
