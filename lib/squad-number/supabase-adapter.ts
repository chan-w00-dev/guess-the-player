/**
 * Bridges a real `@supabase/supabase-js` client onto this module's minimal
 * {@link SquadNumberSupabaseLike} surface — SPEC-GAME-CORE-001 §F, HISTORY
 * 0.5.0. Mirrors `lib/player-data-sync/supabase-adapter.ts`'s adapter
 * pattern so `update.ts`'s own tests never need to construct or mock a real
 * Supabase client — a lightweight fake is enough.
 *
 * A real `@supabase/supabase-js` query builder already supports the
 * `.update().eq().select()` chain natively — `.eq(...)` returns a
 * `PostgrestFilterBuilder` that structurally satisfies
 * {@link SquadNumberSelectQueryBuilder} (it has a `.select()` method), so
 * this adapter is a thin pass-through with no behavior of its own.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/client";
import type {
  SquadNumberSupabaseLike,
  SquadNumberTableClient,
  SquadNumberUpdateQueryBuilder,
} from "./types";

/** Adapts a real client onto this module's write-only {@link SquadNumberSupabaseLike} surface. */
export function toSquadNumberSupabaseLike(client: SupabaseClient): SquadNumberSupabaseLike {
  return {
    from(table: "players"): SquadNumberTableClient {
      return {
        update(values: { squad_number: number }): SquadNumberUpdateQueryBuilder {
          return {
            eq(column: "id", value: number) {
              return client.from(table).update(values).eq(column, value);
            },
          };
        },
      };
    },
  };
}

/**
 * Squad-number-update-specific Supabase client factory — the single place
 * that decides this manual entry mechanism uses the `service_role` key, not
 * `anon`.
 *
 * Row Level Security on the `players` table
 * (`supabase/migrations/0001_create_players_table.sql`) grants `anon` a
 * public SELECT-only policy — there is no write policy, so an `anon`-key
 * update is rejected once RLS is enabled. `service_role` bypasses RLS
 * entirely and is reserved exclusively for this manual entry mechanism and
 * the M4 sync job; it MUST NEVER be used by client-facing or live gameplay
 * code.
 */
export function createSquadNumberSupabaseClient(): SquadNumberSupabaseLike {
  return toSquadNumberSupabaseLike(getSupabaseServiceRoleClient());
}
