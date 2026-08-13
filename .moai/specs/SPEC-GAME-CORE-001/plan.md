# Plan — SPEC-GAME-CORE-001

## §A. Context

`guess-the-player` is a brand-new repository — `git` was initialized with a single commit containing only `.moai/project/*` docs; no application source code exists yet. This is the first SPEC for the project. Solo developer (`team_sharing: solo`); development methodology is TDD (`quality.yaml` `constitution.development_mode: tdd`, already configured — RED-GREEN-REFACTOR, test-first required).

Git strategy: Hybrid Trunk, 1-person OSS. This SPEC follows **Route A — Hybrid Trunk main-direct** (`.claude/rules/moai/workflow/spec-workflow.md` § SPEC Phase Discipline): all three phases (plan/run/sync) commit and push directly to `main`. No branch, no worktree, no PR for this SPEC — consistent with the explicit no-branch/no-worktree instruction for this SPEC and with `git-strategy.yaml`'s `manual` mode (`push_to_remote: false`, `auto_branch: false`).

No prior SPEC exists in `.moai/specs/`; this SPEC introduces the ID namespace `GAME-CORE`.

**0.3.0 major revision note**: this plan.md is rewritten in step with `spec.md` 0.3.0. The SPEC had already passed plan-auditor iteration-3 (`.moai/reports/plan-audit/SPEC-GAME-CORE-001-review-3.md`, verdict PASS, score 0.89) under the previous progressive-hint-reveal mechanic. This revision replaces that mechanic entirely per a user-provided concrete reference (`https://playfootball.games/who-are-ya/premier-league/`) — a legitimate, user-confirmed scope clarification, not an audit failure or a regression. The Tier (M) and Route (Hybrid Trunk main-direct) judgments below are unaffected by the mechanic change and carry forward unchanged. This SPEC requires a fresh plan-auditor review cycle (starting again at iteration 1 of a new cycle) before proceeding to run-phase, since the requirement set has materially changed since the last PASS verdict.

Tier judgment: **Tier M** (Medium). Rationale: the bundled scope (7 requirement modules, ~11 review milestones) exceeds a trivial single-file change, but the domain logic itself (selection, comparison engine, search/autocomplete, guess-submission, Korean mapping, player-data sync) is bounded and does not touch constitutional/frozen zones. The 3-file artifact set (spec.md + plan.md + acceptance.md) applies; per explicit user request this SPEC additionally ships `spec-compact.md` (the standard plan-phase auto-generated compact artifact) and `progress.md` (the standard §E skeleton). No separate `design.md` / `research.md` — this SPEC's technical-approach notes and open decisions are folded inline into this plan.md instead.

## §B. Known Issues

### Resolved — External Football Data API Provider

