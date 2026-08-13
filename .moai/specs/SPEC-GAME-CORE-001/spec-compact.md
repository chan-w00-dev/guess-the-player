# SPEC-GAME-CORE-001 (Compact)

> Auto-generated compact extract of `spec.md` for run-phase context loading (~30% token savings vs full spec.md). Excludes Overview, technical approach, and research references — see `spec.md` for full context and `plan.md` for the technical approach / known-issues notes.
>
> **0.3.0 revision**: mirrors the major mechanic replacement in `spec.md` — the progressive/sequential hint-reveal mechanic is fully retired and replaced with a per-guess 5-attribute comparison engine, an 8-guess attempt cap, and a Korean-language + original-language search/autocomplete module. Player pool narrowed to the Premier League, 2026/27 season. See `spec.md` HISTORY for the full rationale (design reference: `https://playfootball.games/who-are-ya/premier-league/`).

## Requirements (GEARS)

### Player Selection & Duplicate Avoidance (Premier League, 2026/27 Season)
- REQ-SELECT-001 (Ubiquitous): The player selection service shall select a target player at random from the Premier League 2026/27 season player pool at the start of every round.
- REQ-SELECT-002 (When): When a new round starts and the pool has more than one player, the player selection service shall exclude the immediately preceding round's target player from selection.
- REQ-SELECT-003 (Where): Where the pool contains exactly one player, the player selection service shall select that player even if it repeats the preceding round's target.
- REQ-SELECT-004 (When/unwanted): When the player pool is empty, the system shall not start a new round and shall surface an empty-pool state.

### Attribute Comparison Engine
- REQ-COMPARE-001 (Ubiquitous): The comparison engine shall compare a submitted guess player against the target player across exactly 5 attributes: nationality, club, position, age, squad number.
- REQ-COMPARE-002 (When): When a user submits a guess, the comparison engine shall evaluate all 5 attributes and return one comparison result row.
- REQ-COMPARE-003 (Ubiquitous): For the categorical attributes (nationality, club, position), the comparison engine shall return exactly correct/incorrect, with no directional information.
- REQ-COMPARE-004 (Ubiquitous): For the numeric attributes (age, squad number), a mismatch shall additionally return a directional indicator (target higher or lower than the guess).
- REQ-COMPARE-005 (Ubiquitous): The comparison engine shall classify every player's position as exactly one of FW, MF, DF, or GK.
- REQ-COMPARE-006 (When): When a user re-submits a guess for a player already guessed this round, the comparison engine shall return the same result as the original guess.
- REQ-COMPARE-007 (When/unwanted): When synced attribute data is incomplete for one of the 5 attributes, the comparison engine shall mark that attribute as unavailable and shall not fail the guess.

### Guess Submission & Attempt Cap
- REQ-GUESS-001 (When): When a user submits a guess selected via search, the guess submission service shall record it as an attempt and invoke the comparison engine.
- REQ-GUESS-002 (When): When a guess matches the target, the system shall end the round as won immediately, regardless of remaining attempts, and display the result with the Korean-mapped name.
- REQ-GUESS-003 (When): When a guess does not match and the attempt count is below 8, the system shall keep the round active.
- REQ-GUESS-004 (When): When a guess does not match and the attempt count reaches 8, the system shall end the round as lost and reveal the target's identity, including the Korean-mapped name.
- REQ-GUESS-005 (When/unwanted): When a guess is incorrect, the guess submission service shall not include the target player's identity beyond the comparison result.
- REQ-GUESS-006 (When): When a user re-submits a guess for a player already guessed this round, the guess submission service shall still increment the attempt count by one.
- REQ-GUESS-007 (Ubiquitous): The system shall cap the number of guesses per round at exactly 8.

