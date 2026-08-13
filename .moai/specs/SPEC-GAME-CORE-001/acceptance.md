# Acceptance Criteria — SPEC-GAME-CORE-001

## §A. Test Strategy & Scope

Automated tests only, per `product.md` § 검증 방식: Vitest (`npm test`), TDD (test-first, RED-GREEN-REFACTOR). Coverage targets from `.moai/config/sections/quality.yaml`: 85% overall target, 80% minimum per commit. Unit tests cover `lib/game/`, `lib/korean-name-mapping/`, `lib/player-search/` first (pure logic, per `tech.md` § 테스트 방식 recommendation); integration tests cover the full guess flow (`tests/integration/guess-flow.test.ts`) and the API route boundary. External dependencies (the football data provider, Supabase) are exercised through mock/stub adapters in unit and integration tests — no test depends on a live external service.

This is the 0.3.0 revision of `acceptance.md`, rewritten to cover the attribute-comparison guesser mechanic (`spec.md` HISTORY 0.3.0) in place of the retired progressive/sequential hint-reveal mechanic. No scenario below references hint-reveal behavior.

## §B. Given-When-Then Scenarios

Minimum 2 required; 19 provided covering every requirement module in `spec.md` §B, including the full 8-guess losing round, a mid-round winning guess, the duplicate-guess-consumes-an-attempt behavior, Korean-input autocomplete + guess acceptance, and the categorical-vs-numeric-with-arrow comparison distinction.

1. **New round selects a random player from the Premier League 2026/27 pool, excluding the immediately preceding one**
   Given a Premier League 2026/27 player pool with 3 or more players and a just-completed round whose target was Player X
   When a new round starts
   Then the newly selected target player is not Player X (REQ-SELECT-002)

2. **Single-player pool allows an immediate repeat**
   Given a player pool containing exactly one player, Player Y
   When a new round starts immediately after a round whose target was also Player Y
   Then the new round's target is Player Y (REQ-SELECT-003)

3. **A submitted guess returns one comparison row covering all 5 attributes**
   Given an active round with a target player and a candidate player selected via search
   When the user submits the guess
   Then the comparison result contains exactly 5 attribute outcomes — nationality, club, position, age, and squad number — in a single result row (REQ-COMPARE-001, REQ-COMPARE-002)

4. **Categorical attribute mismatch shows incorrect with no directional indicator**
   Given a guessed player whose club differs from the target's club
   When the comparison result is computed
   Then the club attribute is shown as incorrect with no directional information attached (REQ-COMPARE-003)

5. **Numeric attribute mismatch shows incorrect plus a directional indicator**
   Given a guessed player whose age differs from the target's age
   When the comparison result is computed
   Then the age attribute is shown as incorrect, plus a directional indicator showing whether the target is older or younger than the guessed player (REQ-COMPARE-004)

6. **Every player's position is classified as exactly one of FW/MF/DF/GK**
   Given any player in the current pool, including one whose raw provider-supplied position string is more granular than the 4-value taxonomy (e.g. "Centre-Forward")
   When that player's position is used in a comparison
   Then the position value is exactly one of FW, MF, DF, or GK — never the raw provider string (REQ-COMPARE-005)

7. **A duplicate guess returns the identical comparison result and still consumes an attempt**
   Given an active round where the user has already guessed Player Z once, as attempt 2 of 8, and received a comparison result
   When the user submits Player Z again as a later guess
   Then the comparison result returned is identical to the original result for Player Z (no new information), AND the round's attempt count increments by one — e.g. becoming attempt 3 of 8 (REQ-COMPARE-006, REQ-GUESS-006)

8. **Mid-round correct guess ends the round won immediately, regardless of remaining attempts, and shows the Korean name**
   Given an active round for target player Son Heung-min, who has a Korean mapping ("손흥민"), and the user has already made 2 prior incorrect guesses (2 of 8 attempts used)
   When the user submits a guess exactly matching the target player as the 3rd attempt
   Then the round ends as won immediately and the result displays "손흥민" — the remaining 5 unused attempts are irrelevant to the win (REQ-GUESS-002, REQ-KOREAN-002)

9. **Incorrect guess with attempts remaining keeps the round active**
   Given an active round where the user has used fewer than 8 attempts
   When the user submits a guess that does not match the target player
   Then the round remains active and the user may submit another guess (REQ-GUESS-003)

