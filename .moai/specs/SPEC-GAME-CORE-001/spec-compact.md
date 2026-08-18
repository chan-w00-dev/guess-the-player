# SPEC-GAME-CORE-001 (Compact)

> Auto-generated compact extract of `spec.md` for run-phase context loading (~30% token savings vs full spec.md). Excludes Overview, technical approach, and research references — see `spec.md` for full context and `plan.md` for the technical approach / known-issues notes.
>
> **0.3.0 revision**: mirrors the major mechanic replacement in `spec.md` — the progressive/sequential hint-reveal mechanic is fully retired and replaced with a per-guess attribute comparison engine, an 8-guess attempt cap, and a Korean-language + original-language search/autocomplete module. Player pool narrowed to the Premier League, 2026/27 season. See `spec.md` HISTORY for the full rationale (design reference: `https://playfootball.games/who-are-ya/premier-league/`).
>
> **0.4.0 revision**: squad number dropped as a compared/synced attribute (4 attributes: nationality, club, position, age) — football-data.org's free tier confirmed to provide no shirt/squad-number data on any accessible endpoint. Age computation corrected to calendar-year-only (Korean "연 나이" convention, no birthday adjustment). See `spec.md` HISTORY 0.4.0 for the full rationale.
>
> **0.5.0 revision**: squad number **reinstated** as the 5th compared/synced attribute (nationality, club, position, age, squad number — the current, live attribute count), sourced via a manual entry process keyed by player id (REQ-SYNC-004/005) rather than sync from football-data.org, since the user runs a self-hosted Supabase database and is willing to maintain squad numbers manually. New REQ-SELECT-005 restricts the target-player selection pool to players having both a Korean name mapping and a registered squad number. See `spec.md` HISTORY 0.5.0.
>
> **0.6.0 revision**: adds a new §B.8 requirement module, REQ-REVIEW-001..003 — a combined CSV review-export/review-import workflow covering both manually-maintained columns (Korean name, squad number) together, id-keyed, additive to the existing REQ-KOREAN-004 seed process and the 0.5.0 REQ-SYNC-004/005 manual entry mechanism (both remain valid, unchanged). See `spec.md` HISTORY 0.6.0.
>
> **review-6.md D4 defect-fix pass (2026-08-18)**: adds REQ-NFR-005 (Supabase player-data unavailability during live gameplay) to close a traceability gap the plan-audit found in `acceptance.md` Scenario 18. Version remains 0.6.0 — this is a defect fix, not a new revision.

## Requirements (GEARS)

### Player Selection & Duplicate Avoidance (Premier League, 2026/27 Season)
- REQ-SELECT-001 (Ubiquitous): The player selection service shall select a target player at random from the Premier League 2026/27 season player pool at the start of every round.
- REQ-SELECT-002 (When): When a new round starts and the pool has more than one player, the player selection service shall exclude the immediately preceding round's target player from selection.
- REQ-SELECT-003 (While): While the player pool contains exactly one player, the player selection service shall select that player even if it repeats the preceding round's target.
- REQ-SELECT-004 (When/unwanted): When the player pool is empty, the system shall not start a new round and shall surface an empty-pool state.
- REQ-SELECT-005 (Ubiquitous, added 0.5.0): The player selection service shall restrict the target-player selection pool at every round start to players having both a Korean name mapping (REQ-KOREAN-001) and a registered squad number (REQ-SYNC-004).

