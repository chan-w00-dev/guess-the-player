/**
 * Manual squad-number entry module types — SPEC-GAME-CORE-001 §F, HISTORY
 * 0.5.0 (REQ-SYNC-004).
 *
 * Structurally distinct from the M5 Korean-name-mapping module
 * (`lib/korean-name-mapping/`) by design (plan.md §B "Resolved — Squad
 * Number Reinstated as a Manually-Maintained Attribute"): squad number does
 * NOT live in its own lookup table keyed by name — it lives directly on the
 * `players.squad_number` column, keyed by the numeric `players.id` primary
 * key. `SquadNumberEntry` is therefore id-keyed, NOT name-keyed, and this
 * module never reads a bundled, checked-in seed dataset file the way
 * `lib/korean-name-mapping/seed.ts` does — spec.md §D "Out of Scope — Squad
 * Number Administration Tooling" explicitly excludes a seed-and-replace
 * bulk-import pattern for this attribute.
 */

/** One manual squad-number entry, keyed by the numeric `players.id` (REQ-SYNC-004). */
export interface SquadNumberEntry {
  id: number;
  squadNumber: number;
}

/** Minimal update-then-filter query-builder surface `update.ts` needs. */
export interface SquadNumberUpdateQueryBuilder {
  eq(column: "id", value: number): PromiseLike<{ error: { message: string } | null }>;
}

/** Minimal update-only table-handle surface `update.ts` needs. */
export interface SquadNumberTableClient {
  update(values: { squad_number: number }): SquadNumberUpdateQueryBuilder;
}

/** Minimal structural surface `update.ts` needs from a Supabase client. */
export interface SquadNumberSupabaseLike {
  from(table: "players"): SquadNumberTableClient;
}
