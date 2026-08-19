/**
 * Guess submission & attempt-cap service — SPEC-GAME-CORE-001 §F M8.
 *
 * Implements REQ-GUESS-001..007 (spec.md §B.3): records a submitted guess as
 * one of the round's attempts, invokes the M2 `compareGuess` comparison
 * engine against the round's target, decides the win/loss transition, and
 * enforces the 8-guess cap server-side. Also implements REQ-NFR-005 (spec.md
 * §C) for this service: a Supabase-dependent collaborator failure while
 * building the win/loss reveal surfaces a retryable-error result rather than
 * throwing, and never exposes the target's identity.
 *
 * Scope note (M2 vs M8 boundary, carried over from `comparison-engine.ts`):
 * `compareGuess` is a pure per-guess attribute comparison with no side
 * effects; this module is the one that mutates round state, decides
 * win/loss, and enforces the attempt cap — the M8 concerns `comparison-
 * engine.ts` explicitly defers to this milestone.
 *
 * REQ-GUESS-005 (hard invariant): a non-terminal `GuessResult` (`status`
 * `"active"`) never carries a `reveal` key at all — not merely
 * `reveal: undefined` — see the object-literal construction below and the
 * dedicated test in `tests/unit/guess-service.test.ts`.
 *
 * @MX:ANCHOR: [AUTO] submitGuess is the sole guess-submission entry point
 * every round-continuation flow (the Next.js guess API route, M9) will
 * depend on to process a guess against the current round (expected fan_in
 * >= 3 once M9 lands).
 * @MX:REASON: every guess transition (attempt recording, win/loss decision,
 * 8-guess cap enforcement, and the no-identity-leak invariant) is decided
 * here — a change to this function's behavior ripples through the API route
 * and every UI component that renders a guess outcome.
 */

import type { Player } from "@/types/player";
import { compareGuess } from "./comparison-engine";
import {
  MAX_ATTEMPTS,
  type GuessResult,
  type RevealedIdentity,
  type RoundState,
  type RoundStatus,
} from "@/types/comparison";

/**
 * Result of the injected identity-name resolution collaborator used to build
 * the win/loss reveal (REQ-GUESS-002, 004). Supabase-backed in production —
 * intended to be wired to M5's `resolveKoreanName` at the M9 API-route layer.
 *
 * This collaborator MUST resolve to `{ status: "error" }` (never throw/
 * reject) when the underlying Supabase call fails or times out, so this
 * service can surface REQ-NFR-005's retryable-error state deterministically
 * instead of an unhandled rejection.
 */
export type ResolveIdentityResult = { status: "ok"; koreanName: string } | { status: "error" };

export interface SubmitGuessOptions {
  /** The round's current server-side state (carries the target — see the M1 `RoundState` type). */
  round: RoundState;
  /** The submitted guess — an already search-resolved `Player`, never free text (REQ-SEARCH-004). */
  guess: Player;
  /**
   * Resolves the target player's Korean-mapped display name for the
   * win/loss reveal. Called ONLY when this submission ends the round
   * (won or lost) — an active-round response never needs a reveal, so no
   * Supabase-dependent call is made for it (see the dedicated test
   * asserting this collaborator is never invoked while the round stays
   * active).
   */
  resolveIdentity: (originalName: string) => Promise<ResolveIdentityResult>;
}

/** The guess was accepted and processed. */
export interface SubmitGuessOk {
  status: "ok";
  /** The round's updated server-side state (attempts/attemptCount/status advanced). */
  round: RoundState;
  /** The client-facing result for this guess — REQ-GUESS-005's response boundary. */
  result: GuessResult;
}

/**
 * REQ-GUESS-007 (server-side enforcement): the round had already ended
 * (won or lost) before this submission arrived, so it is rejected outright
 * rather than being processed as a new guess or silently incrementing the
 * attempt count past the cap.
 */
export interface SubmitGuessRejected {
  status: "rejected";
  reason: "round-already-ended";
}

/**
 * REQ-NFR-005: the injected `resolveIdentity` collaborator reported a
 * Supabase-dependent failure while building the win/loss reveal. Carries no
 * field beyond `status` — in particular, never a target-identity field.
 */
export interface SubmitGuessRetryableError {
  status: "retryable-error";
}

export type SubmitGuessResult = SubmitGuessOk | SubmitGuessRejected | SubmitGuessRetryableError;

/**
 * Processes a single guess submission against the round's current state
 * (REQ-GUESS-001..007). Never throws.
 */
export async function submitGuess(options: SubmitGuessOptions): Promise<SubmitGuessResult> {
  const { round, guess, resolveIdentity } = options;

  // REQ-GUESS-007 server-side enforcement: a round that already ended (won
  // or lost) rejects any further guess submission — generalized from the
  // literal "9th guess after a loss" wording to any post-terminal
  // submission, since the 8-guess cap and a completed win both mean the
  // round is over either way (see the Constraint Deviation note in the
  // completion report).
  if (round.status !== "active") {
    return { status: "rejected", reason: "round-already-ended" };
  }

  const comparison = compareGuess(guess, round.target);
  const attempts = [...round.attempts, guess];
  const attemptCount = round.attemptCount + 1;

  // REQ-GUESS-002: an exact match to the target wins immediately, taking
  // precedence over the attempt cap even on the 8th attempt.
  const isExactMatch = guess.id === round.target.id;
  const status: RoundStatus = isExactMatch
    ? "won"
    : attemptCount >= MAX_ATTEMPTS
      ? "lost"
      : "active";

  const nextRound: RoundState = { ...round, attempts, attemptCount, status };

  if (status === "active") {
    // REQ-GUESS-003 / REQ-GUESS-005: round stays active, no reveal key at all.
    return {
      status: "ok",
      round: nextRound,
      result: { comparison, attemptCount, status },
    };
  }

  const identity = await resolveIdentity(round.target.name);
  if (identity.status === "error") {
    // REQ-NFR-005: never expose the target's identity on a Supabase-
    // dependent failure — return only the bare retryable-error shape.
    return { status: "retryable-error" };
  }

  const reveal: RevealedIdentity = {
    originalName: round.target.name,
    koreanName: identity.koreanName,
  };

  // REQ-GUESS-002 / REQ-GUESS-004: won or lost — include the reveal.
  return {
    status: "ok",
    round: nextRound,
    result: { comparison, attemptCount, status, reveal },
  };
}