10. **Full 8-guess losing round: the 8th incorrect guess ends the round lost and reveals the Korean-mapped answer**
    Given an active round where the user has submitted 7 consecutive incorrect guesses (7 of 8 attempts used)
    When the user submits an 8th guess that also does not match the target
    Then the round ends as lost, no further guesses are accepted, and the target player's identity — including the Korean-mapped name — is revealed (REQ-GUESS-004, REQ-GUESS-007)

11. **Incorrect-guess response never includes the target's identity beyond the comparison row**
    Given an active round
    When the user submits an incorrect guess
    Then the guess submission response contains only the 5-attribute comparison result, with no field identifying the target player (REQ-GUESS-005)

12. **Korean-language partial-name query returns matching autocomplete candidates**
    Given the current player pool contains "손흥민" (Son Heung-min)
    When the user types a partial Korean query, e.g. "손흥"
    Then the search/autocomplete service returns Son Heung-min as a matching candidate, selectable as the guess (REQ-SEARCH-002)

13. **Original-language / romanized search continues to work (regression check)**
    Given the current player pool contains a player with an English/romanized name
    When the user types a partial romanized query
    Then the search/autocomplete service returns the matching candidate — this pre-existing capability is not regressed by the Korean-search addition (REQ-SEARCH-003)

14. **A guess is accepted only via a selected search candidate; an unmatched query blocks submission**
    Given the user's search query matches no candidate player in the pool
    When the user attempts to submit a guess without selecting a candidate
    Then no guess is submitted, the round's attempt count does not change, and free-text input is never accepted as a valid guess (REQ-SEARCH-004, REQ-SEARCH-005)

15. **A guess resolved via Korean-name selection is compared identically to one resolved via original-language selection**
    Given two equivalent guesses for the same candidate player — one resolved by selecting a Korean-name search result, the other by selecting an original-language search result
    When each guess is submitted in an otherwise-identical round state
    Then both produce the same comparison result against the target player (REQ-SEARCH-006)

16. **Player without an existing Korean mapping falls back to the original-language name**
    Given a target player whose original-language name has no row in the Supabase mapping table
    When the system displays that player's name anywhere in the round (search candidate, comparison row, or reveal)
    Then the original-language name is shown and the round does not fail (REQ-KOREAN-003)

17. **Immediate replay starts a new round with no limit and no login**
    Given a just-completed round (won or lost)
    When the user chooses to play again
    Then a new round starts immediately, without any daily/session limit and without requiring authentication (REQ-REPLAY-001, REQ-REPLAY-002)

18. **Supabase player-data unavailability surfaces a retryable error without leaking the answer**
    Given the Supabase player-data table is unavailable or returns an error while the comparison engine or player selection service fetches attribute data for the current round
    When the affected service attempts the operation
    Then a retryable error state is surfaced and the target player's identity is not exposed (analogous to the former REQ-HINT-004 behavior, now covering the comparison/selection data path)

19. **Live gameplay never calls football-data.org directly**
    Given an active round in progress (player selection, player search, or guess submission/comparison)
    When any live gameplay request handler executes
    Then it reads player pool/attribute data only from the Supabase player-data table and makes no call to football-data.org — only the periodic sync job calls the provider (REQ-SYNC-001, REQ-SYNC-003)

## §C. Edge Cases

