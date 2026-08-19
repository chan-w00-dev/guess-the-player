import { describe, expect, it } from "vitest";
import type { Player } from "@/types/player";
import { submitGuess, type ResolveIdentityResult } from "@/lib/game/guess-service";
import { createInitialRoundState, MAX_ATTEMPTS, type RoundState } from "@/types/comparison";

/** The round's target player — every fixture below is compared against this. */
const TARGET: Player = {
  id: "target-1",
  name: "Erling Haaland",
  club: "Manchester City",
  position: "FW",
  nationality: "Norway",
  age: 25,
  squadNumber: 9,
};

/** A correct guess: the same underlying player as the target (matching id). */
function correctGuess(): Player {
  return { ...TARGET };
}

/** An incorrect guess: a different player, differing on every attribute. */
const WRONG_GUESS: Player = {
  id: "guess-wrong",
  name: "Bukayo Saka",
  club: "Arsenal",
  position: "MF",
  nationality: "England",
  age: 23,
  squadNumber: 7,
};

/** Always-succeeding identity resolver — Supabase-backed in production (M5). */
async function okResolveIdentity(originalName: string): Promise<ResolveIdentityResult> {
  return { status: "ok", koreanName: `KR-${originalName}` };
}

/** Always-failing identity resolver, simulating a Supabase outage/timeout (REQ-NFR-005). */
async function erroringResolveIdentity(): Promise<ResolveIdentityResult> {
  return { status: "error" };
}

function freshRound(): RoundState {
  return createInitialRoundState(TARGET);
}

/** Builds a round already at N incorrect attempts (never matching the target). */
function roundAtAttempts(count: number): RoundState {
  let round = freshRound();
  for (let i = 0; i < count; i++) {
    round = {
      ...round,
      attempts: [...round.attempts, { ...WRONG_GUESS, id: `guess-wrong-${i}` }],
      attemptCount: round.attemptCount + 1,
    };
  }
  return round;
}

describe("submitGuess — records an attempt and invokes the comparison engine (REQ-GUESS-001, AC-GAME-CORE-010)", () => {
  it("increments attemptCount and returns a 5-attribute comparison result", async () => {
    const outcome = await submitGuess({
      round: freshRound(),
      guess: WRONG_GUESS,
      resolveIdentity: okResolveIdentity,
    });

    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.result.attemptCount).toBe(1);
      expect(outcome.result.comparison.attributes).toHaveLength(5);
      expect(outcome.round.attempts).toEqual([WRONG_GUESS]);
      expect(outcome.round.attemptCount).toBe(1);
    }
  });
});

describe("submitGuess — exact match wins immediately (REQ-GUESS-002, AC-GAME-CORE-011)", () => {
  it("ends the round won on the very first guess and reveals the Korean-mapped name", async () => {
    const outcome = await submitGuess({
      round: freshRound(),
      guess: correctGuess(),
      resolveIdentity: okResolveIdentity,
    });

    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.result.status).toBe("won");
      expect(outcome.result.attemptCount).toBe(1);
      expect(outcome.result.reveal).toEqual({
        id: TARGET.id,
        originalName: TARGET.name,
        koreanName: `KR-${TARGET.name}`,
      });
      expect(outcome.round.status).toBe("won");
    }
  });

  it("wins immediately regardless of how many attempts remain (mid-round correct guess)", async () => {
    const round = roundAtAttempts(3);

    const outcome = await submitGuess({
      round,
      guess: correctGuess(),
      resolveIdentity: okResolveIdentity,
    });

    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.result.status).toBe("won");
      expect(outcome.result.attemptCount).toBe(4);
      expect(outcome.result.reveal?.koreanName).toBe(`KR-${TARGET.name}`);
    }
  });

  it("wins even when the winning guess is the 8th attempt (match takes precedence over the cap)", async () => {
    const round = roundAtAttempts(7);

    const outcome = await submitGuess({
      round,
      guess: correctGuess(),
      resolveIdentity: okResolveIdentity,
    });

    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.result.status).toBe("won");
      expect(outcome.result.attemptCount).toBe(8);
    }
  });
});

describe("submitGuess — incorrect guess with attempts remaining keeps the round active (REQ-GUESS-003, AC-GAME-CORE-012)", () => {
  it("keeps status active when attemptCount stays below 8", async () => {
    const round = roundAtAttempts(2);

    const outcome = await submitGuess({
      round,
      guess: { ...WRONG_GUESS, id: "guess-wrong-fresh" },
      resolveIdentity: okResolveIdentity,
    });

    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.result.status).toBe("active");
      expect(outcome.result.attemptCount).toBe(3);
      expect(outcome.round.status).toBe("active");
    }
  });
});

