/**
 * Age computation — SPEC-GAME-CORE-001 §F M3 (plan.md §B "Age computation —
 * calendar-year-only method", corrected in the 0.4.0 revision).
 *
 * football-data.org supplies a `dateOfBirth` field, not a pre-computed age.
 * Age is computed as a snapshot integer at fetch/sync time against a
 * reference date using the **calendar-year-only** method — the Korean
 * "연 나이" convention: `age = referenceYear - birthYear`, with NO month/day
 * comparison at all. A player born in 2003 is always computed as age 23
 * throughout all of 2026, regardless of whether their birthday has passed.
 *
 * This is a deliberate, user-confirmed simplification (explicitly preferred
 * over a birthday-adjusted/"만 나이"-style calculation) — do NOT "fix" this
 * back to a birthday-adjusted calculation. An earlier implementation of
 * this module computed age with a birthday adjustment; that was corrected
 * to this calendar-year-only method per explicit user direction (spec.md
 * HISTORY 0.4.0). Staleness is bounded by the M4 sync job's refresh cadence
 * (a stored age changing by exactly one, once a year on January 1st rather
 * than on the individual's birthday, is an accepted and expected staleness
 * window per plan.md §B — the same periodic-refresh tolerance already
 * designed into REQ-SYNC-002/003).
 *
 * The reference date defaults to "now" for production convenience, but is
 * always explicitly injected by this module's own tests and by every
 * caller within the test suite, so age computation is fully deterministic
 * under test.
 */

/**
 * Computes a player's age in whole years as of `referenceDate`, from an
 * ISO-8601 `dateOfBirth` string (football-data.org's raw format, e.g.
 * `"1993-07-18"`), using the calendar-year-only method:
 * `age = referenceDate.year - dateOfBirth.year`. No month/day comparison is
 * performed — see the module doc comment above for the rationale.
 *
 * Uses UTC calendar fields throughout (both `dateOfBirth` and
 * `referenceDate`) so the result does not depend on the host machine's or
 * CI runner's local timezone — a date-only ISO string like `"1993-07-18"`
 * is parsed as UTC midnight by the `Date` constructor, and comparing it
 * against `referenceDate`'s UTC year keeps the computation timezone-safe.
 */
export function computeAge(dateOfBirth: string, referenceDate: Date = new Date()): number {
  const dob = new Date(dateOfBirth);

  return referenceDate.getUTCFullYear() - dob.getUTCFullYear();
}
