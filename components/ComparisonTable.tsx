"use client";

/**
 * Guess history / comparison table — SPEC-GAME-CORE-001 §F M10.
 *
 * Renders one row per submitted guess, one column per comparison attribute
 * (nationality, club, position, age, squadNumber — REQ-COMPARE-001/002).
 * Categorical attributes (nationality/club/position, REQ-COMPARE-003) render
 * a correct/incorrect indicator only, never a direction. Numeric attributes
 * (age/squadNumber, REQ-COMPARE-004) additionally render a directional arrow
 * on mismatch, but ONLY when `direction` is present (i.e. never on a match
 * and never on an `unavailable` cell). Distinguishing categorical vs numeric
 * is done by attribute name via {@link isNumericAttributeResult} — NOT by
 * checking for the presence of a `direction` key, since both a correct
 * numeric guess and an `unavailable` numeric attribute also omit `direction`
 * (see the D2/E6 self-verification note in the completion report).
 * `unavailable` cells (REQ-COMPARE-007) always render a neutral placeholder,
 * checked BEFORE the correct/incorrect branch so an unavailable attribute can
 * never render a false correct/incorrect indicator.
 */

import {
  COMPARISON_ATTRIBUTES,
  isNumericAttributeResult,
  type AttributeComparisonResult,
  type ComparisonAttribute,
  type ComparisonResult,
} from "@/types/comparison";
import type { PlayerSearchCandidate } from "@/lib/player-search/types";

export interface ComparisonTableEntry {
  candidate: PlayerSearchCandidate;
  comparison: ComparisonResult;
}

export interface ComparisonTableProps {
  entries: ComparisonTableEntry[];
}

const ATTRIBUTE_LABELS: Record<ComparisonAttribute, string> = {
  nationality: "Nationality",
  club: "Club",
  position: "Position",
  age: "Age",
  squadNumber: "Squad #",
};

function findResult(
  comparison: ComparisonResult,
  attribute: ComparisonAttribute,
): AttributeComparisonResult | undefined {
  return comparison.attributes.find((entry) => entry.attribute === attribute);
}

/**
 * Cell background/text styling. `unavailable` is checked first so an
 * incomplete-data attribute (REQ-COMPARE-007) never inherits the green/red
 * correct/incorrect styling below it.
 */
function cellClassName(result: AttributeComparisonResult | undefined): string {
  if (!result || result.unavailable) {
    return "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500";
  }
  return result.correct
    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
    : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
}

/**
 * Cell text content. A directional arrow is appended ONLY for a numeric
 * attribute (checked by name via {@link isNumericAttributeResult}, not by
 * the presence of `direction`) that carries a `direction` — i.e. only on a
 * mismatch where the underlying data was not `unavailable`.
 */
function cellContent(result: AttributeComparisonResult | undefined): string {
  if (!result || result.unavailable) {
    return "—";
  }
  if (result.correct) {
    return "✓";
  }
  if (isNumericAttributeResult(result) && result.direction) {
    return result.direction === "higher" ? "✗ ↑" : "✗ ↓";
  }
  return "✗";
}

export default function ComparisonTable({ entries }: ComparisonTableProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400" data-testid="comparison-table-empty">
        No guesses yet — search for a player above to make your first guess.
      </p>
    );
  }

  return (
    <table
      data-testid="comparison-table"
      className="w-full max-w-2xl border-collapse text-sm"
    >
      <thead>
        <tr>
          <th className="border-b border-zinc-200 px-2 py-1 text-left dark:border-zinc-700">
            Player
          </th>
          {COMPARISON_ATTRIBUTES.map((attribute) => (
            <th
              key={attribute}
              className="border-b border-zinc-200 px-2 py-1 text-left dark:border-zinc-700"
            >
              {ATTRIBUTE_LABELS[attribute]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, index) => (
          <tr key={`${entry.candidate.id}-${index}`}>
            <td className="border-b border-zinc-100 px-2 py-1 font-medium dark:border-zinc-800">
              {entry.candidate.koreanName}
            </td>
            {COMPARISON_ATTRIBUTES.map((attribute) => {
              const result = findResult(entry.comparison, attribute);
              return (
                <td
                  key={attribute}
                  data-testid={`cell-${index}-${attribute}`}
                  className={`border-b border-zinc-100 px-2 py-1 text-center dark:border-zinc-800 ${cellClassName(result)}`}
                >
                  {cellContent(result)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