describe("submitGuess — 8th incorrect guess ends the round lost and reveals identity (REQ-GUESS-004, REQ-GUESS-007, AC-GAME-CORE-013)", () => {
  it("ends the round lost on the 8th non-matching guess and includes the reveal", async () => {
    const round = roundAtAttempts(MAX_ATTEMPTS - 1);

    const outcome = await submitGuess({
      round,
      guess: { ...WRONG_GUESS, id: "guess-wrong-final" },
      resolveIdentity: okResolveIdentity,
    });

    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.result.status).toBe("lost");
      expect(outcome.result.attemptCount).toBe(MAX_ATTEMPTS);
      expect(outcome.result.reveal).toEqual({
        id: TARGET.id,
        originalName: TARGET.name,
        koreanName: `KR-${TARGET.name}`,
      });
    }
  });

  it("rejects a 9th guess submission after the round already ended lost (server-side enforcement)", async () => {
    const round = roundAtAttempts(MAX_ATTEMPTS - 1);
    const lostOutcome = await submitGuess({
      round,
      guess: { ...WRONG_GUESS, id: "guess-wrong-final" },
      resolveIdentity: okResolveIdentity,
    });

    expect(lostOutcome.status).toBe("ok");
    if (lostOutcome.status !== "ok") {
      throw new Error("expected the 8th guess to resolve ok");
    }
    expect(lostOutcome.round.status).toBe("lost");

    const ninthOutcome = await submitGuess({
      round: lostOutcome.round,
      guess: { ...WRONG_GUESS, id: "guess-wrong-ninth" },
      resolveIdentity: okResolveIdentity,
    });

    expect(ninthOutcome).toEqual({ status: "rejected", reason: "round-already-ended" });
  });

  it("rejects any further submission once the round already ended won", async () => {
    const wonOutcome = await submitGuess({
      round: freshRound(),
      guess: correctGuess(),
      resolveIdentity: okResolveIdentity,
    });

    expect(wonOutcome.status).toBe("ok");
    if (wonOutcome.status !== "ok") {
      throw new Error("expected the winning guess to resolve ok");
    }

    const secondOutcome = await submitGuess({
      round: wonOutcome.round,
      guess: WRONG_GUESS,
      resolveIdentity: okResolveIdentity,
    });

    expect(secondOutcome).toEqual({ status: "rejected", reason: "round-already-ended" });
  });
});

describe("submitGuess — no identity leak on a non-terminal response (REQ-GUESS-005, AC-GAME-CORE-014, hard invariant)", () => {
  it("omits the reveal key entirely (not merely undefined) while the round stays active", async () => {
    const outcome = await submitGuess({
      round: freshRound(),
      guess: WRONG_GUESS,
      resolveIdentity: okResolveIdentity,
    });

    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.result.status).toBe("active");
      expect("reveal" in outcome.result).toBe(false);
      expect(Object.keys(outcome.result).sort()).toEqual(
        ["attemptCount", "comparison", "status"].sort(),
      );
    }
  });
});

describe("submitGuess — duplicate guess still consumes an attempt (REQ-GUESS-006, REQ-COMPARE-006)", () => {
  it("increments attemptCount again and returns an identical comparison result for a repeated guess", async () => {
    const round = freshRound();

    const first = await submitGuess({ round, guess: WRONG_GUESS, resolveIdentity: okResolveIdentity });
    expect(first.status).toBe("ok");
    if (first.status !== "ok") {
      throw new Error("expected the first guess to resolve ok");
    }

    const second = await submitGuess({
      round: first.round,
      guess: WRONG_GUESS,
      resolveIdentity: okResolveIdentity,
    });

    expect(second.status).toBe("ok");
    if (second.status === "ok") {
      expect(second.result.attemptCount).toBe(2);
      expect(second.result.status).toBe("active");
      expect(second.result.comparison).toEqual(first.result.comparison);
      expect(second.round.attempts).toEqual([WRONG_GUESS, WRONG_GUESS]);
    }
  });
});

describe("submitGuess — Supabase-dependent collaborator failure surfaces a retryable error (REQ-NFR-005, AC-GAME-CORE-036)", () => {
  it("returns a retryable-error shape with no target-identity field when resolveIdentity errors on a winning guess", async () => {
    const outcome = await submitGuess({
      round: freshRound(),
      guess: correctGuess(),
      resolveIdentity: erroringResolveIdentity,
    });

    expect(outcome).toEqual({ status: "retryable-error" });
    expect(Object.keys(outcome)).toEqual(["status"]);
    expect(JSON.stringify(outcome)).not.toContain(TARGET.name);
    expect(JSON.stringify(outcome)).not.toContain(TARGET.nationality ?? "");
  });

  it("returns a retryable-error shape with no target-identity field when resolveIdentity errors on the losing 8th guess", async () => {
    const round = roundAtAttempts(MAX_ATTEMPTS - 1);

    const outcome = await submitGuess({
      round,
      guess: { ...WRONG_GUESS, id: "guess-wrong-final" },
      resolveIdentity: erroringResolveIdentity,
    });

    expect(outcome).toEqual({ status: "retryable-error" });
    expect(JSON.stringify(outcome)).not.toContain(TARGET.name);
  });

  it("never calls resolveIdentity when the round stays active (no reveal needed)", async () => {
    let calls = 0;
    const outcome = await submitGuess({
      round: freshRound(),
      guess: WRONG_GUESS,
      resolveIdentity: async (name) => {
        calls += 1;
        return okResolveIdentity(name);
      },
    });

    expect(outcome.status).toBe("ok");
    expect(calls).toBe(0);
  });
});
