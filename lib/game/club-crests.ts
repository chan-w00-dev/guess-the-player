/**
 * Club name -> crest image URL lookup — SPEC-GAME-CORE-001 §F M13.
 *
 * Implements REQ-COMPARE-011: a static, exhaustive mapping covering the
 * current Premier League 2026/27 pool's 20 clubs. Rendering the emblem via
 * this lookup makes no new runtime API call — the URLs are fetched from
 * football-data.org's static crest CDN and hardcoded here at plan-phase
 * (verified live via a sample HTTP-200 check; see plan.md §B for the
 * verification note).
 *
 * @MX:ANCHOR: [AUTO] getClubCrestUrl is the sole entry point
 * `components/ComparisonTable.tsx`'s club-attribute cell rendering depends on
 * to resolve a guessed player's club name to an emblem image (expected
 * fan_in >= 3 once other display surfaces reuse it).
 * @MX:REASON: every club emblem rendered anywhere in the UI must resolve
 * through this function's fallback contract (REQ-COMPARE-012) — never throw,
 * never render a broken image URL for an unmapped club.
 */

/** Club name (exact `players.club` column value) -> crest image URL (REQ-COMPARE-011). */
const CLUB_CRESTS: Record<string, string> = {
  "Arsenal FC": "https://crests.football-data.org/57.png",
  "Aston Villa FC": "https://crests.football-data.org/58.png",
  "Chelsea FC": "https://crests.football-data.org/61.png",
  "Everton FC": "https://crests.football-data.org/62.png",
  "Fulham FC": "https://crests.football-data.org/63.png",
  "Liverpool FC": "https://crests.football-data.org/64.png",
  "Manchester City FC": "https://crests.football-data.org/65.png",
  "Manchester United FC": "https://crests.football-data.org/66.png",
  "Newcastle United FC": "https://crests.football-data.org/67.png",
  "Sunderland AFC": "https://crests.football-data.org/71.png",
  "Tottenham Hotspur FC": "https://crests.football-data.org/73.png",
  "Hull City AFC": "https://crests.football-data.org/322.png",
  "Leeds United FC": "https://crests.football-data.org/341.png",
  "Ipswich Town FC": "https://crests.football-data.org/349.png",
  "Nottingham Forest FC": "https://crests.football-data.org/351.png",
  "Crystal Palace FC": "https://crests.football-data.org/354.png",
  "Brighton & Hove Albion FC": "https://crests.football-data.org/397.png",
  "Brentford FC": "https://crests.football-data.org/402.png",
  "AFC Bournemouth": "https://crests.football-data.org/bournemouth.png",
  "Coventry City FC": "https://crests.football-data.org/1076.png",
};

/**
 * Resolves a club name to its crest image URL. Returns `null` — never
 * throws — for `null` input or any club name absent from the static mapping
 * (REQ-COMPARE-012 fallback).
 */
export function getClubCrestUrl(club: string | null): string | null {
  if (club === null) {
    return null;
  }
  return CLUB_CRESTS[club] ?? null;
}
