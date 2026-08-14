/**
 * Attribute comparison engine — the core NEW mechanic for the 0.3.0
 * attribute-comparison guesser (spec.md REQ-COMPARE-001..007).
 * SPEC-GAME-CORE-001 §F M2.
 *
 * Scope note (M2 vs M8 boundary): this module computes ONLY the per-guess
 * 5-attribute {@link ComparisonResult} for a single (guess, target) pair. It
 * does NOT decide round win/loss, does NOT mutate {@link RoundState}, and
 * does NOT increment an attempt count — those are M8 (guess-service)
 * concerns per plan.md §F M2 vs M8: "Wires together M2 (comparison), ...
 * the win condition ..., the 8-guess loss condition, the duplicate-guess-
 * consumes-an-attempt rule". {@link compareGuess} is a pure function with no
 * side effects, so REQ-COMPARE-006 (duplicate-guess idempotency) holds by
 * construction — the same (guess, target) pair always produces a
 * structurally identical result.
 *
 * @MX:ANCHOR: [AUTO] compareGuess is the sole comparison entry point
 * consumed by the guess-submission service (M8) and the Next.js guess API
 * route (M9), and exercised directly by this module's own test suite
 * (expected fan_in >= 3 once M8/M9 land).
 * @MX:REASON: any change to the comparison result shape or matching rules
 * ripples through the guess-submission service, the API route, and every
 * UI component that renders a comparison row.
 */

import type { Player } from "@/types/player";
import {
  COMPARISON_ATTRIBUTES,
  isCategoricalAttribute,
  type AttributeComparisonResult,
  type CategoricalAttribute,
  type ComparisonResult,
  type NumericAttribute,
} from "@/types/comparison";

/**
 * Compares a guessed player against the current round's target player
 * across all 5 REQ-COMPARE-001 attributes and returns one comparison
 * result row (REQ-COMPARE-002).
 *
 * Pure function: no side effects, no hidden state. The same (guess, target)
 * pair always produces a structurally identical result — this is what makes
 * REQ-COMPARE-006 (duplicate-guess idempotency) hold without any special
 * casing at the call site.
 */
export function compareGuess(guess: Player, target: Player): ComparisonResult {
  const attributes: AttributeComparisonResult[] = COMPARISON_ATTRIBUTES.map((attribute) =>
    isCategoricalAttribute(attribute)
      ? compareCategorical(attribute, guess, target)
      : compareNumeric(attribute, guess, target),
  );

  return { attributes };
}

/**
 * Categorical attributes (nationality, club, position) return a plain
 * correct/incorrect indicator only — never a direction (REQ-COMPARE-003).
 */
function compareCategorical(
  attribute: CategoricalAttribute,
  guess: Player,
  target: Player,
): AttributeComparisonResult {
  const guessValue = getCategoricalValue(attribute, guess);
  const targetValue = getCategoricalValue(attribute, target);

  if (guessValue === null || targetValue === null) {
    // REQ-COMPARE-007: incomplete synced data — mark unavailable, do not
    // fail the guess. `correct: false` is the conservative non-claim: an
    // unavailable attribute is never reported as a confirmed match.
    return { attribute, correct: false, unavailable: true };
  }

  return { attribute, correct: guessValue === targetValue };
}

/**
 * The two numeric attributes (age, squadNumber) additionally carry a
 * directional indicator on mismatch, showing whether the target's value is
 * higher or lower than the guessed player's value (REQ-COMPARE-004).
 */
function compareNumeric(
  attribute: NumericAttribute,
  guess: Player,
  target: Player,
): AttributeComparisonResult {
  const guessValue = getNumericValue(attribute, guess);
  const targetValue = getNumericValue(attribute, target);

  if (guessValue === null || targetValue === null) {
    // REQ-COMPARE-007: incomplete synced data — mark unavailable, no
    // direction can be computed without both values.
    return { attribute, correct: false, unavailable: true };
  }

  if (guessValue === targetValue) {
    return { attribute, correct: true };
  }

  return {
    attribute,
    correct: false,
    direction: targetValue > guessValue ? "higher" : "lower",
  };
}

function getCategoricalValue(attribute: CategoricalAttribute, player: Player): string | null {
  switch (attribute) {
    case "nationality":
      return player.nationality;
    case "club":
      return player.club;
    case "position":
      return player.position;
  }
}

function getNumericValue(attribute: NumericAttribute, player: Player): number | null {
  switch (attribute) {
    case "age":
      return player.age;
    case "squadNumber":
      return player.squadNumber;
  }
}
