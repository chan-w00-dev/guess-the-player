/**
 * Bridges a real `@supabase/supabase-js` client onto this module's two
 * minimal structural surfaces — SPEC-GAME-CORE-001 §F M5. Mirrors
 * `lib/player-data-sync/supabase-adapter.ts`'s adapter pattern so
 * `mapper.ts` and `seed.ts` tests never need to construct or mock a real
 * Supabase client — a lightweight fake is enough.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient, getSupabaseServiceRoleClient } from "@/lib/supabase/client";
import type {
  KoreanMappingQueryBuilder,
  KoreanMappingRow,
  MapperSupabaseLike,
  SeedSupabaseLike,
} from "./types";

/** Adapts a real client onto the read-only {@link MapperSupabaseLike} surface. */
export function toMapperSupabaseLike(client: SupabaseClient): MapperSupabaseLike {
  return {
    from(table: "korean_name_mappings") {
      return {
        select(columns: string) {
          return client.from(table).select(columns) as unknown as KoreanMappingQueryBuilder;
        },
      };
    },
  };
}

/** Adapts a real client onto the write-only {@link SeedSupabaseLike} surface. */
export function toSeedSupabaseLike(client: SupabaseClient): SeedSupabaseLike {
  return {
    from(table: "korean_name_mappings") {
      return {
        upsert(values: KoreanMappingRow, options: { onConflict: string }) {
          return client.from(table).upsert(values, options);
        },
      };
    },
  };
}

/**
 * Mapper-specific Supabase client factory — the single place that decides
 * `mapper.ts` reads via the `anon` key (REQ-KOREAN-001). RLS on
 * `korean_name_mappings` grants `anon` a public SELECT-only policy, matching
 * the `players` table pattern.
 */
export function createMapperSupabaseClient(): MapperSupabaseLike {
  return toMapperSupabaseLike(getSupabaseClient());
}

/**
 * Seed-script-specific Supabase client factory — the single place that
 * decides the one-time seed bootstrap uses the `service_role` key, not
 * `anon` (REQ-KOREAN-004). RLS on `korean_name_mappings` grants `anon` no
 * write policy, so an `anon`-key upsert would be rejected; `service_role`
 * bypasses RLS entirely and is reserved exclusively for this seed script —
 * mirrors `lib/player-data-sync/supabase-adapter.ts`'s `createSyncSupabaseClient`.
 */
export function createSeedSupabaseClient(): SeedSupabaseLike {
  return toSeedSupabaseLike(getSupabaseServiceRoleClient());
}
