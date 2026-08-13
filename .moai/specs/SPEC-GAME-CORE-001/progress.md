# Progress — SPEC-GAME-CORE-001

## §E.1 Plan-phase Audit-Ready Signal

plan_status: audit-ready (fresh audit cycle required — see 0.3.0 entry below)
plan_complete_at: 2026-08-13
plan_revised_at: 2026-08-14

Plan-phase artifacts created: `spec.md`, `plan.md`, `acceptance.md`, `spec-compact.md` (this SPEC directory). GEARS requirements now cover 7 modules (player selection, attribute comparison engine, guess submission & attempt cap, Korean name mapping, player search & autocomplete, unlimited replay, player-data sourcing & sync) plus 4 non-functional requirements. Out of Scope section present with 7 `### Out of Scope — <topic>` sub-headings.

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

## §E.2 Run-phase Evidence

_<pending run-phase>_

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
