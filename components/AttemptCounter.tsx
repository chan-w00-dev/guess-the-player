"use client";

/**
 * Attempt counter — SPEC-GAME-CORE-001 §F M10. Renders "N of 8 attempts
 * used" (REQ-GUESS-007). `MAX_ATTEMPTS` is imported from `types/comparison`
 * rather than hardcoded so the display always tracks the domain constant.
 */

import { MAX_ATTEMPTS } from "@/types/comparison";

export interface AttemptCounterProps {
  attemptCount: number;
}

export default function AttemptCounter({ attemptCount }: AttemptCounterProps) {
  return (
    <p
      data-testid="attempt-counter"
      className="text-sm font-medium text-zinc-600 dark:text-zinc-400"
    >
      {attemptCount} of {MAX_ATTEMPTS} attempts used
    </p>
  );
}
