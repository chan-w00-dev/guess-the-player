/**
 * FootballDataProvider abstraction boundary — SPEC-GAME-CORE-001 §F M3.
 *
 * Fetches the Premier League 2026/27 player pool plus its five compared
 * attributes (nationality, club, position, age, squad number), already
 * mapped onto the M1 {@link Player} shape. Consumed exclusively by the M4
 * sync job (spec.md REQ-SYNC-001) — never by a live gameplay request
 * handler (player selection, search, guess submission, or their
 * `app/api/` routes read only from Supabase, per plan.md §D/§G).
 *
 * Design note (interface shape): plan.md §B originally framed this
 * abstraction as "fetch player attributes for a given player identifier"
 * (a per-player lookup). The verified football-data.org endpoint
 * (`GET /v4/competitions/PL/teams?season=2026`) instead returns the whole
 * competition's teams + squads in one call — there is no practical
 * per-player-id endpoint for this SPEC's scope. `fetchPlayerPool()`
 * reflects the endpoint actually verified against the provider's docs
 * (plan.md §F M3's own instruction to validate the interface shape during
 * this milestone); it supersedes the earlier per-player framing as a
 * normal M3 implementation-verification resolution, not a scope change.
 *
 * @MX:ANCHOR: [AUTO] FootballDataProvider is the sync-job-only external-data
 * abstraction boundary; both the real football-data.org adapter and the
 * deterministic mock adapter implement it (expected fan_in >= 3 once M4's
 * sync job and its tests consume it).
 * @MX:REASON: isolates any future provider swap to the M4 sync job only —
 * the comparison engine, player selector, search, and guess service never
 * import this module directly (plan.md §G anti-pattern).
 */

import type { Player } from "@/types/player";

export interface FootballDataProvider {
  /**
   * Fetches the current Premier League 2026/27 player pool, already mapped
   * onto the M1 {@link Player} shape (position pre-classified into the
   * canonical FW/MF/DF/GK taxonomy; age pre-computed from date of birth as
   * of the adapter's reference date). Players whose raw position string
   * does not match any classification keyword are silently omitted from
   * the returned pool (plan.md §B fallback — log + skip, never guess).
   */
  fetchPlayerPool(): Promise<Player[]>;
}
