/**
 * Korean name mapping module types — SPEC-GAME-CORE-001 §F M5.
 *
 * Two minimal structural Supabase surfaces, mirroring the narrow-DI pattern
 * established by `lib/player-data-sync/types.ts`: {@link MapperSupabaseLike}
 * is the read-only surface `mapper.ts` needs (anon-key client,
 * REQ-KOREAN-001); {@link SeedSupabaseLike} is the write-only surface the
 * one-time seed script needs (service_role-key client, REQ-KOREAN-004).
 * Keeping them separate matches each module's actual privilege level and
 * keeps each module's tests free of an unused mock surface.
 */

/**
 * The `korean_name_mappings` table row shape (see
 * `supabase/migrations/0003_create_korean_name_mappings_table.sql`).
 */
export interface KoreanMappingRow {
  original_name: string;
  korean_name: string;
}

/** Minimal query-builder surface `mapper.ts` needs for a single-row lookup. */
export interface KoreanMappingQueryBuilder {
  eq(column: "original_name", value: string): KoreanMappingQueryBuilder;
  maybeSingle(): PromiseLike<{
    data: Pick<KoreanMappingRow, "korean_name"> | null;
    error: { message: string } | null;
  }>;
}

/** Minimal read-only table-handle surface `mapper.ts` needs. */
export interface MapperTableClient {
  select(columns: string): KoreanMappingQueryBuilder;
}

/** Minimal structural surface `mapper.ts` needs from a Supabase client. */
export interface MapperSupabaseLike {
  from(table: "korean_name_mappings"): MapperTableClient;
}

/** Minimal upsert-only surface the seed script needs from a table handle. */
export interface SeedTableClient {
  upsert(
    values: KoreanMappingRow,
    options: { onConflict: string },
  ): PromiseLike<{ error: { message: string } | null }>;
}

/** Minimal structural surface the seed script needs from a Supabase client. */
export interface SeedSupabaseLike {
  from(table: "korean_name_mappings"): SeedTableClient;
}
