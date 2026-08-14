/**
 * Position-taxonomy keyword-classification rule — SPEC-GAME-CORE-001 §F M3.
 *
 * Maps a football-data.org raw `position` string onto the canonical 4-value
 * {@link Position} taxonomy, per plan.md §B's resolved keyword-based
 * substring classification rule. The raw value may be either a granular
 * sub-position string (e.g. "Central Midfield", "Attacking Midfield",
 * "Centre-Back", "Left Winger") or a coarse top-level category as returned
 * by the live `/v4/competitions/PL/teams` endpoint (e.g. "Offence",
 * "Defence", "Midfield", "Goalkeeper"). The priority order below is
 * load-bearing: it MUST stay exactly Goalkeeper -> Midfield -> Back/Defen ->
 * Forward/Winger/Attack/Striker/Offence/Offense so compound strings like
 * "Attacking Midfield" and "Defensive Midfield" classify as MF (checked
 * before the FW/DF keyword families), never falling through to FW or DF.
 */

import type { Position } from "@/types/player";

/**
 * Classifies a raw position string into the canonical FW/MF/DF/GK taxonomy
 * (REQ-COMPARE-005). Matching is case-insensitive substring matching,
 * applied in the fixed priority order documented above.
 *
 * Returns `null` when no keyword matches (the explicit fallback path,
 * plan.md §B rule 5) — callers MUST skip that player from the pool for the
 * current sync run rather than writing an undefined or guessed value.
 */
export function mapPosition(rawPosition: string): Position | null {
  const value = rawPosition.toLowerCase();

  if (value.includes("goalkeeper")) {
    return "GK";
  }
  if (value.includes("midfield")) {
    return "MF";
  }
  if (value.includes("back") || value.includes("defen")) {
    return "DF";
  }
  if (
    value.includes("forward") ||
    value.includes("winger") ||
    value.includes("attack") ||
    value.includes("striker") ||
    value.includes("offence") ||
    value.includes("offense")
  ) {
    return "FW";
  }

  return null;
}
