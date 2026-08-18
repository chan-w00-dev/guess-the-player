# Progress — SPEC-GAME-CORE-001

## §E.1 Plan-phase Audit-Ready Signal

plan_status: audit-ready (fresh audit cycle required — see 0.6.0 entry below)
plan_complete_at: 2026-08-13
plan_revised_at: 2026-08-18

Plan-phase artifacts created: `spec.md`, `plan.md`, `acceptance.md`, `spec-compact.md` (this SPEC directory). GEARS requirements now cover 7 modules (player selection, attribute comparison engine, guess submission & attempt cap, Korean name mapping, player search & autocomplete, unlimited replay, player-data sourcing & sync) plus 4 non-functional requirements. Out of Scope section present with 8 `### Out of Scope — <topic>` sub-headings (as of the 0.5.0 revision below).

**Audit history under the pre-0.3.0 mechanic (currency fix, per D-NEW-2 of `SPEC-GAME-CORE-001-review-3.md`):**
- **Iteration 1** (`review-1.md`): FAIL — MP-7 clarification-gate failure (football-data.org provider undecided) plus D1 minor traceability wording defect.
- **Iteration 2** (`review-2.md`): FAIL, score 0.76 — a score regression versus iteration 1 driven by 4 defects (D3-D6), the major one being a direct self-contradiction in `plan.md` between "all calls proxy through app/api/" and "football-data.org is called exclusively by the sync job."
- **Iteration 3** (`review-3.md`): **PASS, score 0.89** — all 7 must-pass criteria PASS, D3-D6 fully resolved, no regression from iteration 1. Three new minor, non-blocking findings surfaced on the deeper Chain-of-Verification pass (D-NEW-1: HISTORY/version currency; D-NEW-2: this file's own currency, now fixed by this entry; D-NEW-3: an imprecisely-worded anti-pattern bullet in `plan.md` §G). This PASS verdict was reached under the **progressive/sequential hint-reveal mechanic**, which is now fully retired (see below) — the verdict does not carry forward to the 0.3.0 requirement set.

**0.3.0 MAJOR revision (2026-08-14) — core mechanic replaced, fresh audit cycle required:**

After the iteration-3 PASS above, the user provided a concrete reference game — ["Who Are Ya?"](https://playfootball.games/who-are-ya/premier-league/), a Wordle/Poeltl-style daily attribute-comparison guesser — and clarified that the actual desired gameplay is fundamentally different from what iteration 3 had audited. **This is a legitimate, user-confirmed scope clarification, not an audit failure or a regression against iteration 3's PASS verdict** — iteration 3 correctly audited the SPEC as it was specified at the time; the specification itself has now changed at the user's explicit direction.

Changes applied in this revision:
- Removed REQ-HINT-001..005 (progressive/sequential hint reveal) entirely.
- Added REQ-COMPARE-001..007 (5-attribute comparison engine — categorical nationality/club/position, numeric age/squad-number with directional indicator, position 4-value enum, duplicate-guess idempotency, incomplete-data graceful degradation).
- Added REQ-SEARCH-001..006 (Korean-language + original-language search/autocomplete — the product's core differentiator, replacing free-text guess input).
- Rewrote REQ-GUESS-001..005 around an 8-guess hard attempt cap; added REQ-GUESS-006 (duplicate consumes an attempt) and REQ-GUESS-007 (the cap itself).
- Narrowed player-pool scope to the Premier League, 2026/27 season only (was multi-league); added age + squad number to the synced attribute set (REQ-SYNC-002/003).
- Added Out of Scope — Photo/Picture Guessing Mode and Out of Scope — Multi-League / Multi-Season Expansion.
- Folded in the D-NEW-1 (HISTORY/version currency) and D-NEW-2 (this file's currency) fixes from iteration 3 as part of this rewrite; D-NEW-3 (the `plan.md` §G anti-pattern wording) is resolved by the full §G rewrite.
- The sync-job-only provider-access architecture (REQ-SYNC-001, hard-won across all three prior iterations) is preserved unchanged as a design invariant — verified not to have regressed anywhere in this revision.
- The position-taxonomy mapping (`plan.md` §B) is RESOLVED — a keyword-based classification rule (Goalkeeper → Midfield → Back/Defen → Forward/Winger/Attack/Striker priority order, with an explicit fallback for unmapped values) replaced the `[NEEDS CLARIFICATION]` marker. Zero unresolved markers remain across spec.md/plan.md/acceptance.md/spec-compact.md.

Tier: M (unchanged). Route: Hybrid Trunk main-direct (no branch/worktree, unchanged). **Plan-auditor status reset: this SPEC requires a fresh audit cycle (starting at iteration 1 of a new cycle) against the 0.3.0 requirement set before proceeding to run-phase** — the iteration-3 PASS (0.89) audited a since-superseded requirement set and does not satisfy the Plan Audit Gate for 0.3.0.

**0.4.0 scoped revision (2026-08-14) — squad number dropped + age computation corrected, informed by real live-implementation findings during M1-M4:**

This is a scoped revision (not a full SPEC rewrite), driven by two real live-implementation findings surfaced during M1-M4 run-phase work:

1. **Squad number dropped as a compared/synced attribute (5 → 4 attributes).** Live testing against football-data.org's free-tier API confirmed it does not provide shirt/squad-number data on any endpoint accessible on the free key — verified directly against both the competition-teams bulk endpoint and the per-team detail endpoint; the raw player object contains only `id, name, position, dateOfBirth, nationality`. A free alternative (TheSportsDB) exists but requires either an unreliable ~1,240-call double-lookup-per-player scheme (40+ min/sync, cross-source name-matching risk) or a paid $9/month tier. The user decided this complexity is not worth it and confirmed dropping squad number entirely. The comparison engine and synced attribute set are now 4 attributes: nationality, club, position (categorical), and age (numeric, sole directional-arrow attribute). See `plan.md` §B "Resolved — Squad Number Dropped as a Compared/Synced Attribute" for the full rationale.
2. **Age computation corrected to calendar-year-only.** The M3 implementation (`lib/football-api/age.ts`) had computed age with a birthday-adjustment ("만 나이"-style). The user explicitly wants the simpler calendar-year-only method (Korean "연 나이" convention): `age = referenceYear - birthYear`, no month/day comparison. See `plan.md` §B "Age computation" note for the corrected, explicit method statement.

**Code-removal/correction pass required, delegated separately**: M1-M4 code already exists under the pre-0.4.0 5-attribute / birthday-adjusted-age scope (`types/player.ts`, `types/comparison.ts`, `lib/game/comparison-engine.ts` where landed, `lib/football-api/`, `lib/player-data-sync/`, and the Supabase player-data table migration). This SPEC revision covers artifacts only — the corresponding code-removal/correction pass in the modules above is a separate, already-delegated run-phase task (manager-develop), not performed as part of this revision.

Tier: M (unchanged). Route: Hybrid Trunk main-direct (unchanged). This is a scoped revision of the 0.3.0 requirement set already pending a fresh plan-auditor cycle — the fresh-audit-cycle requirement noted above carries forward, now against the 0.4.0 requirement set.

**0.5.0 scoped revision (2026-08-14) — squad number reinstated, manually maintained:**

This is a scoped revision (not a full SPEC rewrite), reversing the 0.4.0 squad-number drop per a new user decision. The 0.4.0 finding itself (football-data.org's free tier never supplies shirt/squad-number data) is unchanged and still holds — what changed is the user's operating model: the user runs their own self-hosted Supabase database and is willing to manually maintain squad numbers, the same way Korean name mappings are manually maintained via the M5 seed process, rather than relying on automatic sync from football-data.org.

1. **Squad number restored as the 5th compared/synced attribute (4 → 5 attributes).** REQ-COMPARE-001/002/004/007 (`spec.md` §B.2) updated back to 5 attributes: nationality, club, position remain the three categorical attributes; age and squad number are now both numeric attributes with a directional indicator on mismatch. Git-history investigation (orchestrator-verified prior to this revision) confirmed `types/player.ts`'s pre-0.4.0 `squadNumber: number | null` field and `lib/game/comparison-engine.ts`'s pre-0.4.0 squad-number comparison logic (git history commit `9a7d6f4^`) are REUSABLE; the old `lib/football-api/football-data-org-provider.ts` squad-number fetch path is NOT reusable and must not be revived — it always mapped to `null` on the free tier, which was the original 0.4.0 finding.
2. **New REQ-SYNC-004/005 (`spec.md` §B.7)** — folded into the existing sync module rather than a new REQ-SQUAD-* series (rationale: squad number sourcing is a nuance of the same "where does attribute data come from" story REQ-SYNC-001..003 already tell). Squad numbers are populated via a manual entry process keyed by player id, never via the periodic sync job; the sync job's upsert payload MUST NOT include `squad_number`, so a manually-entered value is never overwritten on a subsequent sync run. This addresses a critical implementation risk: without this omission, every periodic sync would silently wipe manually-entered squad numbers back to unset, since the provider never returns this field.
3. **New REQ-SELECT-005 (`spec.md` §B.1)** — the target-player selection pool (M7, not yet built) is restricted to players having both a Korean name mapping and a registered squad number, so every round is guaranteed fully playable/comparable, not degraded by REQ-KOREAN-003's original-name fallback or a missing squad-number cell. Recorded separately by the user on 2026-08-14 for M7.
4. **New Out of Scope — Squad Number Administration Tooling** (`spec.md` §D), paralleling the existing Korean Mapping Administration Tooling exclusion.

**Code re-addition pass required, delegated separately**: M1, M2, and M4 code already exists under the pre-0.5.0 4-attribute scope (`types/player.ts`, `types/comparison.ts`, `lib/game/comparison-engine.ts`, and `lib/player-data-sync/sync.ts`'s upsert payload), all implemented complete per the 0.4.0-era scope. This SPEC revision covers artifacts only — the corresponding code re-addition pass (restoring the git-history-reusable squad-number type/comparison logic, adding a new Supabase migration to re-add the `squad_number` column, modifying the M4 sync job's upsert to explicitly omit `squad_number`, and creating a new manual squad-number entry script keyed by player id) in the modules above is a separate, already-delegated run-phase task (manager-develop), not performed as part of this revision. M3 requires no code change — its "football-data.org does not supply squad-number data" statement remains true and unchanged, since the old provider fetch path is explicitly not revived.

Tier: M (unchanged). Route: Hybrid Trunk main-direct (unchanged). This is a scoped revision of the 0.4.0 requirement set already pending a fresh plan-auditor cycle (carried forward from the 0.3.0 major revision) — the fresh-audit-cycle requirement noted above carries forward, now against the 0.5.0 requirement set.

**0.6.0 scoped revision (2026-08-18) — combined CSV review workflow for Korean name + squad number:**

This is a scoped revision (not a full SPEC rewrite), additive to the existing REQ-KOREAN-004 one-time seed process and REQ-SYNC-004/005 id-keyed manual squad-number entry mechanism — both remain valid, already-implemented, unchanged mechanisms. The user wants to manage the two manually-maintained columns (Korean name, squad number) the way a spreadsheet is managed: one combined CSV round-trip covering both fields together, id-keyed (removing the need to manually look up a player's id), editable in Excel/Google Sheets/Numbers.

1. **New §B.8 module — Combined Player-Data Review Export/Import (CSV)**: `spec.md` §B.8 adds REQ-REVIEW-001..003 — (a) a review-export capability producing a CSV (`id, name, nationality, club, age, koreanName, squadNumber`) of the current player pool with known-attribute columns pre-filled and koreanName/squadNumber populated with current values or left blank; (b) a review-import capability that upserts a non-blank koreanName and updates a non-blank squadNumber per row, keyed by id; (c) blank-cell skip behavior — the import never overwrites an existing value with an empty/null value.
2. **Narrowed `spec.md` §D "Out of Scope — Squad Number Administration Tooling"**: the prior 0.5.0 blanket bulk-import prohibition is revised to explicitly permit the id-keyed CSV round-trip CLI workflow (REQ-REVIEW-001..003), while continuing to exclude a web-based admin UI / hosted CRUD API (unrelated to this CLI mechanism, preserved as out of scope).
3. **`plan.md` §B** — new "Resolved — Combined CSV Review Workflow..." subsection records the spreadsheet mental model rationale, the id-keyed round-trip design (no name-matching ambiguity, unlike REQ-KOREAN-001's runtime resolution), and the explicit reuse of the already-implemented `lib/korean-name-mapping/` upsert logic and `lib/squad-number/update.ts`'s `runSquadNumberUpdate` — no new/duplicated Supabase write path.
4. **`plan.md` §F** — new M12 milestone (`scripts/export-players-for-review.ts`, `scripts/import-players-review.ts`, a minimal inline RFC4180-lite CSV parse/write utility, no new npm dependency).
5. **`acceptance.md`** — 3 new must-pass scenarios/AC rows (23-25 / AC-GAME-CORE-033..035) covering export column/pre-fill correctness, import upsert-on-filled-cell behavior, and import skip-on-blank-cell behavior.

**Code implementation delegated separately**: the two new scripts (`scripts/export-players-for-review.ts`, `scripts/import-players-review.ts`) and the inline CSV utility do not yet exist. This SPEC revision covers artifacts only — implementation is a separate, already-delegated run-phase task (manager-develop), not performed as part of this revision.

Tier: M (unchanged). Route: Hybrid Trunk main-direct (unchanged). This is a scoped revision of the 0.5.0 requirement set already pending a fresh plan-auditor cycle (carried forward from the 0.3.0 major revision) — the fresh-audit-cycle requirement noted above carries forward, now against the 0.6.0 requirement set.

## §E.2 Run-phase Evidence

### M1 — Domain Types & Data Model (status: complete)

Not yet AC-verifiable in isolation — every AC in `acceptance.md` §D.1 exercises
behavior from the comparison engine (M2), player selection (M7), search (M6),
guess submission (M8), Korean mapping (M5), or the sync job (M4), none of
which exist yet after M1. This entry records M1 delivery evidence; the AC
PASS/FAIL matrix is populated progressively as later milestones close it out
(final table due at M11 close).

**Delivered:**
- Next.js 16 (App Router) + TypeScript (strict) + Tailwind CSS v4 + Vitest
  scaffold at repo root: `package.json`, `tsconfig.json`, `next.config.ts`,
  `eslint.config.mjs`, `postcss.config.mjs`, `vitest.config.ts`,
  `app/{layout.tsx,page.tsx,globals.css,favicon.ico}`.
- `types/player.ts` — `Position` (`FW`\|`MF`\|`DF`\|`GK`), `POSITIONS`,
  `isPosition()` type guard, `Player` (nullable `club`/`nationality`/`age`/
  `squadNumber` per REQ-COMPARE-007 incomplete-sync-data handling; optional
  display-only `photo`, not one of the 5 REQ-COMPARE attributes).
- `types/comparison.ts` — `ComparisonAttribute`/`CATEGORICAL_ATTRIBUTES`/
  `NUMERIC_ATTRIBUTES` + `isCategoricalAttribute`/`isNumericAttribute` guards,
  `AttributeComparisonResult` discriminated union (`CategoricalAttributeResult`
  \| `NumericAttributeResult`) + `isNumericAttributeResult` guard,
  `ComparisonResult`, `RoundState` + `createInitialRoundState()`,
  `MAX_ATTEMPTS` (= 8, REQ-GUESS-007), `GuessResult` + `RevealedIdentity`
  (reveal present only on won/lost, per REQ-GUESS-002/004/005), `KoreanMapping`.
- `tests/unit/player-types.test.ts` + `tests/unit/comparison-types.test.ts` —
  37 tests. TDD RED confirmed first (`Cannot find package '@/types/...'`)
  before writing the GREEN implementation.
- `.env.local.example` — placeholder env var names only (Supabase URL/anon
  key, football-data.org API key); no real secret values.

**Self-verification (evidence — see M1 commit for the full command output):**

| Check | Command | Result |
|---|---|---|
| Tests | `npx vitest run` | PASS — 2 files, 37 tests, 0 failed |
| Coverage | `npx vitest run --coverage` | 100% stmts/branches/funcs/lines on `types/**` (10/10 stmts, 2/2 branches, 5/5 funcs, 10/10 lines) — exceeds the 85%/80% quality.yaml thresholds |
| Type-check | `npx tsc --noEmit` | exit 0 |
| Lint | `npx eslint .` | exit 0 |
| Build | `npm run build` | exit 0 — static `/` and `/_not-found` routes |

### M1/M2/M4 — 0.5.0 Squad Number Re-addition Pass (status: complete)

Code re-addition pass required by the `progress.md` §E.1 0.5.0 revision entry
(restoring the git-history-reusable squad-number type/comparison logic,
re-adding the Supabase `squad_number` column via a new migration, and
creating the manual squad-number entry mechanism), delegated to
`manager-develop` (cycle_type=tdd) as a standalone run-phase task. Does NOT
implement REQ-SELECT-005 (target-pool filter) — that is explicitly M7 scope,
not yet built.

**Delivered:**
- `types/player.ts` — `Player.squadNumber: number | null` restored (adapted
  from git history `9a7d6f4^`, doc comments updated to the current file's
  0.4.0/0.5.0 HISTORY-aware style rather than pasted verbatim).
- `types/comparison.ts` — `"squadNumber"` restored to `COMPARISON_ATTRIBUTES`
  (now 5) and `NUMERIC_ATTRIBUTES` (now 2); module doc comments updated from
  "four attributes" back to "five attributes".
- `lib/game/comparison-engine.ts` — `squadNumber` case restored in
  `getNumericValue()`'s switch, same directional-comparison treatment as
  `age`.
- `lib/football-api/football-data-org-provider.ts` — `squadNumber: null` set
  unconditionally (a literal, never derived from any raw provider field,
  including a defensive test asserting a raw `shirtNumber` field is never
  read even if present) — football-data.org's free tier still never
  supplies this data (confirmed 0.4.0, unchanged).
- `lib/football-api/mock-provider.ts` — 5 mock fixtures updated with
  test-appropriate `squadNumber` values.
- `lib/player-data-sync/sync.ts` / `types.ts` — **critical constraint
  (REQ-SYNC-005)**: `toPlayerRow()` and `PlayerRow` both deliberately
  continue to omit `squad_number`; added explanatory doc comments plus a
  dedicated negative-assertion test (`Object.prototype.hasOwnProperty.call(
  calls[0], "squad_number")` is `false`) even when the source `Player` has a
  non-null `squadNumber`.
- `supabase/migrations/0004_add_squad_number_column.sql` — idempotent
  `add column if not exists squad_number integer`, with a "HOW SQUAD NUMBERS
  ARE POPULATED" instructions block (mirrors the `0001`/`0002` manual-run
  style).
- **New `lib/squad-number/` module** (types.ts, update.ts,
  supabase-adapter.ts, index.ts) + `scripts/update-squad-numbers.ts` +
  `npm run update:squad-number` — see the Constraint Deviation note below for
  why this module's shape differs from the delegation prompt's literal
  Section D item 8 instructions.
- 60 new/updated tests across 9 files (216 total, up from prior baseline).

**Constraint Deviation (flagged for review) — squad-number entry mechanism
shape:** The delegation prompt's Section D item 8 asked for a module
mirroring the M5 Korean-name-mapping module's shape 1:1: a bundled,
checked-in `data/squad-number-seed.json` dataset (name-keyed, reusing the 24
`korean-name-seed.json` players) plus `scripts/seed-squad-numbers.ts`
resolving name → id internally. **This directly conflicts with the current
SPEC text**, which is explicit and internally consistent on this point:
- `spec.md` §D "Out of Scope — Squad Number Administration Tooling": *"Bulk-
  import tooling beyond the manual, per-player entry mechanism — squad
  number is maintained one player at a time, keyed by player id, **not via a
  seed-and-replace dataset like the Korean mapping table**."*
- `plan.md` §B "Resolved — Squad Number Reinstated": *"a script keyed by
  player `id` (**NOT by name, unlike M5's** `scripts/seed-korean-names.ts`
  ...) ... a targeted per-player `UPDATE players SET squad_number = ? WHERE
  id = ?` operation (or a small batch script accepting an `{id,
  squadNumber}` list), **not a bulk-seed-and-replace pattern like the Korean
  mapping table**."*
- `acceptance.md` AC-GAME-CORE-030 verification column: *"manual entry
  script behavior"* — id-keyed, consistent with the above.

Per Agent Core Behavior #3 (Push Back When Warranted) and the SPEC Artifact
Ownership blocker-report obligation, this implementation followed the
SPEC's explicit, self-consistent, detailed design (id-keyed
`SquadNumberEntry[]`, CLI-arg small-batch input via
`--id=/--number=` or `--entries='<json>'`, NO bundled repo-committed seed
dataset) rather than the delegation prompt's literal file/script shape.
`data/squad-number-seed.json` and `scripts/seed-squad-numbers.ts` were
**deliberately NOT created**. Real squad-number values for the eventual
REQ-SELECT-005 (M7) intersection pool are therefore NOT pre-populated by
this pass — populating them is the SPEC owner's manual operational
responsibility per REQ-SYNC-004, to be performed via `npm run
update:squad-number` after this pass merges. Requesting confirmation this
resolution is correct, or an explicit override to build the seed-and-replace
form instead.

**Self-verification (evidence — see this milestone's commit for full
command output):**

| Check | Command | Result |
|---|---|---|
| Tests | `npx vitest run` | PASS — 19 files, 216 tests, 0 failed |
| Coverage | `npx vitest run --coverage` | 99.52% stmts / 97.65% branch / 100% funcs / 99.52% lines repo-wide (`types/**`, `lib/game/**`, `lib/player-data-sync/**`, `lib/football-api/**`, `lib/squad-number/**` all fully covered — not listed as a sub-100% row in the v8 text reporter) — exceeds the 85%/80% quality.yaml thresholds |
| Type-check | `npx tsc --noEmit` | exit 0 |
| Lint | `npx eslint .` | exit 0 (1 pre-existing unrelated warning on a generated `coverage/` artifact) |
| Build | `npm run build` | exit 0 |
| Sync-exclusion grep (REQ-SYNC-005) | `grep -n "squad_number\|squadNumber" lib/player-data-sync/sync.ts lib/player-data-sync/types.ts` | 8 matches, all inside doc comments — zero matches in the `PlayerRow` field list or the `.upsert()` object literal |

### AC PASS/FAIL Matrix (0.5.0-added/widened ACs — this pass only)

| AC | Status | Verification | Actual Output |
|---|---|---|---|
| AC-GAME-CORE-004 | PASS | `npx vitest run tests/unit/comparison-engine.test.ts` | "returns exactly 5 attribute outcomes covering every COMPARISON_ATTRIBUTES entry" — PASS |
| AC-GAME-CORE-006 | PASS | same file | "numeric mismatch direction also applies to squadNumber independently of age" + the higher/lower counterpart — both PASS |
| AC-GAME-CORE-009 | PASS | same file | "marks squadNumber unavailable when the guessed/target player's value is null, with no direction" — both PASS |
| AC-GAME-CORE-030 | PASS | `npx vitest run tests/unit/squad-number/` | 24 tests PASS (update.test.ts, supabase-adapter.test.ts, parse-args.test.ts) — id-keyed, never name-keyed; static grep confirms `lib/player-data-sync/sync.ts` never imports/calls `lib/squad-number/` |
| AC-GAME-CORE-031 | PASS | `npx vitest run tests/unit/player-data-sync/sync.test.ts` | "never includes a squad_number key in the upsert payload, even when Player.squadNumber is set" + the null-squadNumber counterpart — both PASS |
| AC-GAME-CORE-032 | N/A (deferred to M7) | — | REQ-SELECT-005 target-pool filter is explicitly out of scope for this delegation (M7 — Player Selection Engine — not yet built) |

_Remaining ACs in `acceptance.md` §D.1 are owned by other milestones (M2 core
comparison behavior beyond the squad-number widening above, M5 Korean
mapping, M6 search, M7 selection, M8 guess submission) and are not
re-verified by this entry._

### M12 — Combined CSV Review Export/Import (status: complete)

Implements REQ-REVIEW-001..003 (spec.md §B.8, added 0.6.0) — additive to,
not a replacement for, the M5 Korean-name-mapping seed bootstrap and the
0.5.0 id-keyed squad-number manual entry mechanism, both of which remain
valid, unmodified, and untouched by this milestone.

**New modules:**
- **`lib/csv/`** (`parse.ts`, `write.ts`, `index.ts`) — a small, dependency-free
  RFC4180-lite CSV parse/write utility (quoted-field handling for a comma, a
  double-quote, or a newline inside a field). No new npm dependency.
- **`lib/player-review/`** (`types.ts`, `export.ts`, `import.ts`,
  `supabase-adapter.ts`, `index.ts`) — the review CSV column shape
  (`id,name,nationality,club,age,koreanName,squadNumber`), the read-only
  players↔korean_name_mappings join (`buildPlayerReviewRows`,
  `runPlayerReviewExport`, anon-key only), and the CSV parse + blank-cell-skip
  batch-building logic (`parsePlayerReviewCsv`, `buildReviewWriteBatches`).
  This module never calls Supabase to write — see the scripts below.
- **`scripts/export-players-for-review.ts`** + `npm run export:players-review`
  — read-only CLI entry point, anon-key client only; never imports
  `createSeedSupabaseClient`/`createSquadNumberSupabaseClient`.
- **`scripts/import-players-review.ts`** + `npm run import:players-review` —
  writes exclusively through the existing, already-tested
  `runKoreanNameSeed` (`lib/korean-name-mapping/`) and `runSquadNumberUpdate`
  (`lib/squad-number/`) — this file contains zero raw `.upsert()`/`.update()`
  Supabase calls (verified by grep below). The blank-cell-skip rule
  (REQ-REVIEW-003) is satisfied by construction in
  `buildReviewWriteBatches`: a row with a blank `koreanName`/`squadNumber`
  cell is simply never added to that column's write-batch array, so neither
  reused function ever sees — and therefore can never overwrite — a stored
  value with a blank.
- `.gitignore` — added `data/player-review-export.csv` (generated artifact,
  not committed seed data, unlike `data/korean-name-seed.json`).
- `package.json` — added `export:players-review` / `import:players-review`
  scripts, matching the `seed:korean-names`/`update:squad-number` pattern.

**Self-verification (evidence):**

| Check | Command | Result |
|---|---|---|
| Tests | `npx vitest run` | PASS — 27 files, 275 tests, 0 failed (up from 216) |
| Coverage | `npx vitest run --coverage` | Repo-wide 99.69% stmts / 97.91% branch / 100% funcs / 99.68% lines; `lib/csv/` and `lib/player-review/` both 100% stmts/funcs/lines (94-97% branch) — exceeds the 85%/80% quality.yaml thresholds. The only sub-100%-stmts row (`lib/player-search/search.ts`, pre-existing, untouched by this milestone) is outside this milestone's scope. |
| Type-check | `npx tsc --noEmit` | exit 0 |
| Lint | `npx eslint .` | exit 0 (1 pre-existing unrelated warning on a generated `coverage/` artifact, same as the 0.5.0 pass) |
| Build | `npm run build` | exit 0 |
| Reuse-boundary grep (constraint 4, D-8) | `grep -n "\.upsert(\|\.update(" scripts/import-players-review.ts` | 0 matches — the script calls only `runKoreanNameSeed`/`runSquadNumberUpdate`, never a raw Supabase table write |

### AC PASS/FAIL Matrix (M12 — this pass only)

| AC | REQ | Status | Verification | Actual Output |
|---|---|---|---|---|
| AC-GAME-CORE-033 | REQ-REVIEW-001 | PASS | `npx vitest run tests/unit/player-review/export.test.ts` | `buildPlayerReviewRows` pre-fills id/name/nationality/club/age from the players row and koreanName from a matched mapping, blanks (never the literal `"null"`) when absent; `runPlayerReviewExport` mock-Supabase-fixture test joins players + mappings end-to-end — all PASS |
| AC-GAME-CORE-034 | REQ-REVIEW-002 | PASS | `npx vitest run tests/unit/player-review/import-integration.test.ts` | Wires `buildReviewWriteBatches` output into the real `runKoreanNameSeed` (upserts keyed by original name) and the real `runSquadNumberUpdate` (updates keyed by numeric id) via fake Supabase clients mirroring `lib/korean-name-mapping/seed.test.ts`/`lib/squad-number/update.test.ts` — both reused functions receive exactly the expected calls — PASS |
| AC-GAME-CORE-035 | REQ-REVIEW-003 | PASS | `npx vitest run tests/unit/player-review/import.test.ts` | A row with a blank `koreanName` cell (squadNumber filled) is excluded from `koreanMappings`; a row with a blank `squadNumber` cell (koreanName filled) is excluded from `squadNumberEntries`; both-blank and whitespace-only cells are excluded from both; a non-numeric squadNumber cell is skipped rather than producing a `NaN` entry — all PASS. `import-integration.test.ts` additionally confirms neither reused write function is ever called for a blank-cell row. |

### M7 — Player Selection Engine (status: complete)

Implements REQ-SELECT-001..005 (spec.md §B.1) — `selectTargetPlayer` is the
sole entry point every round-start flow (M8 guess-submission service, the
round-start API route, replay) will depend on to obtain a new round's target
player.

**New module:**
- **`lib/game/player-selector.ts`** (co-located with the M2 comparison
  engine) — `selectTargetPlayer({ supabase, excludePlayerId?, random? })`.
  Applies the REQ-SELECT-005 pool filter (squad number present AND a Korean
  name mapping exists) FIRST, before the REQ-SELECT-001 random pick ever
  runs, via the same application-code players↔korean_name_mappings join
  established by `lib/player-search/search.ts` / `lib/player-review/export.ts`
  (no DB-level FK). REQ-SELECT-002/003 duplicate avoidance: excludes
  `excludePlayerId` only when the eligible pool has more than one player,
  always selecting the sole player when the pool has exactly one. REQ-SELECT-004:
  an empty eligible pool (or a query error on either table) returns
  `{ status: "empty-pool" }` — never throws, never starts a round. The
  injected `random?: () => number` option (default `Math.random`) follows
  the `now?: () => Date` injectable-non-determinism convention established
  by `lib/player-data-sync/sync.ts`. Raw `position` strings are guarded by
  `isPosition()` before trusting them, mirroring `lib/player-search/search.ts`'s
  `toCandidate` defensive pattern.

**Self-verification (evidence):**

| Check | Command | Result |
|---|---|---|
| Tests | `npx vitest run` | PASS — 30 files, 295 tests, 0 failed (up from 280) |
| Coverage | `npx vitest run --coverage` | Repo-wide 99.71% stmts / 98.18% branch / 100% funcs / 99.70% lines; `lib/game/player-selector.ts` itself is 100% stmts (30/30) / 100% branch (28/28) / 100% funcs (4/4), verified directly against the v8 `coverage-final.json` raw counts (not listed in the text-reporter's below-100% table) — exceeds the 85%/80% quality.yaml thresholds. The only sub-100%-stmts rows (`lib/player-review/import.ts`, `lib/player-search/search.ts`, both pre-existing, untouched by this milestone) are outside this milestone's scope. |
| Type-check | `npx tsc --noEmit` | exit 0 (after removing 4 stale, gitignored `.next/types/*" 2.ts"` duplicate-artifact files left over from a prior build run — unrelated pre-existing build-cache noise, not caused by this milestone) |
| Lint | `npx eslint .` | exit 0 (1 pre-existing unrelated warning on a generated `coverage/` artifact, same as the 0.5.0/M12 passes) |
| Build | `npm run build` | exit 0 |
| Sync-boundary grep (REQ-SYNC-001) | `grep -rln "lib/football-api" lib/game/player-selector.ts` | 0 matches |

### AC PASS/FAIL Matrix (M7 — this pass only)

| AC | REQ | Status | Verification | Actual Output |
|---|---|---|---|---|
| AC-GAME-CORE-001 | REQ-SELECT-001, 002 | PASS | `npx vitest run tests/unit/player-selector.test.ts` | Injected-RNG test on a 2-player eligible pool confirms `excludePlayerId` is excluded from the candidate set and the remaining player is always selected; a second test confirms the injected `random()` index maps to the corresponding candidate across a 2-player pool — PASS |
| AC-GAME-CORE-002 | REQ-SELECT-003 | PASS | `npx vitest run tests/unit/player-selector.test.ts` | A 1-player eligible pool selects that player even when `excludePlayerId` matches it, both with an injected `random()` and with the default `Math.random` — PASS |
| AC-GAME-CORE-003 | REQ-SELECT-004 | PASS | `npx vitest run tests/unit/player-selector.test.ts` | Zero-row pool, an eligible-after-filter-empty pool, and a Supabase query error on either table all return `{ status: "empty-pool" }` without throwing — PASS |
| AC-GAME-CORE-032 | REQ-SELECT-005 | PASS | `npx vitest run tests/unit/player-selector.test.ts` | A mixed fixture (2 fully-registered + 1 missing-mapping + 1 missing-squad-number) is sampled across 5 injected `random()` values and never selects outside the fully-registered `{1,2}` id set; dedicated tests confirm a player missing only the mapping, or only the squad number, is excluded; a row failing the `isPosition()` guard is skipped defensively even when otherwise eligible — PASS |

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
