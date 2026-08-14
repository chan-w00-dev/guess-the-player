/**
 * Player-data sync job types — SPEC-GAME-CORE-001 §F M4.
 *
 * `SupabaseLike` is deliberately the minimal structural surface this module
 * needs from a Supabase client's `players` table access — narrow enough
 * that tests can inject a lightweight in-memory fake instead of a real
 * `@supabase/supabase-js` client. See `lib/player-data-sync/supabase-adapter.ts`
 * for the bridge that adapts a real `SupabaseClient` to this interface.
 */

/** The `players` table row shape (see `supabase/migrations/0001_create_players_table.sql`). */
export interface PlayerRow {
  id: number;
  name: string;
  club: string | null;
  position: string;
  nationality: string | null;
  age: number | null;
  photo_url: string | null;
  season: string;
  synced_at: string;
}

/** Minimal upsert-only surface the sync job needs from a `players` table handle. */
export interface PlayersTableClient {
  upsert(
    values: PlayerRow,
    options: { onConflict: string },
  ): PromiseLike<{ error: { message: string } | null }>;
}

/** Minimal structural surface the sync job needs from a Supabase client. */
export interface SupabaseLike {
  from(table: "players"): PlayersTableClient;
}
