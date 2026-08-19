"use client";

/**
 * Game orchestrator — SPEC-GAME-CORE-001 §F M10.
 *
 * Owns the client-side round lifecycle: starts a round via
 * `GET /api/player/random`, submits guesses via `POST /api/guess`, and
 * renders the child components (`AttemptCounter`, `ComparisonTable`,
 * `GuessSearchInput`, `ResultModal`). `roundToken` and `attemptsRemaining`
 * live only in component state for the lifetime of the tab — this SPEC has
 * no persistence requirement (never written to localStorage/cookies).
 *
 * "Play again" (§D0) applies REQ-REPLAY-003 duplicate avoidance by passing
 * the just-ended round's `reveal.id` as `excludeTargetId` to the next
 * `GET /api/player/random` call.
 */

import { useCallback, useEffect, useState } from "react";
import type { PlayerSearchCandidate } from "@/lib/player-search/types";
import type { ComparisonResult, RoundStatus } from "@/types/comparison";
import AttemptCounter from "./AttemptCounter";
import ComparisonTable, { type ComparisonTableEntry } from "./ComparisonTable";
import GuessSearchInput from "./GuessSearchInput";
import ResultModal, { type ResultModalReveal } from "./ResultModal";

interface RandomRoundOkResponse {
  roundToken: string;
  attemptsRemaining: number;
}

interface GuessOkResponse {
  roundToken: string;
  result: {
    comparison: ComparisonResult;
    attemptCount: number;
    status: RoundStatus;
    reveal?: ResultModalReveal;
  };
}

interface GuessErrorResponse {
  status: "rejected" | "invalid-request" | "invalid-round" | "invalid-player" | "retryable-error";
  reason?: string;
}

function describeGuessError(body: GuessErrorResponse | null): string {
  switch (body?.status) {
    case "rejected":
      return "This round has already ended.";
    case "invalid-round":
      return "Your round has expired — try starting a new one.";
    case "invalid-player":
      return "That player could not be found. Please pick another candidate.";
    case "invalid-request":
    case "retryable-error":
    default:
      return "Something went wrong submitting that guess. Please try again.";
  }
}

export default function GameBoard() {
  const [isLoadingRound, setIsLoadingRound] = useState(true);
  const [isEmptyPool, setIsEmptyPool] = useState(false);
  const [roundToken, setRoundToken] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [status, setStatus] = useState<RoundStatus>("active");
  const [history, setHistory] = useState<ComparisonTableEntry[]>([]);
  const [reveal, setReveal] = useState<ResultModalReveal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const startRound = useCallback(async (excludeTargetId?: string) => {
    setIsLoadingRound(true);
    setIsEmptyPool(false);
    setInlineError(null);
    setHistory([]);
    setAttemptCount(0);
    setStatus("active");
    setReveal(null);

    try {
      const url = excludeTargetId
        ? `/api/player/random?excludeTargetId=${encodeURIComponent(excludeTargetId)}`
        : "/api/player/random";
      const response = await fetch(url);

      if (response.status === 503) {
        // Body shape is `{ status: "empty-pool", message: string }`; only
        // the status code drives this branch — the message is not
        // currently surfaced in the UI.
        setIsEmptyPool(true);
        setRoundToken(null);
        return;
      }

      if (!response.ok) {
        setInlineError("Could not start a new round. Please try again.");
        setRoundToken(null);
        return;
      }

      const data: RandomRoundOkResponse = await response.json();
      setRoundToken(data.roundToken);
    } catch {
      setInlineError("Could not start a new round. Please try again.");
      setRoundToken(null);
    } finally {
      setIsLoadingRound(false);
    }
  }, []);

  useEffect(() => {
    // Classic "fetch on mount" pattern (react.dev/learn/synchronizing-with-
    // effects#fetching-data): startRound's synchronous state resets at the
    // top all match the already-current initial useState defaults (no-op
    // renders), and the state that actually changes is set only after the
    // `await fetch(...)` resolves. Runs once on mount only — startRound is
    // stable (useCallback, no deps).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void startRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = useCallback(
    async (candidate: PlayerSearchCandidate) => {
      if (!roundToken || status !== "active" || isSubmitting) {
        return;
      }

      setIsSubmitting(true);
      setInlineError(null);

      try {
        const response = await fetch("/api/guess", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ roundToken, playerId: candidate.id }),
        });

        if (!response.ok) {
          const body: GuessErrorResponse | null = await response.json().catch(() => null);
          setInlineError(describeGuessError(body));
          return;
        }

        const body: GuessOkResponse = await response.json();
        setRoundToken(body.roundToken);
        setAttemptCount(body.result.attemptCount);
        setStatus(body.result.status);
        setHistory((previous) => [
          ...previous,
          { candidate, comparison: body.result.comparison },
        ]);
        if (body.result.reveal) {
          setReveal(body.result.reveal);
        }
      } catch {
        setInlineError("Could not submit that guess. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [roundToken, status, isSubmitting],
  );

  const handlePlayAgain = useCallback(() => {
    void startRound(reveal?.id);
  }, [reveal, startRound]);

  if (isLoadingRound) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400" data-testid="game-board-loading">
        Loading a new round...
      </p>
    );
  }

  if (isEmptyPool) {
    return (
      <div
        className="flex flex-col items-center gap-2 text-center"
        data-testid="game-board-empty-pool"
      >
        <p className="text-lg font-medium">No players available</p>
        <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          There is currently no eligible player in the pool. Please check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-4">
      <AttemptCounter attemptCount={attemptCount} />
      <GuessSearchInput onSelect={handleSelect} disabled={status !== "active" || isSubmitting} />
      {inlineError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {inlineError}
        </p>
      )}
      <ComparisonTable entries={history} />
      {(status === "won" || status === "lost") && reveal && (
        <ResultModal status={status} reveal={reveal} onPlayAgain={handlePlayAgain} />
      )}
    </div>
  );
}
