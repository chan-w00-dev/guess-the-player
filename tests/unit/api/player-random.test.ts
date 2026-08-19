import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Player } from "@/types/player";
import { MAX_ATTEMPTS } from "@/types/comparison";

vi.mock("@/lib/game/player-selector", () => ({
  selectTargetPlayer: vi.fn(),
}));
vi.mock("@/lib/game/supabase-adapter", () => ({
  createPlayerSelectorSupabaseClient: vi.fn(() => ({}) as unknown),
}));

import { selectTargetPlayer } from "@/lib/game/player-selector";
import { GET } from "@/app/api/player/random/route";

const TARGET: Player = {
  id: "target-1",
  name: "Erling Haaland",
  club: "Manchester City",
  position: "FW",
  nationality: "Norway",
  age: 25,
  squadNumber: 9,
};

beforeEach(() => {
  process.env.ROUND_TOKEN_SECRET = "test-secret-do-not-use-in-production";
  vi.mocked(selectTargetPlayer).mockReset();
});

describe("GET /api/player/random — selected (D3.1)", () => {
  it("returns a roundToken and attemptsRemaining, never the player itself", async () => {
    vi.mocked(selectTargetPlayer).mockResolvedValue({ status: "selected", player: TARGET });

    const response = await GET(new Request("http://localhost/api/player/random"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(typeof body.roundToken).toBe("string");
    expect(body.attemptsRemaining).toBe(MAX_ATTEMPTS);

    // Response-body leak check: no target-identifying key or substring.
    expect(body).not.toHaveProperty("player");
    expect(body).not.toHaveProperty("target");
    expect(JSON.stringify(body)).not.toContain(TARGET.name);
    expect(JSON.stringify(body)).not.toContain(TARGET.club as string);
  });

  it("passes excludeTargetId from the query string through to selectTargetPlayer", async () => {
    vi.mocked(selectTargetPlayer).mockResolvedValue({ status: "selected", player: TARGET });

    await GET(new Request("http://localhost/api/player/random?excludeTargetId=prev-123"));

    expect(selectTargetPlayer).toHaveBeenCalledWith(
      expect.objectContaining({ excludePlayerId: "prev-123" }),
    );
  });

  it("passes excludePlayerId=null when excludeTargetId is absent", async () => {
    vi.mocked(selectTargetPlayer).mockResolvedValue({ status: "selected", player: TARGET });

    await GET(new Request("http://localhost/api/player/random"));

    expect(selectTargetPlayer).toHaveBeenCalledWith(
      expect.objectContaining({ excludePlayerId: null }),
    );
  });
});

describe("GET /api/player/random — empty pool (REQ-SELECT-004)", () => {
  it("returns 503 with a generic message, no round starts", async () => {
    vi.mocked(selectTargetPlayer).mockResolvedValue({ status: "empty-pool" });

    const response = await GET(new Request("http://localhost/api/player/random"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("empty-pool");
    expect(body).not.toHaveProperty("roundToken");
  });
});