### Attribute Comparison Engine
- REQ-COMPARE-001 (Ubiquitous): The comparison engine shall compare a submitted guess player against the target player across exactly 5 attributes: nationality, club, position, age, and squad number.
- REQ-COMPARE-002 (When): When a user submits a guess, the comparison engine shall evaluate all 5 attributes and return one comparison result row.
- REQ-COMPARE-003 (Ubiquitous): For the categorical attributes (nationality, club, position), the comparison engine shall return exactly correct/incorrect, with no directional information.
- REQ-COMPARE-004 (When): When the guessed player's value for a numeric attribute (age or squad number) does not match the target's value, the comparison engine shall additionally return a directional indicator showing whether the target's value is higher or lower than the guessed player's.
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
- REQ-SYNC-002 (When): When the periodic sync job runs, it shall fetch the Premier League 2026/27 season player pool and attribute data — including nationality, club, position, and age — from the resolved external football data provider and write/refresh the Supabase player-data table.
- REQ-SYNC-003 (Ubiquitous): The player selection service, player search service, and comparison engine shall source all player pool/attribute data exclusively from the Supabase player-data table at request-handling time.
- REQ-SYNC-004 (Ubiquitous, added 0.5.0): Squad number values in the Supabase player-data table shall be populated exclusively via a manual entry process keyed by player id — not via the periodic sync job — because the resolved provider does not supply shirt/squad-number data on its free tier.
- REQ-SYNC-005 (When/unwanted, added 0.5.0): When the periodic sync job runs, it shall not write to or overwrite the `squad_number` column of the Supabase player-data table, so that a manually-entered squad number is never wiped out by a subsequent sync run.

### Combined Player-Data Review Export/Import (CSV, added 0.6.0)
- REQ-REVIEW-001 (Ubiquitous): The player-data review export capability shall produce a CSV file with one row per player in the current Premier League 2026/27 pool, columns `id, name, nationality, club, age, koreanName, squadNumber` — the first five columns populated from synced data (and, where a mapping exists, the Korean name mapping table), and `koreanName`/`squadNumber` populated with the player's current value when one exists or left blank otherwise.
- REQ-REVIEW-002 (When): When the review-import capability runs against a CSV produced by REQ-REVIEW-001 and subsequently edited, it shall, for each row with a non-blank `koreanName`, upsert that value into the Korean name mapping table keyed by the row's `id`, and for each row with a non-blank numeric `squadNumber`, update the players table's `squad_number` column keyed by the row's `id`.
- REQ-REVIEW-003 (When/unwanted): When a row in the imported CSV has a blank `koreanName` or `squadNumber` cell, the review-import capability shall not write an empty/null value for that field and shall leave any existing stored value unchanged.

### Non-Functional
- REQ-NFR-001 (unwanted): The system shall not expose the football data provider's API key to the client; the API key is accessible only within the periodic sync job's server-side execution context, never in client-shipped code or a live gameplay request handler.
- REQ-NFR-002 (Ubiquitous): Automated tests shall verify every requirement module, targeting 85% overall / 80% minimum-per-commit coverage (`quality.yaml`).
- REQ-NFR-003 (Ubiquitous): Korean name resolution shall remain available independent of the football data provider's availability.
- REQ-NFR-004 (Ubiquitous): Live gameplay concurrency shall be bounded only by Supabase/Next.js capacity, not by the football data provider's rate limit — no live handler (including search) calls the provider directly (REQ-SYNC-001/003).
- REQ-NFR-005 (When/unwanted, added in the review-6.md D4 defect-fix pass): When the Supabase player-data table is unavailable or errors during a live gameplay request (player selection or guess submission/comparison), the affected service shall surface a retryable error state and shall not expose the target player's identity.

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
18. Supabase player-data unavailability surfaces a retryable error, no identity leak — REQ-NFR-005
19. Live gameplay never calls football-data.org directly (sync-job-only sourcing) — REQ-SYNC-001/003
20. Squad number mismatch shows incorrect plus a directional indicator (reinstated 0.5.0) — REQ-COMPARE-004
21. A manually-entered squad number is never overwritten by the periodic sync job (0.5.0) — REQ-SYNC-004/005
22. Target-player selection pool is restricted to fully-registered players — Korean mapping + squad number (0.5.0) — REQ-SELECT-005
23. Review-export produces a CSV with the expected columns and pre-filled known-attribute values (0.6.0) — REQ-REVIEW-001
24. Review-import upserts a filled koreanName cell and updates a filled squadNumber cell, keyed by id (0.6.0) — REQ-REVIEW-002
25. Review-import skips blank koreanName/squadNumber cells rather than overwriting (0.6.0) — REQ-REVIEW-003