**football-data.org is the chosen external football data API provider** (resolved by explicit user decision; supersedes the prior open choice between API-Football and football-data.org recorded in `tech.md`). Rationale: football-data.org's free tier covers 12 competitions (Europe's top 5 leagues + UEFA Champions League) — the Premier League (this SPEC's sole scope as of 0.3.0, see below) is covered; its free-tier rate limit is 10 requests/minute.

The `FootballDataProvider`-shaped abstraction at the `lib/football-api/` boundary (a single interface exposing "fetch player attributes for a given player identifier") is retained from the original technical approach. Run-phase milestone M3 implements this abstraction plus a deterministic mock/stub adapter for tests; the concrete football-data.org adapter is wired in behind the same interface. The abstraction's consumer is unchanged under this revision: it is consumed by the M4 sync job only, never by live request handlers.

### Resolved — Player Data Sourcing & Caching Architecture (design invariant, unchanged across every revision)

**football-data.org's 10 requests/minute rate limit is GLOBAL/shared across all app users, not per-user.** If the game called the provider live on every round-start, search query, or guess submission, concurrent usage would be severely bottlenecked — only ~10 round-starts/minute total, across all players combined, regardless of how many people are playing simultaneously.

Resolved design (spec.md §B.7, REQ-SYNC-001..003 + REQ-NFR-004) — **this architecture is a design invariant that has held across all three revisions of this SPEC (0.1.0 → 0.3.0) and is NOT affected by the 0.3.0 mechanic replacement**:

1. **football-data.org is NEVER called during live gameplay** (round start, player search, guess submission/comparison). All live request handlers read exclusively from Supabase.
2. A **periodic sync job** (M4) is the sole consumer of the M3 `FootballDataProvider` abstraction. It fetches the Premier League 2026/27 season player pool and attribute data from football-data.org — the 5 compared attributes (nationality, club, position, age, squad number) per REQ-SYNC-002 — and writes/refreshes it into the Supabase table that already serves as the runtime source of truth (the same Supabase layer used for Korean name mapping, per REQ-KOREAN-001/005).
3. The sync job's **cadence** (e.g. daily or weekly) is a run-phase implementation detail, not a SPEC-blocking decision — any cadence at or below the free-tier rate limit trivially satisfies REQ-SYNC-001/002; a daily or weekly cadence uses a negligible fraction of the 10 req/min budget.
4. Because live handlers never call football-data.org, **concurrent player capacity is bounded only by Supabase/Next.js capacity**, not by the provider's rate limit (REQ-NFR-004) — the same rate-limit-independence property REQ-NFR-003 already establishes for the Korean-mapping module extends to the football-data module, and now also covers the new player search module (M6), which likewise reads only from Supabase.

### Resolved — Major Revision: Core Mechanic Replaced (Attribute-Comparison Guesser)

Per user-provided concrete reference `https://playfootball.games/who-are-ya/premier-league/` ("Who Are Ya?" — a Wordle/Poeltl-style daily attribute-comparison guesser), the core gameplay loop is replaced: the previous progressive/sequential hint-reveal mechanic (club → position → nationality revealed one at a time, independent of any guess) is fully retired and replaced with a per-guess 5-attribute comparison (nationality, club, position — categorical; age, squad number — numeric with directional indicator), capped at 8 guesses per round. This decision was made explicitly by the user after reviewing the reference site, and supersedes the mechanic described in spec.md 0.1.0/0.2.0/0.2.1 in its entirety. `plan.md` §F milestones M2/M7/M8 below implement this.

### Resolved — Player Pool Scope Narrowed to Premier League, 2026/27 Season

The player pool is narrowed from the previous multi-league framing ("EPL, La Liga, etc.") to the **Premier League, 2026/27 season exclusively** — the upcoming season, chosen explicitly over the currently-live 2025/26 season because the product is being built ahead of that season's start. This affects REQ-SELECT-001 (selection scope) and REQ-SYNC-002 (sync target). Other leagues and other seasons are recorded as Out of Scope (spec.md §D) and deferred to a future SPEC, not silently dropped.

### Assumption (recorded) — Duplicate Guess Consumes an Attempt

The task brief states this as "the orchestrator's assumption, stated to the user, not yet contradicted — treat as confirmed but note it as a recorded assumption in case the user later disagrees." Recorded here per that instruction: when a user re-submits a guess for a player already guessed earlier in the same round, the system (a) returns the identical comparison result (idempotent — no new information), per REQ-COMPARE-006, AND (b) still increments the round's attempt count by one, per REQ-GUESS-006. This is currently specified as a settled requirement (not an open needs-clarification item) because it was explicitly communicated to and not contradicted by the user during this revision's Discovery. **If the user later disagrees** (e.g. wants duplicate guesses to be free / not consume an attempt), REQ-GUESS-006 and its AC (acceptance.md AC-GAME-CORE-008) are the two artifacts to revise — this is a low-cost, isolated change if it needs to flip.

### Residual Risk (non-blocking) — 2026/27 Season Roster Data Completeness

football-data.org's coverage of the Premier League 2026/27 season may be limited or incomplete pre-season (the season had not yet started as of this SPEC's authoring) — partial squads, missing squad numbers for new signings, unconfirmed transfers between clubs. This is a **residual risk, not a plan-blocking gap**: REQ-COMPARE-007 (spec.md §B.2) defines the graceful-degradation behavior (mark an incomplete attribute as unavailable in the comparison result rather than failing the guess), and the sync job's periodic refresh (REQ-SYNC-002, M4) is already designed to tolerate and pick up roster completions over time as the season approaches and begins. No SPEC-level mitigation beyond REQ-COMPARE-007 is required; this is recorded for run-phase awareness and for the sync job's monitoring during pre-season weeks.

