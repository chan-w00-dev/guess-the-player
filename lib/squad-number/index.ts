/**
 * Barrel export for the `lib/squad-number/` module — SPEC-GAME-CORE-001 §F,
 * HISTORY 0.5.0.
 */

export { runSquadNumberUpdate } from "./update";
export type { RunSquadNumberUpdateOptions, SquadNumberUpdateSummary } from "./update";
export {
  createSquadNumberSupabaseClient,
  toSquadNumberSupabaseLike,
} from "./supabase-adapter";
export type {
  SquadNumberEntry,
  SquadNumberSelectQueryBuilder,
  SquadNumberSupabaseLike,
  SquadNumberTableClient,
  SquadNumberUpdateQueryBuilder,
} from "./types";
