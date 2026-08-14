/**
 * Age computation — SPEC-GAME-CORE-001 §F M3 (plan.md §B "Age computation"
 * resolved decision).
 *
 * football-data.org supplies a `dateOfBirth` field, not a pre-computed age.
 * Age is computed as a snapshot integer at fetch/sync time against a
 * reference date — "age as of the reference date", NOT a continuously
 * live-recomputed value. Staleness is bounded by the M4 sync job's refresh
 * cadence (a stored age drifting by exactly one, once a year on the
 * player's birthday, is an accepted and expected staleness window per
 * plan.md §B — the same periodic-refresh tolerance already designed into
 * REQ-SYNC-002/003).
 *
 * The reference date defaults to "now" for production convenience, but is
 * always explicitly injected by this module's own tests and by every
 * caller within the test suite, so age computation is fully deterministic
 * under test.
 */

/**
 * Computes a player's age in whole years as of `referenceDate`, from an
 * ISO-8601 `dateOfBirth` string (football-data.org's raw format, e.g.
 * `"1993-07-18"`).
 *
 * Uses UTC calendar fields throughout (both `dateOfBirth` and
 * `referenceDate`) so the result does not depend on the host machine's or
 * CI runner's local timezone — a date-only ISO string like `"1993-07-18"`
 * is parsed as UTC midnight by the `Date` constructor, and comparing it
 * against `referenceDate`'s UTC fields keeps the computation timezone-safe.
 */
export function computeAge(dateOfBirth: string, referenceDate: Date = new Date()): number {
  const dob = new Date(dateOfBirth);

  let age = referenceDate.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = referenceDate.getUTCMonth() - dob.getUTCMonth();
  const dayDiff = referenceDate.getUTCDate() - dob.getUTCDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
}