### Resolved — Position-Taxonomy Mapping (football-data.org raw string → canonical FW/MF/DF/GK enum)

REQ-COMPARE-005 requires every player's position to be classified as exactly one of four canonical values (FW, MF, DF, GK). football-data.org's `Person`/`Player` API objects return a more granular `position` string rather than a fixed 4-value enum (confirmed via `docs.football-data.org/general/v4/person.html`: observed values include "Central Midfield", "Midfield", "Attacking Midfield", and "Defender"; the exact full vocabulary is not exhaustively published, but is expected to also include values such as "Defensive Midfield", "Centre-Back", "Right-Back", "Left-Back", "Centre-Forward", "Left Winger", "Right Winger", "Attack", and "Goalkeeper" based on typical football-data.org usage patterns). This plan resolves the mapping as a **keyword-based substring classification rule**, applied case-insensitively and in the priority order below so compound strings (e.g. "Defensive Midfield", "Attacking Midfield") classify correctly:

1. Contains `"Goalkeeper"` → **GK**
2. Contains `"Midfield"` → **MF** (checked before the DF/FW rules so "Defensive Midfield" and "Attacking Midfield" do not fall through to DF via the "Defen" keyword)
3. Contains `"Back"` OR `"Defen"` (covers "Defender", "Defence", "Defensive" when not already caught by rule 2) → **DF**
4. Contains `"Forward"` OR `"Winger"` OR `"Attack"` OR `"Striker"` → **FW**
5. **Fallback (no rule matched):** the M4 sync job logs the unmapped raw string (player id + raw value) and skips that player from the pool for the current sync run, consistent with the sync job's existing error-handling conventions (REQ-SYNC-002/003) of tolerating and re-attempting incomplete data on the next periodic refresh rather than writing an undefined/guessed classification into REQ-COMPARE-005's 4-value invariant. This fallback path is explicit, stated behavior — not an undefined case left to run-phase discretion.

This keyword list is a **starting point derived from documented and typical football-data.org vocabulary, not a response sample inspected live as of plan-authoring time**. Validating and, if needed, expanding the keyword list against real API response data is recorded as a run-phase task at M3 (§F) — a normal implementation-verification step, not a new blocking clarification gap, since the classification rule itself (including its explicit fallback) is already fully specified above and requires no further user decision to implement.

Other known items (non-blocking, recorded for run-phase awareness):

- `tech.md` also records the npm-vs-pnpm package manager choice as open. This SPEC assumes **npm** (the Next.js default, lowest setup friction for a solo project) as a non-blocking default; revisiting it does not affect any requirement in spec.md.
- `tech.md` records both Vitest and Jest as acceptable test frameworks. This plan selects **Vitest** — native ESM support, fast startup, and the more common pairing with modern Next.js/TypeScript projects — as a plan-level technical decision, not a clarification gap.
- **Age computation (resolved, non-blocking plan-level decision)**: football-data.org supplies a date-of-birth field, not a pre-computed age. This plan resolves age computation as: the M4 sync job computes age from date-of-birth at sync time and stores it as a snapshot integer in the Supabase player-data table (REQ-SYNC-002). Staleness is bounded by the sync job's refresh cadence (birthdays changing a stored age by exactly one, once a year, is an acceptable and expected staleness window, not a defect) — consistent with the existing periodic-refresh tolerance already designed into REQ-SYNC-002/003.

