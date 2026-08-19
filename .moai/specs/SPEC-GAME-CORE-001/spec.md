---
id: SPEC-GAME-CORE-001
title: "Guess-the-Player Game Core Loop with Korean Player-Name Mapping"
version: "0.6.0"
status: completed
created: 2026-08-13
updated: 2026-08-19
author: chan-w00-dev
priority: P1
phase: "v0.1.0 MVP"
module: "lib/game, lib/korean-name-mapping, lib/player-search, lib/football-api, lib/player-data-sync, app/api"
lifecycle: spec-anchored
tags: "game-loop, korean-name-mapping, comparison-engine, search-autocomplete, guess-validation, supabase, sync-job, tdd, premier-league, squad-number"
tier: M
---

# SPEC-GAME-CORE-001: Guess-the-Player Game Core Loop with Korean Player-Name Mapping

## HISTORY

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 0.1.0 | 2026-08-13 | chan-w00-dev (via manager-spec) | Initial draft — first SPEC for guess-the-player. Bundles the game core loop and Korean player-name mapping as one SPEC per user-confirmed scope decision. |
| 0.2.0 | 2026-08-13 | chan-w00-dev (via manager-spec) | Revision addressing plan-auditor iteration-1 findings (`SPEC-GAME-CORE-001-review-1.md`): (1) resolved the football-data.org provider decision, removing the then-open needs-clarification item (MP-7 fix); (2) added the player-data sync/caching architecture — football-data.org is called only by a periodic sync job, never by live gameplay handlers — as new REQ-SYNC-001..003 (§B.6) and REQ-NFR-004, with REQ-HINT-003/004 amended to source from Supabase instead of the provider directly. |
| 0.2.1 | 2026-08-13 | chan-w00-dev (via manager-spec) | Retroactive currency fix for the D3-D6 wording/consistency corrections applied ahead of plan-auditor iteration-3 (`SPEC-GAME-CORE-001-review-3.md` D-NEW-1): REQ-SYNC-002 and REQ-NFR-001 were reworded to remove implementation-level naming leakage; `plan.md` §D/§F reconciled to the sync-job-only architecture consistently. This row documents that fix retroactively — content was already applied when iteration-3 scored the SPEC PASS (0.89), but the version/HISTORY marker had not been bumped to reflect it. |
| 0.3.0 | 2026-08-14 | chan-w00-dev (via manager-spec) | **MAJOR revision — core mechanic replaced.** Following plan-auditor iteration-3 PASS (0.89) under the old mechanic, the user provided a concrete reference game — ["Who Are Ya?"](https://playfootball.games/who-are-ya/premier-league/), a Wordle/Poeltl-style daily attribute-comparison guesser — clarifying that the actual desired gameplay is fundamentally different from what was specified. This is a genuine, user-confirmed requirements change, not a wording tweak or an audit failure. Replaced the progressive/sequential hint-reveal mechanic (the entire REQ-HINT requirement series — 5 items — removed in full) with a 5-attribute comparison engine evaluated per guess: **REQ-COMPARE-001..007** (nationality/club/position categorical match; age/squad-number numeric match with a directional indicator on mismatch; position classified as exactly one of FW/MF/DF/GK; duplicate-guess idempotent result; graceful handling of incomplete synced attribute data). Added **REQ-SEARCH-001..006** — a new Korean-language + original-language search/autocomplete module that resolves every guess to a selected candidate player (no free-text guesses), directly closing the reference site's key gap (Korean-language input is not supported there). Rewrote **REQ-GUESS-001..005** around an 8-guess hard attempt cap replacing hint-exhaustion gating; added **REQ-GUESS-006** (a duplicate guess still consumes an attempt — a recorded, user-confirmed assumption, see plan.md §B) and **REQ-GUESS-007** (the 8-guess cap itself). Narrowed the player-pool scope from multi-league (previously "EPL, La Liga, etc.") to the **Premier League, 2026/27 season only** (REQ-SELECT-001, REQ-SYNC-002/003 updated; age and squad number added to the synced attribute set). Added **Out of Scope — Photo/Picture Guessing Mode** and **Out of Scope — Multi-League / Multi-Season Expansion**. The sync-job-only provider-access architecture (REQ-SYNC-001, hard-won across iterations 1-3) is preserved unchanged as a design invariant throughout this revision. |
| 0.4.0 | 2026-08-14 | chan-w00-dev (via manager-spec) | **Scoped revision — squad number dropped + age computation corrected**, informed by real live-implementation findings during M1-M4 run-phase work (not a full rewrite). (1) **Squad number removed as a compared/synced attribute** (5 → 4 attributes): live testing against football-data.org's free-tier API confirmed it provides no shirt/squad-number data on any endpoint accessible on the free key — verified directly, the raw player object returns only `id, name, position, dateOfBirth, nationality` on both the competition-teams bulk endpoint and the per-team detail endpoint. A free alternative (TheSportsDB) exists but requires either an unreliable ~1,240-call double-lookup-per-player scheme (40+ minutes per sync, cross-source name-matching risk) or a paid $9/month tier; the user decided this complexity is not worth it for this project and confirmed dropping squad number entirely. **REQ-COMPARE-001/004/007** and **REQ-SYNC-002** updated to 4 attributes (nationality, club, position, age); age remains the sole numeric/directional-arrow attribute, nationality/club/position remain the three categorical attributes. (2) **Age computation corrected to calendar-year-only**: the M3 implementation (`lib/football-api/age.ts`) had computed age with a birthday-adjustment ("만 나이"-style). The user explicitly wants the simpler calendar-year-only method (Korean "연 나이" convention: `age = referenceYear - birthYear`, no month/day comparison) — see `plan.md` §B for the corrected, explicit method statement and rationale. M1-M4 code implemented under the prior 5-attribute / birthday-adjusted scope requires a corresponding code-removal/correction pass, delegated separately to manager-develop — not part of this artifacts-only revision (see `progress.md` §E.1). |
| 0.5.0 | 2026-08-14 | chan-w00-dev (via manager-spec) | **Scoped revision — squad number reinstated as a manually-maintained attribute**, reversing the 0.4.0 drop per a user decision, not a change to the underlying 0.4.0 finding (football-data.org's free tier still never supplies shirt/squad-number data, confirmed 0.4.0, unchanged). The user runs their own self-hosted Supabase database and is willing to manually maintain squad numbers — the same way Korean name mappings are manually maintained via the M5 seed process (REQ-KOREAN-004) — rather than relying on automatic sync from football-data.org. (1) **Squad number restored as the 5th compared/synced attribute** (4 → 5 attributes): **REQ-COMPARE-001/002/004/007** (§B.2) updated back to 5 attributes — nationality, club, position remain the three categorical attributes; age and squad number are now both numeric attributes with a directional indicator on mismatch. Git-history investigation (performed prior to this revision) confirmed `types/player.ts`'s pre-0.4.0 `squadNumber: number \| null` field and `lib/game/comparison-engine.ts`'s pre-0.4.0 squad-number comparison logic (commit `9a7d6f4^`) are REUSABLE; the OLD `lib/football-api/football-data-org-provider.ts` squad-number fetch path is NOT reusable and must not be revived — it always mapped to `null` on the free tier, which was the original 0.4.0 finding. (2) **New REQ-SYNC-004/005** (§B.7) — folded into the existing sync module rather than a new REQ-SQUAD-* series, since squad number sourcing is a nuance of the same "where does attribute data come from" story REQ-SYNC-001..003 already tell: squad numbers are populated via a manual entry process keyed by player id, never via the periodic sync job; the sync job's upsert payload MUST NOT include `squad_number`, so a manually-entered value is never overwritten on a subsequent sync run — this closes a critical implementation risk (an unguarded upsert would silently wipe manually-entered squad numbers on every sync). (3) **New REQ-SELECT-005** (§B.1): the target-player selection pool (M7, not yet built) is restricted to players having both a Korean name mapping and a registered squad number, so every round is guaranteed fully playable/comparable — not degraded by REQ-KOREAN-003's original-name fallback or a missing squad-number cell; recorded separately by the user on 2026-08-14 for M7. Added **Out of Scope — Squad Number Administration Tooling**, paralleling the existing Korean Mapping Administration Tooling exclusion. M1, M2, and M4 code implemented under the pre-0.5.0 4-attribute scope require a corresponding code re-addition pass, delegated separately to manager-develop — not part of this artifacts-only revision (see `progress.md` §E.1). |
| 0.6.0 | 2026-08-18 | chan-w00-dev (via manager-spec) | **Scoped revision — combined CSV review/export-import workflow for Korean name + squad number**, additive to (not replacing) the existing REQ-KOREAN-004 one-time seed process and the REQ-SYNC-004/005 id-keyed manual squad-number entry mechanism — both remain valid, already-implemented mechanisms for their original use cases. The user manages player display/comparison data with a spreadsheet mental model (one table, columns for English name, Korean name, nationality, club, age, squad number); English name/nationality/club/age are already synced (M4), while Korean name and squad number are the two manually-maintained columns, previously populated through two separate, narrow mechanisms. New **REQ-REVIEW-001..003** (§B.8, new module): (1) a review-export capability producing a CSV of the current player pool — columns `id, name, nationality, club, age, koreanName, squadNumber` — with the first five columns pre-filled from synced data and koreanName/squadNumber populated with the current value or left blank; (2) a review-import capability that, per CSV row, upserts a non-blank koreanName into the Korean-name mapping table and updates a non-blank squadNumber on the players table, both keyed by the row's id (eliminating manual id lookup); (3) a blank-cell-skip rule — the import never overwrites an existing value with an empty/null value. **Narrowed §D "Out of Scope — Squad Number Administration Tooling"**: the 0.5.0 blanket bulk-import prohibition is revised to explicitly permit this id-keyed CSV round-trip CLI mechanism, while continuing to exclude a web-based admin UI / hosted CRUD API. Operationally motivated by the upcoming M7 pool-filter (REQ-SELECT-005), which makes "how many players have both fields filled in" a recurring, important question. REQ-KOREAN-001..005 and REQ-SYNC-001..005 are unchanged. |

## §A. Overview

`guess-the-player` is a web game in the Wordle/Poeltl-style daily-guesser genre: an **attribute-comparison football-player guesser** modeled on ["Who Are Ya?"](https://playfootball.games/who-are-ya/premier-league/). Each round, the user submits one full player guess at a time — selected via search/autocomplete, never free text — and the guess is immediately compared against a randomly selected target player across five attributes (nationality, club, position, age, squad number), with the result shown as one comparison row per guess. The user has up to 8 guesses per round to identify the target; a correct guess at any point ends the round won, and an 8th incorrect guess ends the round lost.

The single differentiating feature versus the reference game and similar guessing games is that every player name shown to the user — in search candidates, in comparison rows, and in the result reveal — is displayed and searchable using the Korean media-convention name (e.g. "손흥민", "홀란드"), not only the player's romanized/original-language name. The reference site's autocomplete accepts only English/romanized input and does not support Korean-language search or guessing at all; this product closes that gap, and the search/autocomplete capability that makes it possible (§B.5) is the product's core differentiator.

This SPEC covers the first vertical slice of the product: the playable core loop (random selection with duplicate avoidance, guess submission with 5-attribute comparison, an 8-guess attempt cap, unlimited replay) plus the Korean name mapping and Korean-language search/autocomplete layers that the core loop depends on. The player pool for this SPEC is scoped exclusively to the **Premier League, 2026/27 season** (the upcoming season, not the currently-live 2025/26 season), and further restricted to players with both a Korean name mapping and a registered squad number so every round is fully playable (REQ-SELECT-005) — see §B.1, §D, and §E for rationale and residual risk.

This is a **major revision** of the SPEC: the previously specified progressive/sequential hint-reveal mechanic is fully replaced (see HISTORY 0.3.0). No reference to the old mechanic remains normative anywhere in this document.

Source documents: `.moai/project/product.md`, `.moai/project/structure.md`, `.moai/project/tech.md`, `.moai/project/interview.md`, and the design reference `https://playfootball.games/who-are-ya/premier-league/`.

## §B. Requirements (GEARS)

Seven requirement modules. Subjects are generalized per GEARS (not fixed to "the system") where a specific component clarifies intent.

### B.1 Player Selection & Duplicate Avoidance (Premier League, 2026/27 Season)

- **REQ-SELECT-001** (Ubiquitous): The player selection service shall select a target player at random from the Premier League 2026/27 season player pool at the start of every round.
- **REQ-SELECT-002** (Event-driven): When a new round starts and the player pool contains more than one player, the player selection service shall exclude the immediately preceding round's target player from that round's random selection set.
- **REQ-SELECT-003** (State-driven): While the player pool contains exactly one player, the player selection service shall select that player even when it matches the immediately preceding round's target player.
- **REQ-SELECT-004** (Event-detected / unwanted): When the player pool is empty, the system shall not start a new round and shall surface an empty-pool state to the user instead.
- **REQ-SELECT-005** (Ubiquitous, added 0.5.0): The player selection service shall restrict the target-player selection pool at every round start to players having both a Korean name mapping (REQ-KOREAN-001) and a registered squad number (REQ-SYNC-004), excluding any player missing either from the random selection set defined by REQ-SELECT-001.

### B.2 Attribute Comparison Engine

- **REQ-COMPARE-001** (Ubiquitous): The comparison engine shall compare a submitted guess player against the current round's target player across exactly five attributes: nationality, club, position, age, and squad number.
- **REQ-COMPARE-002** (Event-driven): When a user submits a guess, the comparison engine shall evaluate all five attributes and return one comparison result row containing a per-attribute outcome.
- **REQ-COMPARE-003** (Ubiquitous): For the three categorical attributes — nationality, club, and position — the comparison engine shall return exactly a correct-or-incorrect match indicator per attribute and shall not include any directional information for these attributes.
- **REQ-COMPARE-004** (Event-driven): For the two numeric attributes — age and squad number — when the guessed player's value for that attribute does not match the target's value, the comparison engine shall additionally return a directional indicator showing whether the target's value is higher or lower than the guessed player's value.
- **REQ-COMPARE-005** (Ubiquitous): The comparison engine shall classify every player's position as exactly one of four values: FW, MF, DF, or GK.
- **REQ-COMPARE-006** (Event-driven): When a user submits a guess for a player already guessed earlier in the same round, the comparison engine shall return the same comparison result as that player's original guess in the round.
- **REQ-COMPARE-007** (Event-detected / unwanted): When the target or guessed player's synced attribute data is incomplete for one of the five comparison attributes, the comparison engine shall mark that attribute as unavailable in the comparison result and shall not fail the guess submission.

### B.3 Guess Submission & Attempt Cap

- **REQ-GUESS-001** (Event-driven): When a user submits a guess identifying a candidate player selected via the search service (§B.5), the guess submission service shall record the guess as one of the round's attempts and invoke the comparison engine (§B.2) against the round's target player.
- **REQ-GUESS-002** (Event-driven): When a submitted guess's player exactly matches the target player, the system shall end the round as won immediately — regardless of how many attempts remain — and display the result, including the target player's Korean-mapped name.
- **REQ-GUESS-003** (Event-driven): When a submitted guess does not match the target player and the round's attempt count is below 8, the system shall keep the round active and allow the user to submit another guess.
- **REQ-GUESS-004** (Event-driven, compound with REQ-GUESS-007): When a submitted guess does not match the target player and the round's attempt count reaches 8, the system shall end the round as lost and reveal the target player's identity, including the Korean-mapped name.
- **REQ-GUESS-005** (Event-detected / unwanted): When a guess is incorrect, the guess submission service shall not include the target player's identity in its response beyond the per-attribute comparison result.
- **REQ-GUESS-006** (Event-driven, compound with REQ-COMPARE-006): When a user re-submits a guess for a player already guessed earlier in the same round, the guess submission service shall still increment the round's attempt count by one.
- **REQ-GUESS-007** (Ubiquitous): The system shall cap the number of guesses per round at exactly 8.

### B.4 Korean Player-Name Mapping

- **REQ-KOREAN-001** (Ubiquitous): The Korean name mapping service shall resolve a player's original-language name to its Korean media-convention display name using the Supabase mapping table as the runtime source of truth.
- **REQ-KOREAN-002** (Event-driven): When the system displays a player's name in a search candidate, a comparison result row, or a round's final reveal, it shall display the Korean-mapped name whenever a mapping exists for that player.
- **REQ-KOREAN-003** (Event-detected / unwanted): When no Korean mapping exists for the current target player's original-language name, the system shall fall back to displaying the player's original-language name and shall not fail the round.
- **REQ-KOREAN-004** (Capability gate): Where the Supabase Korean-name-mapping table is empty at first deployment, a one-time local seed process shall populate initial mappings from the bundled seed dataset.
- **REQ-KOREAN-005** (Ubiquitous): The Korean name mapping service shall treat the Supabase mapping table, not the local seed dataset, as the authoritative runtime source for name resolution after the initial seed has run.

### B.5 Player Search & Autocomplete

This module is the product's core differentiator (§A). It resolves the reference site's key gap — Korean-language input is not accepted there at all — while preserving original-language search as a non-regression.

- **REQ-SEARCH-001** (Ubiquitous): The player search service shall provide autocomplete candidate matching against the current Premier League 2026/27 player pool as the user types a query.
- **REQ-SEARCH-002** (Event-driven): When a user types a Korean-language query (e.g. a partial Korean name such as "손흥" or "홀란"), the player search service shall return matching candidate players by their Korean-mapped name.
- **REQ-SEARCH-003** (Event-driven): When a user types an original-language or romanized query, the player search service shall return matching candidate players by their original-language name.
- **REQ-SEARCH-004** (Ubiquitous): The guess submission flow shall accept only a candidate player selected from the search/autocomplete results, not free-text input, so every submitted guess resolves to exactly one real player in the pool.
- **REQ-SEARCH-005** (Event-detected / unwanted): When a user's query matches no candidate player in the pool, the player search service shall return an empty candidate result, and the guess submission flow shall not accept a guess until a valid candidate is selected.
- **REQ-SEARCH-006** (Ubiquitous): A guess resolved via Korean-name selection shall be treated identically to a guess resolved via original-language selection — both are compared against the target player using the same comparison engine (§B.2).

### B.6 Unlimited Replay

- **REQ-REPLAY-001** (Ubiquitous): The system shall allow a user to start a new round immediately after any round ends, with no daily or session-based play limit.
- **REQ-REPLAY-002** (Ubiquitous): The system shall allow a user to play a full round — start, guesses, result, replay — without creating an account or authenticating.
- **REQ-REPLAY-003** (Event-driven, compound with REQ-SELECT-002): When a user starts a new round immediately after a completed round, the player selection service shall apply the duplicate-avoidance rule against the just-completed round's target player.

### B.7 Player Data Sourcing & Sync (Football Data Provider Caching, Premier League 2026/27 Season)

Resolved architecture (see `plan.md` §B for the full rationale — unchanged design invariant across every revision of this SPEC): football-data.org's free tier is rate-limited to 10 requests/minute, a limit shared globally across every concurrent player, not scoped per-player. Calling it live on every round-start or guess submission would bottleneck the entire app to ~10 round-starts/minute combined. Instead, football-data.org is accessed exclusively by a periodic sync job; live gameplay reads only from Supabase. Squad number (§B.2 REQ-COMPARE-001) is the one exception to provider-sourced attribute data — it is populated via manual entry (REQ-SYNC-004/005 below), not by the sync job, since the resolved provider does not supply it on its free tier (confirmed 0.4.0).

- **REQ-SYNC-001** (Unwanted): The system shall not call the external football data provider from any live gameplay request handler (player selection, player search, guess submission, or their API routes) — all calls to the external football data provider shall originate only from the periodic sync job.
- **REQ-SYNC-002** (Event-driven): When the periodic sync job runs, it shall fetch the Premier League 2026/27 season player pool and attribute data — including nationality, club, position, and age — from the resolved external football data provider and write/refresh the result into the Supabase player-data table that serves as the runtime source of truth for player selection, search, and guess comparison.
- **REQ-SYNC-003** (Ubiquitous): The player selection service, player search service, and comparison engine shall source all player pool and attribute data exclusively from the Supabase player-data table at request-handling time.
- **REQ-SYNC-004** (Ubiquitous, added 0.5.0): Squad number values in the Supabase player-data table shall be populated exclusively via a manual entry process keyed by player id — not via the periodic sync job (REQ-SYNC-002) — because the resolved external football data provider does not supply shirt/squad-number data on its free tier (confirmed 0.4.0, see HISTORY).
- **REQ-SYNC-005** (Event-detected / unwanted, added 0.5.0): When the periodic sync job runs, it shall not write to or overwrite the `squad_number` column of the Supabase player-data table, so that a manually-entered squad number is never wiped out by a subsequent sync run.

### B.8 Combined Player-Data Review Export/Import (CSV, added 0.6.0)

This module is additive to REQ-KOREAN-004 (§B.4, one-time bundled seed) and REQ-SYNC-004/005 (§B.7, id-keyed manual squad-number entry) — both remain valid, independently usable mechanisms for their original use cases. This module provides a combined, ongoing, spreadsheet-friendly way to extend coverage of both manually-maintained fields (Korean name and squad number) together, keyed by player id so no manual id lookup is required.

- **REQ-REVIEW-001** (Ubiquitous): The player-data review export capability shall produce a CSV file containing one row per player in the current Premier League 2026/27 pool, with columns `id, name, nationality, club, age, koreanName, squadNumber` — the `id, name, nationality, club, age` columns populated from the Supabase player-data table (REQ-SYNC-003) and, where a mapping exists, the Korean name mapping table (REQ-KOREAN-001), and the `koreanName`/`squadNumber` columns populated with the player's current value when one exists or left blank otherwise.
- **REQ-REVIEW-002** (Event-driven): When the player-data review import capability is run against a CSV produced by REQ-REVIEW-001 and subsequently edited, it shall, for each row containing a non-blank `koreanName` value, upsert that value into the Korean name mapping table keyed by the row's `id`, and for each row containing a non-blank numeric `squadNumber` value, update the players table's `squad_number` column keyed by the row's `id`.
- **REQ-REVIEW-003** (Event-detected / unwanted): When a row in the imported CSV has a blank `koreanName` or `squadNumber` cell, the player-data review import capability shall not write an empty or null value for that field, and shall leave any existing stored value for that field unchanged.

## §C. Non-Functional Requirements

- **REQ-NFR-001** (Unwanted): The system shall not expose the external football data provider's API key to the client — the API key shall be accessible only within server-side code, specifically the periodic sync job's execution context (REQ-SYNC-001), and shall never appear in client-shipped code or in a live gameplay request handler.
- **REQ-NFR-002** (Ubiquitous): Automated tests shall verify every requirement module in §B, targeting the coverage thresholds configured in `.moai/config/sections/quality.yaml` (`test_coverage_target: 85`, `tdd_settings.min_coverage_per_commit: 80`).
- **REQ-NFR-003** (Ubiquitous): The Korean name mapping service shall remain queryable independently of the availability of the external football data provider — a provider outage shall not prevent name resolution for already-known players.
- **REQ-NFR-004** (Ubiquitous): Live gameplay concurrency (player selection, player search, guess submission and comparison) shall be bounded only by Supabase/Next.js capacity, not by the external football data provider's rate limit — per REQ-SYNC-001/003, no live gameplay request handler calls the provider directly, so the provider's 10 requests/minute free-tier limit only bounds the sync job's call frequency, not concurrent player count.
- **REQ-NFR-005** (Event-detected / unwanted, added in the plan-audit review-6.md D4 defect-fix pass): When the Supabase player-data table is unavailable or returns an error during a live gameplay request (player selection or guess submission/comparison), the affected service shall surface a retryable error state to the user and shall not expose the target player's identity.

## §D. Out of Scope

Settled exclusions per `product.md` MVP scope, plus SPEC-local exclusions to keep this vertical slice bounded, plus two exclusions newly made explicit by the 0.3.0 revision (Photo/Picture Guessing Mode, Multi-League / Multi-Season Expansion), plus one exclusion newly made explicit by the 0.5.0 revision (Squad Number Administration Tooling), further narrowed by the 0.6.0 revision to permit the combined CSV review workflow (§B.8) while still excluding a web-facing admin interface.

### Out of Scope — Account & Social Features

- User registration, login, or any authentication flow
- Personal play/score history persistence
- Leaderboards or ranking of any kind
- Friend competition or any multi-user social feature

### Out of Scope — Non-Football Sports

- Any sport other than football (soccer) — the player pool, comparison attributes, and data provider integration are football-specific for this SPEC

### Out of Scope — Photo/Picture Guessing Mode

- Photo- or image-based guessing (e.g. "guess the footballer from the picture") is not implemented. The reference site (`playfootball.games`) offers this as a separate game mode per its own marketing copy; this product is attribute-comparison-only, text/search-based guessing, and does not include a photo-guess variant.

### Out of Scope — Multi-League / Multi-Season Expansion

- The player pool is scoped exclusively to the Premier League, 2026/27 season. Other leagues (La Liga, Bundesliga, etc. — previously framed as in-scope in the 0.1.0/0.2.0 drafts under "EPL, La Liga, etc.") and any other Premier League season, including the currently-live 2025/26 season, are out of scope for this SPEC and deferred to a future SPEC.

### Out of Scope — Advanced or Weighted Selection Algorithms

- Rule-based or weighted player selection (e.g. difficulty-tier-adjusted selection frequency) — product.md records this as a v2 candidate, not part of the MVP mechanic defined in §B.1
- Any selection history beyond the single immediately-preceding round required for duplicate avoidance

### Out of Scope — Korean Mapping Administration Tooling

- An admin UI or CRUD API for editing the Supabase Korean-name-mapping table after the initial seed
- Bulk-import tooling beyond the one-time seed process in REQ-KOREAN-004

### Out of Scope — Squad Number Administration Tooling

- An admin UI or CRUD API for editing squad numbers in the Supabase player-data table — a web-based/hosted admin interface remains out of scope regardless of which underlying manual-maintenance mechanism (the REQ-SYNC-004 per-player script, or the REQ-REVIEW-001..003 CSV round-trip) is used
- **Revised 0.6.0**: the prior wording of this bullet ("Bulk-import tooling beyond the manual, per-player entry mechanism... not via a seed-and-replace dataset like the Korean mapping table") is narrowed and no longer applies as a blanket prohibition. The combined CSV review-export/review-import CLI workflow (REQ-REVIEW-001..003, §B.8) is explicitly permitted — it is an id-keyed round-trip exercised via CLI scripts, not a name-keyed seed-and-replace dataset and not a hosted admin surface. What remains out of scope is only a web-facing admin UI or hosted CRUD API (the bullet above)

### Out of Scope — Project Scaffolding & Deployment

- Initial Next.js/TypeScript/Tailwind project scaffolding, CI/CD pipeline setup, and Vercel deployment configuration are infrastructure prerequisites, not game-logic requirements, and are not specified by this SPEC (see `plan.md` §C Pre-flight for the scaffolding dependency note)
- Provisioning the Supabase project itself and the external football data provider account/API key are treated as externally-supplied configuration, not requirements of this SPEC

## §E. Dependencies & Assumptions

- Depends on a Supabase (Postgres) project being reachable at runtime for Korean name mapping (REQ-KOREAN-001, REQ-KOREAN-005) and for player pool/attribute data (REQ-SYNC-003, REQ-COMPARE-002); connection details are supplied via environment configuration, out of this SPEC's scope.
- Depends on football-data.org (the resolved external football data provider — see `plan.md` §B) for player pool and attribute data — nationality, club, position, and age — accessed exclusively by the periodic sync job (REQ-SYNC-001..003) via the `FootballDataProvider` abstraction, targeting the Premier League 2026/27 season roster specifically. Squad number is NOT among the provider-sourced attributes (see the next bullet).
- Assumes the player pool (the set of players eligible for selection, search, and comparison) is populated and refreshed in the Supabase player-data table by the periodic sync job (REQ-SYNC-002); the sync job's exact cadence (e.g. daily or weekly) is a run-phase implementation detail, not a SPEC-level requirement.
- **Depends on squad numbers being manually maintained (0.5.0)**: unlike the other four compared attributes, squad number is not automatically refreshed by the periodic sync job — it is populated and kept current via the manual entry process (REQ-SYNC-004), which is an ongoing operational responsibility of the SPEC owner, not an automated pipeline. REQ-SELECT-005's target-pool restriction (players with both a Korean mapping and a registered squad number) depends on this manual step having been completed for a given player before that player becomes eligible as a round target.
- **Residual risk, not a blocker — 2026/27 season roster data completeness**: football-data.org's coverage of the Premier League 2026/27 season (not yet started at the time this SPEC was authored) may be limited or incomplete pre-season — partial squads, missing attribute data for new signings, unconfirmed transfers. REQ-COMPARE-007 defines graceful degradation for incomplete attribute data (mark as unavailable, do not fail the guess), and the sync job's periodic refresh (REQ-SYNC-002) is designed to pick up roster completions over time as the season approaches and begins. This is a recorded residual risk to be monitored during run-phase, not a plan-blocking gap.
- **Recorded assumption — duplicate guess consumes an attempt (REQ-GUESS-006)**: this is a user-confirmed behavior communicated to the user during this revision and not yet contradicted. See `plan.md` §B for the full rationale and the flag that this remains open for the user to override if they later disagree.

## §F. Cross-References

- `.moai/project/product.md` — MVP scope, resolved game mechanic (random selection + duplicate avoidance), Out of Scope list
- `.moai/project/structure.md` — proposed module boundaries (`lib/football-api/`, `lib/korean-name-mapping/`, `lib/player-search/`, `lib/game/`, `lib/supabase/`)
- `.moai/project/tech.md` — confirmed stack (Next.js, TypeScript, Tailwind, Supabase) and the open football-data-API decision
- `.moai/project/interview.md` — Socratic interview source record
- `https://playfootball.games/who-are-ya/premier-league/` — design reference for the attribute-comparison guesser mechanic (0.3.0 revision)
- `.moai/config/sections/quality.yaml` — coverage thresholds and TDD mode configuration
- `plan.md`, `acceptance.md`, `spec-compact.md`, `progress.md` (this SPEC directory)
