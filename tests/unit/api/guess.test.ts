import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Player } from "@/types/player";
import { createInitialRoundState } from "@/types/comparison";

vi.mock("@/lib/game/player-lookup", () => ({
  getPlayerById: vi.fn(),
}));
vi.mock("@/lib/game/supabase-adapter", () => ({
  createPlayerLookupSupabaseClient: vi.fn(() => ({}) as unknown),
}));
vi.mock("@/lib/korean-name-mapping/mapper", () => ({
  resolveKoreanName: vi.fn(),
}));
vi.mock("@/lib/korean-name-mapping/supabase-adapter", () => ({
  createMapperSupabaseClient: vi.fn(() => ({}) as unknown),
}));
vi.mock("@/lib/game/guess-service", () => ({
  submitGuess: vi.fn(),
}));

import { getPlayerById } from "@/lib/game/player-lookup";
import { resolveKoreanName } from "@/lib/korean-name-mapping/mapper";
import { submitGuess } from "@/lib/game/guess-service";
import { signRoundToken } from "@/lib/game/round-token";
import { POST } from "@/app/api/guess/route";

const TARGET: Player = {
  id: "target-1",
  name: "Erling Haaland",
  club: "Manchester City",
  position: "FW",
  nationality: "Norway",
  age: 25,
  squadNumber: 9,
};

const GUESS: Player = {
  id: "guess-1",
  name: "Bukayo Saka",
  club: "Arsenal",
  position: "MF",
  nationality: "England",
  age: 24,
  squadNumber: 7,
};

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/guess", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  process.env.ROUND_TOKEN_SECRET = "test-secret-do-not-use-in-production";
  vi.mocked(getPlayerById).mockReset();
  vi.mocked(resolveKoreanName).mockReset();
  vi.mocked(submitGuess).mockReset();
});

describe("POST /api/guess — malformed request body", () => {
  it("returns 400 for invalid JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/guess", { method: "POST", body: "not json" }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).status).toBe("invalid-request");
  });

  it("returns 400 when roundToken or playerId is missing", async () => {
    const response = await POST(postRequest({ roundToken: "abc" }));
    expect(response.status).toBe(400);
    expect((await response.json()).status).toBe("invalid-request");
  });
});

describe("POST /api/guess — invalid round token", () => {
  it("returns 400 for a garbage roundToken", async () => {
    const response = await POST(postRequest({ roundToken: "garbage", playerId: "guess-1" }));
    expect(response.status).toBe(400);
    expect((await response.json()).status).toBe("invalid-round");
    expect(getPlayerById).not.toHaveBeenCalled();
  });
});

describe("POST /api/guess — playerId not resolvable (REQ-SEARCH-004)", () => {
  it("returns 400 when getPlayerById returns null", async () => {
    const roundToken = signRoundToken(createInitialRoundState(TARGET));
    vi.mocked(getPlayerById).mockResolvedValue(null);

    const response = await POST(postRequest({ roundToken, playerId: "nonexistent" }));

    expect(response.status).toBe(400);
    expect((await response.json()).status).toBe("invalid-player");
    expect(submitGuess).not.toHaveBeenCalled();
  });
});

describe("POST /api/guess — successful submission (leak check)", () => {
  it("re-signs the updated round and serializes only result, never the raw round object", async () => {
    const roundToken = signRoundToken(createInitialRoundState(TARGET));
    vi.mocked(getPlayerById).mockResolvedValue(GUESS);

    const updatedRound = {
      target: TARGET,
      attempts: [GUESS],
      attemptCount: 1,
      status: "active" as const,
    };
    vi.mocked(submitGuess).mockResolvedValue({
      status: "ok",
      round: updatedRound,
      result: {
        comparison: { attributes: [] },
        attemptCount: 1,
        status: "active",
      },
    });

    const response = await POST(postRequest({ roundToken, playerId: GUESS.id }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(typeof body.roundToken).toBe("string");
    // A fresh token, distinct from the input token (state advanced).
    expect(body.roundToken).not.toBe(roundToken);
    expect(body.result).toEqual({
      comparison: { attributes: [] },
      attemptCount: 1,
      status: "active",
    });

    // Leak check: the raw `round` key (which carries the full target
    // Player) must never appear in the response body — only `result`.
    expect(body).not.toHaveProperty("round");
    expect(JSON.stringify(body)).not.toContain(TARGET.name);
  });

  it("includes the reveal only when submitGuess's result carries one (won/lost)", async () => {
    const roundToken = signRoundToken(createInitialRoundState(TARGET));
    vi.mocked(getPlayerById).mockResolvedValue(TARGET);

    const updatedRound = {
      target: TARGET,
      attempts: [TARGET],
      attemptCount: 1,
      status: "won" as const,
    };
    vi.mocked(submitGuess).mockResolvedValue({
      status: "ok",
      round: updatedRound,
      result: {
        comparison: { attributes: [] },
        attemptCount: 1,
        status: "won",
        reveal: { originalName: TARGET.name, koreanName: "홀란드" },
      },
    });

    const response = await POST(postRequest({ roundToken, playerId: TARGET.id }));
    const body = await response.json();

    expect(body.result.reveal).toEqual({ originalName: TARGET.name, koreanName: "홀란드" });
  });
});

describe("POST /api/guess — rejected (round already ended)", () => {
  it("returns 409 with the rejection reason", async () => {
    const roundToken = signRoundToken(createInitialRoundState(TARGET));
    vi.mocked(getPlayerById).mockResolvedValue(GUESS);
    vi.mocked(submitGuess).mockResolvedValue({
      status: "rejected",
      reason: "round-already-ended",
    });

    const response = await POST(postRequest({ roundToken, playerId: GUESS.id }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ status: "rejected", reason: "round-already-ended" });
  });
});

describe("POST /api/guess — retryable error (REQ-NFR-005)", () => {
  it("returns 503 with no target-identity field", async () => {
    const roundToken = signRoundToken(createInitialRoundState(TARGET));
    vi.mocked(getPlayerById).mockResolvedValue(GUESS);
    vi.mocked(submitGuess).mockResolvedValue({ status: "retryable-error" });

    const response = await POST(postRequest({ roundToken, playerId: GUESS.id }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ status: "retryable-error" });
  });
});

describe("POST /api/guess — resolveIdentity wraps resolveKoreanName defensively (D3)", () => {
  it("returns { status: 'error' } when resolveKoreanName throws, instead of rejecting", async () => {
    const roundToken = signRoundToken(createInitialRoundState(TARGET));
    vi.mocked(getPlayerById).mockResolvedValue(TARGET);
    vi.mocked(resolveKoreanName).mockRejectedValue(new Error("supabase outage"));
    vi.mocked(submitGuess).mockResolvedValue({
      status: "ok",
      round: { target: TARGET, attempts: [TARGET], attemptCount: 1, status: "won" },
      result: { comparison: { attributes: [] }, attemptCount: 1, status: "won" },
    });

    await POST(postRequest({ roundToken, playerId: TARGET.id }));

    const call = vi.mocked(submitGuess).mock.calls[0][0];
    const identityResult = await call.resolveIdentity(TARGET.name);

    expect(identityResult).toEqual({ status: "error" });
  });
});