## §C. Pre-flight

Because no source code exists yet, run-phase M1 begins from an empty tree. Pre-flight checks before milestone work starts:

1. Confirm repository state: `git status` clean, `git log --oneline` shows exactly the initial docs-only commit plus this SPEC's plan-phase artifact commits. (Verified at plan-authoring time via `ls .moai/specs/` returning this SPEC directory only and no `package.json` present.)
2. Confirm project scaffolding does not yet exist: no `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, or `vitest.config.ts` in the repo root. Run-phase M1 MUST scaffold the Next.js + TypeScript + Tailwind + Vitest project (e.g. `npx create-next-app@latest` plus `vitest` setup) as a mechanical prerequisite before any domain module file is created. This is infrastructure bootstrap, not a design decision, so it is NOT listed as a milestone in §F — it is the entry action of M1.
3. Confirm Supabase project provisioning and the football data provider account/API key are treated as externally-supplied configuration (per spec.md §E) — this plan does not include provisioning steps; it assumes environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, the provider's API key) will be available via `.env.local` at run-phase, and that tests never depend on live external services (mock/stub adapters per §B).
4. Validate the position-taxonomy keyword-classification rule (§B, resolved) against a live or sample football-data.org response during M3 (the `FootballDataProvider` abstraction milestone) — expand the keyword list if the live vocabulary surfaces terms the current rule does not cover. This MUST happen before M4/M6/M7 begin consuming position data, since those milestones assume the canonical 4-value enum is already resolvable.
5. The player search module (M6) requires no additional infrastructure prerequisite beyond Supabase — it is a read-path query against the same player-data table M4 populates; no separate search index or service is provisioned for this SPEC's scope.

## §D. Constraints

- TDD is mandatory: RED-GREEN-REFACTOR, test-first, per `quality.yaml` `constitution.development_mode: tdd` (already configured, not overridden by this SPEC).
- Coverage: overall target 85%, minimum 80% per commit (`quality.yaml` `test_coverage_target` / `tdd_settings.min_coverage_per_commit`).
- TypeScript strict mode; domain logic modules (`lib/game/`, `lib/korean-name-mapping/`, `lib/player-search/`, `lib/football-api/`) avoid `any`.
- Vitest is the selected test framework (§B).
- The football data provider API key MUST NOT reach the client — the only server-side code path with provider access is the M4 sync job (`lib/player-data-sync/`); no `app/api/` Route Handler proxies or calls the provider directly (REQ-NFR-001, REQ-SYNC-001).
- **football-data.org is called exclusively by the M4 sync job (REQ-SYNC-001..003)** — no live gameplay request handler (player selection, player search, guess submission, or their `app/api/` routes) may import or call the `lib/football-api/` client directly; verified by the §E static grep check. This is the design invariant carried forward unchanged from every prior revision (§B).
- Supabase is the sole runtime source of truth for Korean name mappings (REQ-KOREAN-001, REQ-KOREAN-005) and for the player pool/attribute data (REQ-SYNC-003); the seed JSON (`data/korean-name-seed.json`) is read only by the one-time bootstrap process, never at request-handling time.
- The 8-guess attempt cap (REQ-GUESS-007) MUST be enforced server-side in the guess submission service — a client-side-only counter is insufficient, since it could be bypassed or desynced from server state.
- The guess submission flow MUST reject any guess whose player id was not returned by the search service for the query that produced it — free-text guesses are never accepted (REQ-SEARCH-004); the client only ever sends a player id selected from search results, and the server validates that id exists in the current pool.
- Duplicate-guess-consumes-an-attempt (REQ-GUESS-006) is a recorded assumption (§B) — implementers MUST NOT silently change this behavior without flagging it back through a SPEC revision if it turns out to be wrong.
- No authentication, session, or score-persistence mechanism is introduced — Out of Scope per spec.md §D.
- No photo/picture-based guessing mode is introduced — Out of Scope per spec.md §D.
- Route A (Hybrid Trunk main-direct): all commits land directly on `main`; no feature branch, no PR for this SPEC.

## §E. Self-Verification

Commands to run at run-phase completion (read-only, batchable):

- `npx vitest run --coverage` (or `npm test -- --coverage`) — full suite green; coverage report meets §D thresholds.
- `npx tsc --noEmit` — zero type errors.
- `npx eslint .` — zero lint errors.
- `grep -rn "process.env" lib/football-api/ app/api/` — confirm the provider API key is only ever referenced via `process.env.*`, never as a literal string, anywhere in `lib/` or `app/api/`.
- `grep -rln "korean-name-seed.json" .` restricted to the one-time seed script path only — confirm no runtime request-handling module imports the seed file directly (REQ-KOREAN-005 / anti-pattern in §G).
- `grep -rln "lib/football-api" lib/game/ lib/player-search/ app/api/player/ app/api/guess/` restricted to the live gameplay modules and API routes — confirm no live gameplay handler (including the new player search module) imports the `lib/football-api/` client directly; only the M4 sync job may import it (REQ-SYNC-001).
- `grep -rin "hint" lib/ app/ types/ --include="*.ts" --include="*.tsx"` — confirm no residual naming from the retired progressive/sequential hint-reveal mechanic survives in the implemented code (a migration-hygiene check specific to this 0.3.0 revision; expected zero matches once M1-M11 are complete).

## §F. Milestones

Ordered by decision-reversibility — foundational type/interface/data-model and core-mechanic decisions first (highest review value, most likely to change under review), mechanical wiring and polish last. Scaffolding itself is a §C Pre-flight action, not a milestone. Priorities use labels, not time estimates.

1. **M1 — Domain Types & Data Model** (Priority: High). Define the shared TypeScript types (`types/player.ts`, `types/comparison.ts`): `Player` (original-language name, club, position as the canonical FW/MF/DF/GK enum, nationality, age, squad number, id, plus an OPTIONAL `photo` URL field for display purposes only — NOT one of the 5 REQ-SYNC-002/REQ-COMPARE compared attributes, and NOT the photo-guessing mode, which stays explicitly Out of Scope per spec.md §D), `RoundState` (target, attempts array, attempt count, status), `ComparisonResult` (a per-attribute outcome union: categorical `{attribute, correct: boolean}` vs numeric `{attribute, correct: boolean, direction?: 'higher' | 'lower'}`), `GuessResult`, `KoreanMapping`. This is the foundational shape every other module depends on — the highest-change-likelihood decision in this SPEC, reviewed first. Includes the Next.js/TypeScript/Tailwind/Vitest scaffold bootstrap (§C item 2) as this milestone's entry action.
2. **M2 — Attribute Comparison Engine** (Priority: High). `lib/game/comparison-engine.ts` implementing REQ-COMPARE-001..007: the core NEW mechanic replacing the old hint engine — categorical match logic (nationality/club/position, no direction), numeric match-with-direction logic (age/squad number), position-enum classification, duplicate-guess idempotency, and graceful handling of incomplete attribute data. This is the single highest-review-value new design decision in the 0.3.0 revision (the exact shape of the comparison result), reviewed immediately after the data model it depends on.
3. **M3 — FootballDataProvider Abstraction & Mock Adapter** (Priority: High). Design and implement the `lib/football-api/` interface boundary (fetch-attributes-by-player-id shape, now including age/squad-number fields) plus a deterministic mock/stub adapter used by all tests. Provider selection is resolved (football-data.org, §B); this milestone's interface shape is the design decision under review, and it is also where the resolved position-taxonomy keyword-classification rule (§B, §C item 4) MUST be validated — inspect a live or sample football-data.org response, confirm the keyword-priority rule (Goalkeeper → Midfield → Back/Defen → Forward/Winger/Attack/Striker) correctly classifies the observed vocabulary, and expand the keyword list if new terms surface, before this milestone closes. Consumed exclusively by M4 (the sync job), never by live request handlers.
4. **M4 — Player-Data Sync Job** (Priority: High). `lib/player-data-sync/` — the periodic sync job that is the sole caller of the M3 `FootballDataProvider` abstraction (REQ-SYNC-001, REQ-SYNC-002). Fetches the Premier League 2026/27 season player pool and the 5 required attribute fields (nationality, club, position, age, squad number) from football-data.org, plus the optional display-only `photo` URL field (M1) when the provider response includes it, and writes/refreshes the Supabase player-data table. Cadence (daily/weekly) is a run-phase implementation detail.
5. **M5 — Korean Name Mapping Module** (Priority: High). Supabase table schema (original-language name → Korean display name), `lib/supabase/client.ts`, `lib/korean-name-mapping/mapper.ts` resolution logic including the no-mapping fallback (REQ-KOREAN-003), and the one-time seed bootstrap process consuming `data/korean-name-seed.json` (REQ-KOREAN-004). Core differentiator's display half — reviewed alongside M1-M4.
6. **M6 — Player Search & Autocomplete Module** (Priority: High). `lib/player-search/` implementing REQ-SEARCH-001..006: Korean-language candidate matching (consuming M5's mapping table), original-language/romanized candidate matching (regression-preserving), and the guess-must-be-a-selected-candidate constraint. This is the product's core differentiator's input half — a genuinely new module for this revision, reviewed early alongside M1-M5, not deferred to wiring-layer status.
7. **M7 — Player Selection Engine** (Priority: High). Random selection + duplicate-avoidance logic (REQ-SELECT-001..004) in `lib/game/player-selector.ts`, reading the Premier League 2026/27 player pool from the Supabase table populated by M4 (REQ-SYNC-003).
8. **M8 — Guess Submission & Attempt-Cap Service** (Priority: Medium). `lib/game/guess-service.ts` implementing REQ-GUESS-001..007: recording a guess as an attempt, invoking M2's comparison engine, the win condition (immediate on match), the 8-guess loss condition, the duplicate-guess-consumes-an-attempt rule (REQ-GUESS-006, §B assumption), and the no-identity-leak-on-incorrect-guess rule. Wires together M2 (comparison), M5 (Korean-mapped result display), M6 (search-resolved guess input), and M7 (target player). This is largely wiring once M1-M7 are settled, hence Medium priority despite being the module that ties the mechanic together.
9. **M9 — Next.js API Routes** (Priority: Medium). `app/api/player/random/route.ts`, `app/api/player/search/route.ts` (NEW — the autocomplete endpoint backing M6), and `app/api/guess/route.ts` wiring M1-M8 domain logic behind server-side handlers; these routes are Supabase-only and never call the football data provider directly (REQ-SYNC-001, REQ-SYNC-003). Wiring layer — lower decision risk once M1-M8 are settled.
10. **M10 — UI Components** (Priority: Low-Medium). `GameBoard.tsx`, `GuessSearchInput.tsx` (search/autocomplete input accepting Korean + original-language queries, replacing free-text input), `ComparisonTable.tsx` (renders the 5-attribute comparison row per guess — categorical correct/incorrect cells and numeric cells with a directional arrow on mismatch), `AttemptCounter.tsx` (renders "N of 8" attempts used), `ResultModal.tsx` (win/loss reveal with the Korean-mapped name) — all Tailwind, consuming the M9 API routes. Mechanical once the domain contracts are fixed.
11. **M11 — Test Suite Completion & Coverage Validation** (Priority: Low). Fill any remaining unit/integration test gaps (`tests/unit/`, `tests/integration/guess-flow.test.ts`), run the full §E self-verification batch (including the hint-terminology-residual grep), confirm coverage thresholds. Lowest review risk — verification, not a design decision.

Note: milestone ORDER above reflects review/decision-reversibility priority, not literal implementation sequencing — TDD's RED-GREEN-REFACTOR cycle still applies test-first within each milestone regardless of its position in this list.

## §G. Anti-Patterns

- Do NOT hardcode the player pool or Korean name mappings inside UI components — Supabase (mappings, pool) and the `FootballDataProvider` abstraction (raw player/attribute data, sync-job-only) are the sources of truth, not component-local constants.
- Do NOT implement login, score history, or leaderboards even as a "quick add" — explicitly Out of Scope (spec.md §D); scope creep here directly contradicts a settled product decision.
- Do NOT implement a photo/picture-based guessing mode even as a "quick add" — explicitly Out of Scope (spec.md §D); the reference site's photo-guess variant is a distinct game mode this product does not build.
- Do NOT hardcode the comparison engine's or guess-submission service's data-shape assumptions around a specific provider's response format — the M3 `FootballDataProvider` interface boundary isolates any future provider swap to M4 only; the comparison engine, player selector, player search, and guess submission service never import `lib/football-api/` directly and read exclusively from the Supabase player-data table (REQ-SYNC-001, REQ-SYNC-003). (This anti-pattern is worded to avoid the D-NEW-3 imprecision flagged in the iteration-3 plan-audit report — the sync-only boundary applies to every live-path module named above, not only the retired hint engine.)
- Do NOT read `data/korean-name-seed.json` at request-handling time — it is a one-time bootstrap artifact only (REQ-KOREAN-005); Supabase is the sole runtime source.
- Do NOT skip or "simplify away" the duplicate-avoidance check (REQ-SELECT-002) — it is an explicitly settled MVP mechanic per product.md, not an optional nicety.
- Do NOT let an incorrect-guess response leak the target player's identity beyond the per-attribute comparison result (REQ-GUESS-005) — verify this with a dedicated test, not just manual inspection.
- Do NOT enforce the 8-guess attempt cap (REQ-GUESS-007) client-side only — it MUST be enforced in the server-side guess submission service (§D).
- Do NOT accept free-text guess input anywhere in the guess submission flow — every guess MUST resolve to a player id returned by the search service for that query (REQ-SEARCH-004).
- Do NOT silently change the duplicate-guess-consumes-an-attempt behavior (REQ-GUESS-006) without flagging it back through a SPEC revision — it is a recorded, user-facing assumption (§B), not an implementation detail to be adjusted at will.
- Do NOT skip the M3 keyword-list validation step against real football-data.org response data (§B, §C item 4) before M4/M6/M7 begin consuming position data — the initial keyword list is a documented starting point, not a live-verified final mapping, and an unvalidated gap risks silently misclassifying a meaningful fraction of the player pool's REQ-COMPARE-005 position attribute.
- Do NOT let a raw position string fall through the keyword-classification rule (§B) into an undefined or guessed FW/MF/DF/GK value — an unmapped string MUST hit the explicit fallback (log + skip the player for that sync run), never a silent default.

## §H. Cross-References

- `spec.md` (this SPEC directory) — canonical requirements (§B REQ-* IDs referenced throughout this plan)
- `acceptance.md` (this SPEC directory) — Given-When-Then scenarios and AC matrix
- `.moai/project/product.md`, `.moai/project/structure.md`, `.moai/project/tech.md`, `.moai/project/interview.md`
- `https://playfootball.games/who-are-ya/premier-league/` — design reference for the 0.3.0 attribute-comparison mechanic
- `.moai/config/sections/quality.yaml` — TDD mode + coverage thresholds
- `.moai/config/sections/git-strategy.yaml` — `manual` mode confirming Route A applicability
- `.moai/reports/plan-audit/SPEC-GAME-CORE-001-review-1.md`, `-review-2.md`, `-review-3.md` — plan-audit history under the pre-0.3.0 mechanic (see `progress.md` for the 0.3.0 audit-status reset)
