/**
 * Barrel export for the `lib/player-data-sync/` module —
 * SPEC-GAME-CORE-001 §F M4.
 */

export { DEFAULT_SEASON, runPlayerDataSync } from "./sync";
export type { PlayerDataSyncSummary, RunPlayerDataSyncOptions } from "./sync";
export { toSupabaseLike } from "./supabase-adapter";
export type { PlayerRow, PlayersTableClient, SupabaseLike } from "./types";