### Korean Player-Name Mapping
- REQ-KOREAN-001 (Ubiquitous): The Korean name mapping service shall resolve original-language names to Korean media-convention names using the Supabase mapping table as the runtime source of truth.
- REQ-KOREAN-002 (When): When the system displays a player's name in a search candidate, a comparison row, or a round's final reveal, it shall show the Korean-mapped name whenever a mapping exists.
- REQ-KOREAN-003 (When/unwanted): When no Korean mapping exists for the target player, the system shall fall back to the original-language name without failing the round.
- REQ-KOREAN-004 (Where): Where the Supabase mapping table is empty at first deployment, a one-time local seed process shall populate it from the bundled seed dataset.
- REQ-KOREAN-005 (Ubiquitous): The Korean name mapping service shall treat Supabase, not the local seed dataset, as the authoritative runtime source after the initial seed.

### Player Search & Autocomplete (core differentiator)
- REQ-SEARCH-001 (Ubiquitous): The player search service shall provide autocomplete candidate matching against the current Premier League 2026/27 player pool as the user types.
- REQ-SEARCH-002 (When): When a user types a Korean-language query, the player search service shall return matching candidates by their Korean-mapped name.
- REQ-SEARCH-003 (When): When a user types an original-language/romanized query, the player search service shall return matching candidates by their original-language name.
- REQ-SEARCH-004 (Ubiquitous): The guess submission flow shall accept only a candidate selected from search results, not free-text input.
- REQ-SEARCH-005 (When/unwanted): When a query matches no candidate, the search service shall return an empty result and the guess submission flow shall not accept a guess until a valid candidate is selected.
- REQ-SEARCH-006 (Ubiquitous): A guess resolved via Korean-name selection shall be treated identically to one resolved via original-language selection.

### Unlimited Replay
- REQ-REPLAY-001 (Ubiquitous): The system shall allow a new round immediately after any round ends, with no daily or session-based play limit.
- REQ-REPLAY-002 (Ubiquitous): The system shall allow a full round to be played with no account creation or authentication.
- REQ-REPLAY-003 (When): When a user starts a new round immediately after a completed round, the player selection service shall apply duplicate-avoidance against the just-completed round's target.

### Player Data Sourcing & Sync (Premier League, 2026/27 Season)
- REQ-SYNC-001 (Unwanted): The system shall not call the external football data provider from any live gameplay request handler (selection, search, guess submission); all provider calls shall originate only from the periodic sync job.
- REQ-SYNC-002 (When): When the periodic sync job runs, it shall fetch the Premier League 2026/27 season player pool and attribute data — including nationality, club, position, age, and squad number — from the resolved external football data provider and write/refresh the Supabase player-data table.
- REQ-SYNC-003 (Ubiquitous): The player selection service, player search service, and comparison engine shall source all player pool/attribute data exclusively from the Supabase player-data table at request-handling time.

### Non-Functional
- REQ-NFR-001 (unwanted): The system shall not expose the football data provider's API key to the client; the API key is accessible only within the periodic sync job's server-side execution context, never in client-shipped code or a live gameplay request handler.
- REQ-NFR-002 (Ubiquitous): Automated tests shall verify every requirement module, targeting 85% overall / 80% minimum-per-commit coverage (`quality.yaml`).
- REQ-NFR-003 (Ubiquitous): Korean name resolution shall remain available independent of the football data provider's availability.
- REQ-NFR-004 (Ubiquitous): Live gameplay concurrency shall be bounded only by Supabase/Next.js capacity, not by the football data provider's rate limit — no live handler (including search) calls the provider directly (REQ-SYNC-001/003).

## Acceptance Criteria (Given-When-Then)

