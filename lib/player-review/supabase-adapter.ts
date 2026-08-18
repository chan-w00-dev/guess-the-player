/**
 * Bridges a real `@supabase/supabase-js` client onto this module's
 * read-only {@link PlayerReviewExportSupabaseLike} surface —
 * SPEC-GAME-CORE-001 §F M12. Mirrors `lib/player-search/supabase-adapter.ts`'s
 * two-table adapter pattern, so `export.ts`'s tests never need to construct
 * or mock a real Supabase client — a lightweight fake is enough.
 *
 * Deliberately imports only {@link getSupabaseClient} (the `anon`-key
 * factory) — never `getSupabaseServiceRoleClient`, `createSeedSupabaseClient`,
 * or `createSquadNumberSupabaseClient`. The review export is a read-only
 * capability (REQ-REVIEW-001); RLS on both `players` and
 * `korean_name_mappings` already grants `anon` public SELECT, matching every
 * other live-gameplay/CLI read path in this module family (see
 * `lib/player-search/supabase-adapter.ts`).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  MappingsReviewTableClient,
  PlayerReviewExportSupabaseLike,
  PlayersReviewTableClient,
} from "./types";

/** Adapts a real client onto the read-only {@link PlayerReviewExportSupabaseLike} surface. */
export function toPlayerReviewExportSupabaseLike(
  client: SupabaseClient,
): PlayerReviewExportSupabaseLike {
  return {
    from(table: "players" | "korean_name_mappings") {
      if (table === "players") {
        return {
          select(columns: string) {
            return client.from(table).select(columns) as unknown as ReturnType<
              PlayersReviewTableClient["select"]
            >;
          },
        };
      }
      return {
        select(columns: string) {
          return client.from(table).select(columns) as unknown as ReturnType<
            MappingsReviewTableClient["select"]
          >;
        },
      };
    },
  } as PlayerReviewExportSupabaseLike;
}

/**
 * Review-export-specific Supabase client factory — the single place that
 * decides `lib/player-review/export.ts` reads via the `anon` key
 * (REQ-REVIEW-001). Both `players` and `korean_name_mappings` grant `anon` a
 * public SELECT-only RLS policy, matching every other live/CLI read path.
 */
export function createPlayerReviewExportSupabaseClient(): PlayerReviewExportSupabaseLike {
  return toPlayerReviewExportSupabaseLike(getSupabaseClient());
}