- Empty player pool at round start (REQ-SELECT-004) — no round starts; an empty-pool state is surfaced instead of a crash or a round with an undefined target.
- Player pool of exactly one player (Scenario 2) — duplicate avoidance cannot apply by definition; the same player may repeat, and this is correct behavior, not a bug.
- Supabase player-data table unavailable/error mid-round (Scenario 18) — must degrade to a retryable error state, not an unhandled exception or a leaked target identity.
- No Korean mapping found for the current target player (Scenario 16) — must fall back gracefully, not throw or block the round.
- Target or guessed player is missing a numeric attribute (age or squad number) in the synced data — plausible during 2026/27 pre-season roster gaps (see `plan.md` §B residual risk). REQ-COMPARE-007 requires the comparison engine to mark that attribute as unavailable rather than fail the guess; covered as a must-pass case (AC-GAME-CORE-009), not merely a should-pass note, since the residual risk is expected to materialize during pre-season weeks.
- Raw provider position string does not match any keyword in the resolved classification rule (`plan.md` §B) — the rule's explicit fallback applies (log the unmapped value, skip that player from the pool for the current sync run); the keyword list itself is validated/expanded against real API response data at run-phase milestone M3 before M4/M6/M7 begin consuming position data. This SPEC fixes both the invariant that the OUTPUT is always one of the 4 canonical values (REQ-COMPARE-005) and the fallback behavior for an unmapped INPUT string.
- Sync job has not yet run / the Supabase player-data table is empty at fresh deployment — falls back to the REQ-SELECT-004 empty-pool state (no round starts) until the first sync job run populates the table; this is consistent existing behavior, not a new failure mode.
- Rapid repeated guess submissions for the same round (double-submit) — not a hard requirement in spec.md; recorded here as a forward-looking check (§D.6), not a must-pass AC for this SPEC.
- 8-guess attempt cap bypass attempt (e.g. a client sending a 9th guess after the round already ended lost) — the server-side guess submission service (REQ-GUESS-007, `plan.md` §D constraint) must reject it; covered by AC-GAME-CORE-013's server-side enforcement expectation, not merely a client-side UI disablement.

## §D. AC Matrix

### §D.1 AC Table

| AC ID | REQ Trace | Description | Verification Method |
|-------|-----------|--------------|----------------------|
| AC-GAME-CORE-001 | REQ-SELECT-001, 002 | Random selection from the PL 2026/27 pool excludes the immediately preceding round's target (pool size ≥ 2) | Unit test — `lib/game/player-selector.ts`, seeded RNG or repeated-sampling assertion |
| AC-GAME-CORE-002 | REQ-SELECT-003 | Pool size 1 allows immediate repeat | Unit test |
| AC-GAME-CORE-003 | REQ-SELECT-004 | Empty pool does not start a round | Unit test |
| AC-GAME-CORE-004 | REQ-COMPARE-001, 002 | A submitted guess returns one comparison row covering exactly 5 attributes | Unit test — `lib/game/comparison-engine.ts` |
| AC-GAME-CORE-005 | REQ-COMPARE-003 | Categorical attributes (nationality/club/position) return correct/incorrect only, no direction | Unit test |
| AC-GAME-CORE-006 | REQ-COMPARE-004 | Numeric attributes (age/squad number) return a directional indicator on mismatch | Unit test |
| AC-GAME-CORE-007 | REQ-COMPARE-005 | Every player's position is classified as exactly one of FW/MF/DF/GK | Unit test against a mock provider fixture with a granular raw position string |
| AC-GAME-CORE-008 | REQ-COMPARE-006, REQ-GUESS-006 | Duplicate guess returns the identical comparison result and still consumes an attempt | Integration test — `tests/integration/guess-flow.test.ts` |
| AC-GAME-CORE-009 | REQ-COMPARE-007 | Missing/incomplete synced attribute data is marked unavailable in the comparison result, does not fail the guess | Unit test — mock Supabase fixture with a null age/squad-number field |
| AC-GAME-CORE-010 | REQ-GUESS-001 | Guess submission records an attempt and invokes the comparison engine | Unit test — response shape assertion |
| AC-GAME-CORE-011 | REQ-GUESS-002 | Correct guess ends the round won immediately at any attempt count, Korean name shown | Integration test |
| AC-GAME-CORE-012 | REQ-GUESS-003 | Incorrect guess with attempts remaining keeps the round active | Integration test |
| AC-GAME-CORE-013 | REQ-GUESS-004, REQ-GUESS-007 | 8th incorrect guess ends the round lost, reveals the Korean-mapped answer; 8-guess cap is enforced server-side | Integration test — full 8-guess losing round, plus a unit test asserting server-side rejection of a 9th guess |
| AC-GAME-CORE-014 | REQ-GUESS-005 | Incorrect-guess response never contains the target identity beyond the comparison row | Unit test — response shape assertion |
| AC-GAME-CORE-015 | REQ-KOREAN-001, 002 | Korean-mapped name displayed in search candidates, comparison rows, and reveal whenever a mapping exists | Unit test — `mapper.ts` |
| AC-GAME-CORE-016 | REQ-KOREAN-003 | Fallback to original-language name when no mapping exists | Unit test |
| AC-GAME-CORE-017 | REQ-KOREAN-004 | One-time seed bootstrap populates the Supabase table from the seed JSON | Integration test against a test Supabase instance/mock, run once |
| AC-GAME-CORE-018 | REQ-KOREAN-005 | Runtime resolution reads Supabase, not the seed file, after seeding | Static check (§D.4) + unit test asserting no seed-file import outside the bootstrap script |
| AC-GAME-CORE-019 | REQ-SEARCH-001, 002 | Korean-language partial query returns matching autocomplete candidates | Unit test — `lib/player-search/`, mock Supabase + mapping fixture |
| AC-GAME-CORE-020 | REQ-SEARCH-003 | Original-language/romanized query continues to return matching candidates (regression) | Unit test |
| AC-GAME-CORE-021 | REQ-SEARCH-004, 005 | Guess accepted only via a selected candidate; unmatched query blocks submission, no free text accepted | Unit test + integration test — reject path |
| AC-GAME-CORE-022 | REQ-SEARCH-006 | Korean-selected guess treated identically to original-language-selected guess | Integration test — equivalence assertion |
| AC-GAME-CORE-023 | REQ-REPLAY-001 | New round startable immediately after any round ends, no daily/session limit | Integration test |
| AC-GAME-CORE-024 | REQ-REPLAY-002 | Full round playable with no authentication | Integration test |
| AC-GAME-CORE-025 | REQ-REPLAY-003 | Duplicate-avoidance reapplied on immediate replay | Integration test (composes AC-GAME-CORE-001) |
| AC-GAME-CORE-026 | REQ-NFR-001 | Provider API key never present in client-reachable code/response | Static grep check (§D.4), not a runtime test |
| AC-GAME-CORE-027 | REQ-SYNC-001 | No live gameplay handler or API route (including the player search module) imports/calls `lib/football-api/` directly | Static grep check (`plan.md` §E) |
| AC-GAME-CORE-028 | REQ-SYNC-002 | Sync job fetches the PL 2026/27 pool + attribute data (including age, squad number) via the `FootballDataProvider` abstraction and writes/refreshes the Supabase player-data table | Integration test against a mock provider adapter + a test Supabase instance/mock |
| AC-GAME-CORE-029 | REQ-SYNC-003 | Player selection, player search, and comparison engine source pool/attribute data exclusively from Supabase | Unit test — assert no direct provider call from any live-path module |

