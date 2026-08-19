/**
 * Bridges a real `@supabase/supabase-js` client onto this package's two
 * minimal structural surfaces — SPEC-GAME-CORE-001 §F M9. Mirrors
 * `lib/player-search/supabase-adapter.ts` and
 * `lib/korean-name-mapping/supabase-adapter.ts`'s adapter pattern.
 *
 * **Why this file exists (Constraint Deviation, D3):** passing a real
 * `SupabaseClient` directly as `PlayerSelectorSupabaseLike` /
 * `PlayerLookupSupabaseLike` (as the milestone brief's route sketch
 * suggested) fails `npx tsc --noEmit` with "Type instantiation is
 * excessively deep and possibly infinite" — the real client's deeply
 * generic PostgREST builder types do not structurally collapse cleanly
 * against these narrow hand-written interfaces. This is the same problem
 * every other `lib/*` module in this SPEC already solved with a dedicated
 * `supabase-adapter.ts` (`player-search`, `korean-name-mapping`,
 * `player-data-sync`, `squad-number`, `player-review`); `lib/game/` simply
 * had not needed one until this milestone wired its modules behind a real
 * Supabase client for the first time. `player-selector.ts` and
 * `player-lookup.ts`'s own unit tests are unaffected — they inject a
 * lightweight fake and never construct a real client.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  MappingsSelectorTableClient,
  PlayerSelectorSupabaseLike,
  PlayersSelectorTableClient,
} from "./player-selector";
import type { PlayerLookupQueryBuilder, PlayerLookupSupabaseLike } from "./player-lookup";

/** Adapts a real client onto the read-only {@link PlayerSelectorSupabaseLike} surface. */
export function toPlayerSelectorSupabaseLike(client: SupabaseClient): PlayerSelectorSupabaseLike {
  return {
    from(table: "players" | "korean_name_mappings") {
      if (table === "players") {
        return {
          select(columns: string) {
            return client.from(table).select(columns) as unknown as ReturnType<
              PlayersSelectorTableClient["select"]
            >;
          },
        };
      }
      return {
        select(columns: string) {
          return client.from(table).select(columns) as unknown as ReturnType<
            MappingsSelectorTableClient["select"]
          >;
        },
      };
    },
  } as PlayerSelectorSupabaseLike;
}

/** Adapts a real client onto the read-only {@link PlayerLookupSupabaseLike} surface. */
export function toPlayerLookupSupabaseLike(client: SupabaseClient): PlayerLookupSupabaseLike {
  return {
    from(table: "players") {
      return {
        select(columns: string) {
          return client.from(table).select(columns) as unknown as PlayerLookupQueryBuilder;
        },
      };
    },
  };
}

/**
 * Player-selector-specific Supabase client factory — reads via the `anon`
 * key (REQ-SYNC-003), matching every other live gameplay read path
 * (REQ-SYNC-001 — this module never calls the football data provider
 * directly).
 */
export function createPlayerSelectorSupabaseClient(): PlayerSelectorSupabaseLike {
  return toPlayerSelectorSupabaseLike(getSupabaseClient());
}

/** Player-lookup-specific Supabase client factory — reads via the `anon` key. */
export function createPlayerLookupSupabaseClient(): PlayerLookupSupabaseLike {
  return toPlayerLookupSupabaseLike(getSupabaseClient());
}
