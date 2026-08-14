/**
 * Barrel export for the `lib/korean-name-mapping/` module —
 * SPEC-GAME-CORE-001 §F M5.
 */

export { resolveKoreanName } from "./mapper";
export type { ResolveKoreanNameOptions } from "./mapper";
export { runKoreanNameSeed } from "./seed";
export type { KoreanNameSeedSummary, RunKoreanNameSeedOptions } from "./seed";
export {
  createMapperSupabaseClient,
  createSeedSupabaseClient,
  toMapperSupabaseLike,
  toSeedSupabaseLike,
} from "./supabase-adapter";
export type {
  KoreanMappingQueryBuilder,
  KoreanMappingRow,
  MapperSupabaseLike,
  MapperTableClient,
  SeedSupabaseLike,
  SeedTableClient,
} from "./types";
