"use client";

/**
 * Guess history / comparison table — SPEC-GAME-CORE-001 §F M10, rich-cell
 * display added M13 (0.7.0 amendment).
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
 * checked FIRST — before any attribute-specific rendering branch — so an
 * unavailable attribute can never render a false correct/incorrect indicator
 * or attempt to render a flag/crest/value it does not reliably have
 * (REQ-COMPARE-008/009, D1/D2 plan-audit finding).
 *
 * M13 (REQ-COMPARE-008..012): each cell renders the GUESSED player's actual
 * value for that attribute — a national flag for nationality, a club emblem
 * image for club, the FW/MF/DF/GK text for position, the actual number for
 * age/squadNumber plus the existing directional arrow — instead of a bare
 * ✓/✗ symbol. The green/red correct/incorrect background coloring
 * (REQ-COMPARE-003) is unchanged. A club or nationality absent from the
 * static display mapping falls back to the pre-M13 textual rendering
 * (REQ-COMPARE-012) rather than failing the guess or the round.
 */

import type { ReactNode } from "react";
import {
  COMPARISON_ATTRIBUTES,
  isNumericAttributeResult,
  isCategoricalAttribute,
  type AttributeComparisonResult,
  type ComparisonAttribute,
  type ComparisonResult,
} from "@/types/comparison";
import type { PlayerSearchCandidate } from "@/lib/player-search/types";
import { getClubCrestUrl } from "@/lib/game/club-crests";
import { getNationalityFlag } from "@/lib/game/nationality-flags";

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
 * Cell content — renders the GUESSED player's actual value for the attribute
 * (REQ-COMPARE-008/009), instead of a bare ✓/✗ symbol. The cell's
 * correct/incorrect background color is driven entirely by
 * {@link cellClassName} above; this function only decides WHAT is shown.
 *
 * `unavailable` is checked FIRST — before any attribute-specific branch — so
 * an unavailable attribute never attempts to render a flag/crest/value it
 * does not reliably have (D1/D2 plan-audit finding): it always falls
 * through to the same neutral placeholder used pre-M13, regardless of
 * attribute type.
 */
function cellContent(
  attribute: ComparisonAttribute,
  result: AttributeComparisonResult | undefined,
  candidate: PlayerSearchCandidate,
): ReactNode {
  if (!result || result.unavailable) {
    return "—";
  }

  if (isCategoricalAttribute(attribute)) {
    switch (attribute) {
      case "nationality": {
        // REQ-COMPARE-010: a national flag; REQ-COMPARE-012 fallback to the
        // raw nationality text when the value has no mapped flag.
        const flag = getNationalityFlag(candidate.nationality);
        return flag ? <span className="text-2xl leading-none">{flag}</span> : (candidate.nationality ?? "—");
      }
      case "club": {
        // REQ-COMPARE-011: the club's emblem image; REQ-COMPARE-012
        // fallback to the raw club name text when unmapped.
        const crestUrl = getClubCrestUrl(candidate.club);
        if (crestUrl) {
          return (
            <img
              src={crestUrl}
              alt={candidate.club ?? ""}
              className="h-8 w-8 object-contain"
            />
          );
        }
        return candidate.club ?? "—";
      }
      case "position":
        // Already the FW/MF/DF/GK text value — no lookup needed.
        return candidate.position;
    }
  }

  // Numeric attributes: age, squadNumber (REQ-COMPARE-009). A directional
  // arrow is appended ONLY when `direction` is present (i.e. only on a
  // mismatch where the underlying data was not `unavailable`).
  if (isNumericAttributeResult(result)) {
    const arrow = result.direction ? (result.direction === "higher" ? " ↑" : " ↓") : "";

    if (attribute === "age") {
      return candidate.age === null ? "—" : `${candidate.age}${arrow}`;
    }

    // squadNumber: a `null` value (distinct from `unavailable` — a guessed
    // player who simply has no squad number registered) is treated the same
    // as the unavailable neutral-placeholder case — never render "#null".
    return candidate.squadNumber === null ? "—" : `#${candidate.squadNumber}${arrow}`;
  }

  return "—";
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
                  className={`border-b border-zinc-100 px-2 py-1 text-center align-middle dark:border-zinc-800 ${cellClassName(result)}`}
                >
                  <span className="flex items-center justify-center gap-1">
                    {cellContent(attribute, result, entry.candidate)}
                  </span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
