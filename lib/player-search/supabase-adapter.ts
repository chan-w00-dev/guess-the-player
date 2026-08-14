/**
 * Bridges a real `@supabase/supabase-js` client onto this module's minimal
 * {@link PlayerSearchSupabaseLike} surface — SPEC-GAME-CORE-001 §F M6.
 * Mirrors `lib/korean-name-mapping/supabase-adapter.ts` and
 * `lib/player-data-sync/supabase-adapter.ts`'s adapter pattern, so
 * `search.ts`'s tests never need to construct or mock a real Supabase
 * client — a lightweight fake is enough.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  KoreanMappingsSearchQueryBuilder,
  PlayerSearchSupabaseLike,
  PlayersSearchQueryBuilder,
} from "./types";

/** Adapts a real client onto the read-only {@link PlayerSearchSupabaseLike} surface. */
export function toPlayerSearchSupabaseLike(client: SupabaseClient): PlayerSearchSupabaseLike {
  return {
    from(table: "players" | "korean_name_mappings") {
      if (table === "players") {
        return {
          select(columns: string) {
            return client.from(table).select(columns) as unknown as PlayersSearchQueryBuilder;
          },
        };
      }
      return {
        select(columns: string) {
          return client
            .from(table)
            .select(columns) as unknown as KoreanMappingsSearchQueryBuilder;
        },
      };
    },
  } as PlayerSearchSupabaseLike;
}

/**
 * Player-search-specific Supabase client factory — reads via the `anon`
 * key (REQ-SYNC-003): both `players` and `korean_name_mappings` grant
 * `anon` a public SELECT-only RLS policy, matching every other live
 * gameplay read path (REQ-SYNC-001 — this module never calls the football
 * data provider directly).
 */
export function createSearchSupabaseClient(): PlayerSearchSupabaseLike {
  return toPlayerSearchSupabaseLike(getSupabaseClient());
}
