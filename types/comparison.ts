/**
 * Round/comparison domain types — the shared shapes consumed by the M2
 * comparison engine, M7 player selection, and M8 guess submission service.
 * SPEC-GAME-CORE-001 §F M1.
 *
 * @MX:ANCHOR: [AUTO] ComparisonResult / RoundState / GuessResult are the
 * result contracts every gameplay module (M2, M7, M8, M9 API routes)
 * depends on (expected fan_in >= 3 once those milestones land).
 * @MX:REASON: shared type import surface for the comparison + guess-flow
 * side of the domain — any breaking change here ripples through M2/M7/M8/M9.
 */

import type { Player } from "./player";

/**
 * The five compared/synced attributes (REQ-COMPARE-001, REQ-SYNC-002).
 * Squad number was removed in spec.md HISTORY 0.4.0 (football-data.org's
 * free tier does not supply it) and reinstated in HISTORY 0.5.0 as a
 * manually-maintained numeric attribute alongside age (REQ-SYNC-004) — see
 * `types/player.ts` for the full rationale.
 */
export const COMPARISON_ATTRIBUTES = [
  "nationality",
  "club",
  "position",
  "age",
  "squadNumber",
] as const;
export type ComparisonAttribute = (typeof COMPARISON_ATTRIBUTES)[number];

/** Attributes compared as an exact match indicator only, no direction (REQ-COMPARE-003). */
export const CATEGORICAL_ATTRIBUTES = ["nationality", "club", "position"] as const;
export type CategoricalAttribute = (typeof CATEGORICAL_ATTRIBUTES)[number];

/** Attributes compared numerically with an optional direction on mismatch (REQ-COMPARE-004). */
export const NUMERIC_ATTRIBUTES = ["age", "squadNumber"] as const;
export type NumericAttribute = (typeof NUMERIC_ATTRIBUTES)[number];

/** Narrows a {@link ComparisonAttribute} to a {@link CategoricalAttribute}. */
export function isCategoricalAttribute(
  attribute: ComparisonAttribute,
): attribute is CategoricalAttribute {
  return (CATEGORICAL_ATTRIBUTES as readonly string[]).includes(attribute);
}

/** Narrows a {@link ComparisonAttribute} to a {@link NumericAttribute}. */
export function isNumericAttribute(attribute: ComparisonAttribute): attribute is NumericAttribute {
  return (NUMERIC_ATTRIBUTES as readonly string[]).includes(attribute);
}

/** Direction of the target's value relative to the guessed value (REQ-COMPARE-004). */
export type ComparisonDirection = "higher" | "lower";

interface BaseAttributeResult<A extends ComparisonAttribute> {
  attribute: A;
  /** Whether the guessed player's value matches the target's value for this attribute. */
  correct: boolean;
  /** True when the underlying synced data was missing for this attribute (REQ-COMPARE-007). */
  unavailable?: boolean;
}

/** Result row for a categorical attribute — correct/incorrect only, never a direction (REQ-COMPARE-003). */
export type CategoricalAttributeResult = BaseAttributeResult<CategoricalAttribute>;

/** Result row for a numeric attribute — carries an optional direction on mismatch (REQ-COMPARE-004). */
export interface NumericAttributeResult extends BaseAttributeResult<NumericAttribute> {
  direction?: ComparisonDirection;
}

/** A single attribute's outcome within a {@link ComparisonResult}. */
export type AttributeComparisonResult = CategoricalAttributeResult | NumericAttributeResult;

/** Narrows an {@link AttributeComparisonResult} to a {@link NumericAttributeResult}. */
export function isNumericAttributeResult(
  result: AttributeComparisonResult,
): result is NumericAttributeResult {
  return isNumericAttribute(result.attribute);
}

/** One full comparison row for a single guess — exactly 4 attribute outcomes (REQ-COMPARE-001, 002). */
export interface ComparisonResult {
  attributes: AttributeComparisonResult[];
}

/** Lifecycle status of a round. */
export type RoundStatus = "active" | "won" | "lost";

/** Hard attempt cap per round (REQ-GUESS-007). */
export const MAX_ATTEMPTS = 8;

/** In-progress or completed state of a single round. */
export interface RoundState {
  target: Player;
  /** Ordered list of guessed players, in submission order (REQ-GUESS-001, 006). */
  attempts: Player[];
  attemptCount: number;
  status: RoundStatus;
}

/** Constructs a fresh, active {@link RoundState} for the given target player. */
export function createInitialRoundState(target: Player): RoundState {
  return {
    target,
    attempts: [],
    attemptCount: 0,
    status: "active",
  };
}

/** The target player's identity as revealed on a round's win or loss. */
export interface RevealedIdentity {
  originalName: string;
  koreanName: string;
}

/**
 * The response shape for a single guess submission.
 *
 * `reveal` is present only when `status` is `"won"` or `"lost"`
 * (REQ-GUESS-002, REQ-GUESS-004); it MUST be absent while the round is
 * still `"active"`, so an incorrect guess never leaks the target's identity
 * beyond the comparison result (REQ-GUESS-005).
 */
export interface GuessResult {
  comparison: ComparisonResult;
  attemptCount: number;
  status: RoundStatus;
  reveal?: RevealedIdentity;
}

/** Maps a player's original-language name to its Korean media-convention display name. */
export interface KoreanMapping {
  originalName: string;
  koreanName: string;
}