### §D.2 Severity Classification

- **Must-pass (blocks Definition of Done):** AC-GAME-CORE-001 through 016, 018 through 027, and 029 (27 of 29 rows) — every core-loop, comparison-engine, guess-submission, search/autocomplete, Korean-mapping-resolution, replay, and sync-sourcing-boundary behavior, plus the API-key-protection check.
- **Should-pass (recorded, non-blocking for this SPEC's closure if deferred with justification):** AC-GAME-CORE-017 (the one-time seed bootstrap integration test may depend on a test Supabase instance being available in CI/local — if unavailable at run-phase, a manual verification note plus a follow-up ticket is an acceptable substitute, but the seed script itself must still exist and be unit-testable in isolation); AC-GAME-CORE-028 (the sync-job integration test carries the same test-Supabase-instance dependency as AC-GAME-CORE-017 — the same substitution path applies, but the sync job itself must still exist and be unit-testable against the mock `FootballDataProvider` adapter in isolation).

### §D.3 Traceability (REQ → AC → Test)

Every REQ-* ID in `spec.md` §B has at least one AC row in §D.1 OR an indirect-verification entry in §D.4; every AC row names its verification method, and every indirect-verification entry names its verification path. No REQ in spec.md §B is left without either. REQ-NFR-002 (coverage), REQ-NFR-003 (Korean mapping independent of provider availability), and REQ-NFR-004 (live gameplay concurrency independent of the football data provider's rate limit) are verified indirectly — see §D.4. This is a two-tier verification model — §D.1 direct AC rows for requirements observable via a dedicated test, §D.4 indirect entries for requirements verified structurally or as a byproduct of other tests — not a contradiction between the two sections.

### §D.4 Indirect Verification

Some requirements are not directly observable via a single unit test and are instead verified structurally:

- **REQ-NFR-001 (API key never client-exposed):** verified via the `grep -rn "process.env"` static check in `plan.md` §E, plus a build-artifact/bundle inspection confirming no literal key string appears in client-bundled code — not a runtime assertion.
- **REQ-NFR-002 (coverage thresholds):** verified via the Vitest coverage report at closure (§E below), not a per-scenario test.
- **REQ-NFR-003 (Korean mapping independent of provider availability):** verified by running the Korean-mapping unit tests (AC-GAME-CORE-015, 016) with the football-data mock adapter fully disabled/unconfigured, confirming no runtime dependency between the two modules.
- **REQ-NFR-004 (live gameplay concurrency independent of the football data provider's rate limit):** verified indirectly via AC-GAME-CORE-027 (the static grep check confirming no live gameplay handler, including player search, imports `lib/football-api/` directly) — since no live handler ever calls the provider, concurrent player capacity cannot be bounded by the provider's rate limit by construction.
- **REQ-KOREAN-005 (Supabase as sole runtime source):** verified by the static import-boundary grep in `plan.md` §E confirming `data/korean-name-seed.json` is imported only by the seed script.

### §D.5 Closure Gates

All of the following must hold before this SPEC's run-phase is considered complete:

- Every must-pass AC (§D.2) is PASS, with test output as evidence.
- Vitest coverage report shows ≥ 80% for the commit and the run trends toward the 85% overall target (`quality.yaml`).
- `npx tsc --noEmit` and `npx eslint .` both clean (zero errors).
- No Out-of-Scope item (spec.md §D) appears in the diff (no login/auth code, no leaderboard table or endpoint, no score-history persistence, no non-football sport handling, no photo/picture-guessing mode, no multi-league or non-2026/27-season data sourcing).
- The static checks in §D.4 pass (no literal API key, no runtime seed-file import).
- No live gameplay request handler (player selection, player search, guess submission, or their `app/api/` routes) imports or calls `lib/football-api/` directly — verified by the static grep check in `plan.md` §E (REQ-SYNC-001, AC-GAME-CORE-027).
- The `plan.md` §E residual-hint-terminology grep (`grep -rin "hint" lib/ app/ types/`) returns zero matches, confirming the 0.3.0 mechanic replacement left no stale naming in implemented code.
- The position-taxonomy keyword-classification rule (`plan.md` §B) is implemented per REQ-COMPARE-005, with its keyword list validated/expanded against real football-data.org response data at M3 (`plan.md` §F) before this closure gate is considered met.

### §D.6 Forward-Looking Checks

Recorded for future SPECs — verifying these are NOT accidentally implemented now (scope-creep guard), not requirements of this SPEC:

- No leaderboard table, ranking query, or endpoint exists in the Supabase schema or `app/api/`.
- No auth/session middleware, cookie, or login route exists.
- No weighted/difficulty-based selection logic exists beyond the plain random + duplicate-avoidance rule (REQ-SELECT-001..004).
- No real-time/live polling of football-data.org exists beyond the periodic M4 sync job — live gameplay never calls the provider directly (REQ-SYNC-001).
- No photo/image-based guessing mode exists anywhere in the codebase.
- No player data for any league other than the Premier League, or any season other than 2026/27, is fetched or stored.
- Rapid double-submit guess handling (§C edge case) remains unaddressed — acceptable for this SPEC; flag as a candidate follow-up if observed in practice.

### §D.7 Definition of Done

- All must-pass AC rows in §D.1/§D.2 are PASS with cited test evidence.
- §D.5 closure gates all hold.
- A manual smoke test of one full round succeeds locally against the mock provider adapter, covering both outcomes: (a) a win via a mid-round correct guess, and (b) a loss via 8 consecutive incorrect guesses — start → search/select a guess → comparison result → repeat → win-or-loss reveal → immediate replay.
- `plan.md` §E self-verification command batch has been run and its output cited as evidence (per `.claude/rules/moai/core/verification-claim-integrity.md` — no unobserved completion claim).

## §E. Quality Gate Criteria

- TRUST 5: Tested (§D above), Readable (ESLint clean, clear naming per `structure.md` module boundaries), Unified (Prettier/ESLint formatting consistent across `lib/`, `app/`, `components/`), Secured (REQ-NFR-001 API key boundary; Supabase anon key used only with an appropriately scoped table policy — a run-phase implementation detail, not a spec requirement), Trackable (Conventional Commit messages per `git-convention.yaml`, TDD commit-per-cycle discipline).
- Coverage: 85% target / 80% minimum per commit, verified via the Vitest coverage report (§D.5).