1. New round excludes the immediately preceding target (PL 2026/27 pool, size ≥ 2) — REQ-SELECT-002
2. Pool of exactly 1 player allows an immediate repeat — REQ-SELECT-003
3. A guess returns one comparison row covering all 5 attributes — REQ-COMPARE-001/002
4. Categorical mismatch shows incorrect, no direction — REQ-COMPARE-003
5. Numeric mismatch shows incorrect plus a directional indicator — REQ-COMPARE-004
6. Position always classified as FW/MF/DF/GK — REQ-COMPARE-005
7. Duplicate guess returns the identical result and still consumes an attempt — REQ-COMPARE-006/REQ-GUESS-006
8. Mid-round correct guess ends the round won immediately, shows Korean-mapped name — REQ-GUESS-002/REQ-KOREAN-002
9. Incorrect guess with attempts remaining keeps the round active — REQ-GUESS-003
10. Full 8-guess losing round: 8th incorrect guess ends the round lost, reveals the answer — REQ-GUESS-004/REQ-GUESS-007
11. Incorrect-guess response never includes the target's identity beyond the comparison row — REQ-GUESS-005
12. Korean-language partial query returns matching autocomplete candidates — REQ-SEARCH-002
13. Original-language/romanized search continues to work (regression) — REQ-SEARCH-003
14. Guess accepted only via a selected candidate; unmatched query blocks submission — REQ-SEARCH-004/005
15. Korean-selected guess compared identically to original-language-selected guess — REQ-SEARCH-006
16. No Korean mapping found: falls back to original-language name — REQ-KOREAN-003
17. Immediate replay starts a new round, no limit, no login — REQ-REPLAY-001/002
18. Supabase player-data unavailability surfaces a retryable error, no identity leak — REQ-COMPARE/REQ-SYNC data path
19. Live gameplay never calls football-data.org directly (sync-job-only sourcing) — REQ-SYNC-001/003

Full GWT prose, edge cases, AC matrix (severity/traceability/closure gates/DoD): see `acceptance.md` §B-§D.

## Files to Modify (proposed, greenfield — all NEW)

- `types/player.ts`, `types/comparison.ts`
- `lib/football-api/client.ts`, `lib/football-api/types.ts`
- `lib/korean-name-mapping/mapper.ts`, `lib/korean-name-mapping/types.ts`
- `lib/player-search/search.ts`, `lib/player-search/types.ts` (NEW — core differentiator, Korean + original-language autocomplete)
- `lib/supabase/client.ts`
- `lib/game/player-selector.ts`, `lib/game/comparison-engine.ts` (NEW, replaces the retired `hint-engine.ts`), `lib/game/guess-service.ts` (replaces `answer-checker.ts`)
- `lib/player-data-sync/sync.ts` (periodic sync job — sole caller of `lib/football-api/`; now also fetches age + squad number)
- `app/api/player/random/route.ts`, `app/api/player/search/route.ts` (NEW), `app/api/guess/route.ts`
- `app/page.tsx`, `app/layout.tsx`, `app/globals.css`
- `components/game/GameBoard.tsx`, `GuessSearchInput.tsx` (NEW, replaces `GuessInput.tsx`), `ComparisonTable.tsx` (NEW, replaces `HintPanel.tsx`), `AttemptCounter.tsx` (NEW), `ResultModal.tsx`
- `data/korean-name-seed.json`
- `tests/unit/korean-name-mapping.test.ts`, `tests/unit/comparison-engine.test.ts` (replaces `hint-engine.test.ts`), `tests/unit/player-selector.test.ts`, `tests/unit/guess-service.test.ts`, `tests/unit/player-search.test.ts` (NEW)
- `tests/unit/player-data-sync.test.ts`
- `tests/integration/guess-flow.test.ts`
- Scaffold: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `vitest.config.ts` (see `plan.md` §C Pre-flight)

## Exclusions (What NOT to Build)

- User registration, login, or any authentication flow
- Personal play/score history persistence
- Leaderboards or ranking of any kind
- Friend competition or any multi-user social feature
- Any sport other than football
- Photo- or picture-based guessing mode (the reference site's separate "guess the footballer from the picture" mode is NOT built — this product is attribute-comparison-only, text/search-based)
- Any league other than the Premier League, or any season other than 2026/27 (deferred to a future SPEC)
- Rule-based/weighted player selection or selection-history beyond the single-preceding-round duplicate-avoidance rule
- Korean-mapping admin UI/CRUD beyond the one-time seed process
- Project scaffolding, CI/CD, and deployment configuration as SPEC requirements (infrastructure prerequisite only — see `plan.md` §C)

See `spec.md` §D for full Out of Scope detail.
