/**
 * Player domain type — the shared shape every downstream module depends on
 * (M2 comparison engine, M4 sync job, M6 search, M7 selection, M8 guess
 * submission). SPEC-GAME-CORE-001 §F M1.
 *
 * @MX:ANCHOR: [AUTO] Player is the root domain type consumed across the
 * comparison engine, sync job, search, selection, and guess-submission
 * modules (expected fan_in >= 3 once M2-M9 land).
 * @MX:REASON: shared type import surface for the whole SPEC-GAME-CORE-001
 * domain — any breaking change here ripples through every later milestone.
 */

/** Canonical 4-value position taxonomy (spec.md REQ-COMPARE-005). */
export type Position = "FW" | "MF" | "DF" | "GK";

/** Every valid {@link Position} value, in a stable order. */
export const POSITIONS: readonly Position[] = ["FW", "MF", "DF", "GK"];

/**
 * Narrows an arbitrary value to the canonical {@link Position} union.
 * Intended for use by the M3 `FootballDataProvider` adapter after applying
 * the position-taxonomy keyword-classification rule (plan.md §B), to
 * validate the mapped result before it is persisted.
 */
export function isPosition(value: unknown): value is Position {
  return typeof value === "string" && (POSITIONS as readonly string[]).includes(value);
}

/**
 * A football player eligible for selection, search, and comparison.
 *
 * `club`, `nationality`, and `age` are nullable to model incomplete synced
 * attribute data (spec.md REQ-COMPARE-007, plan.md §E residual risk —
 * pre-season 2026/27 roster gaps). `position` is NOT nullable: an unmapped
 * raw position string never reaches this type — the M4 sync job's fallback
 * (plan.md §B) logs and skips that player from the pool for the current
 * sync run instead of writing an undefined position.
 *
 * `squadNumber` was removed (spec.md HISTORY 0.4.0): football-data.org's
 * free-tier API does not supply shirt/squad-number data on any endpoint
 * accessible on the free key, and the free alternative (TheSportsDB)
 * required either an unreliable double-lookup-per-player scheme or a paid
 * tier — not worth the complexity for this project's scope.
 *
 * `photo` is an OPTIONAL, display-only field. It is NOT one of the 4
 * compared/synced attributes (REQ-SYNC-002 / REQ-COMPARE-001) and does NOT
 * enable the photo-guessing mode, which stays explicitly Out of Scope
 * (spec.md §D).
 */
export interface Player {
  /** Stable identifier (e.g. the football-data.org person id, as a string). */
  id: string;
  /** Original-language / romanized display name. */
  name: string;
  club: string | null;
  position: Position;
  nationality: string | null;
  age: number | null;
  /** Optional display-only photo URL. Never compared, never a sync-required attribute. */
  photo?: string;
}