Full GWT prose, edge cases, AC matrix (severity/traceability/closure gates/DoD, including AC-GAME-CORE-036): see `acceptance.md` §B-§D.

## Files to Modify (proposed; some already delivered — see `progress.md` §E.2 for run-phase evidence)

- `types/player.ts`, `types/comparison.ts`
- `lib/football-api/client.ts`, `lib/football-api/types.ts`, `lib/football-api/football-data-org-provider.ts`, `lib/football-api/mock-provider.ts`, `lib/football-api/age.ts`
- `lib/korean-name-mapping/mapper.ts`, `lib/korean-name-mapping/types.ts`
- `lib/player-search/search.ts`, `lib/player-search/types.ts` (core differentiator, Korean + original-language autocomplete)
- `lib/supabase/client.ts`
- `lib/game/player-selector.ts`, `lib/game/comparison-engine.ts` (replaces the retired `hint-engine.ts`), `lib/game/guess-service.ts` (replaces `answer-checker.ts`)
- `lib/player-data-sync/sync.ts`, `lib/player-data-sync/types.ts` (periodic sync job — sole caller of `lib/football-api/`; fetches nationality/club/position/age, never squad number)
- `lib/squad-number/` (`types.ts`, `update.ts`, `supabase-adapter.ts`, `index.ts`) + `scripts/update-squad-numbers.ts` — id-keyed manual squad-number entry mechanism (REQ-SYNC-004/005, 0.5.0)
- `lib/csv/` (`parse.ts`, `write.ts`, `index.ts`) — dependency-free RFC4180-lite CSV parse/write utility (0.6.0)
- `lib/player-review/` (`types.ts`, `export.ts`, `import.ts`, `supabase-adapter.ts`, `index.ts`) + `scripts/export-players-for-review.ts` + `scripts/import-players-review.ts` — combined CSV review-export/review-import workflow (REQ-REVIEW-001..003, 0.6.0); the import script reuses the existing Korean-name-mapping upsert and `runSquadNumberUpdate` rather than writing Supabase directly
- `supabase/migrations/0004_add_squad_number_column.sql` — idempotent re-add of the `squad_number` column (0.5.0)
- `app/api/player/random/route.ts`, `app/api/player/search/route.ts`, `app/api/guess/route.ts`
- `app/page.tsx`, `app/layout.tsx`, `app/globals.css`
- `components/game/GameBoard.tsx`, `GuessSearchInput.tsx` (replaces `GuessInput.tsx`), `ComparisonTable.tsx` (replaces `HintPanel.tsx`), `AttemptCounter.tsx`, `ResultModal.tsx`
- `data/korean-name-seed.json`
- `tests/unit/korean-name-mapping.test.ts`, `tests/unit/comparison-engine.test.ts` (replaces `hint-engine.test.ts`), `tests/unit/player-selector.test.ts`, `tests/unit/guess-service.test.ts`, `tests/unit/player-search.test.ts`, `tests/unit/player-data-sync.test.ts`, `tests/unit/squad-number/`, `tests/unit/player-review/`
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
- An admin UI or hosted CRUD API for editing squad numbers — remains out of scope regardless of mechanism (the REQ-SYNC-004 per-player script, or the REQ-REVIEW-001..003 CSV round-trip); the id-keyed CSV round-trip CLI workflow itself is explicitly **permitted** as of 0.6.0 (narrowed from the 0.5.0 blanket bulk-import prohibition) — only a web-based/hosted admin surface remains excluded
- Project scaffolding, CI/CD, and deployment configuration as SPEC requirements (infrastructure prerequisite only — see `plan.md` §C)

See `spec.md` §D for full Out of Scope detail.
