import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayerSearchCandidate } from "@/lib/player-search/types";

vi.mock("@/lib/player-search/search", () => ({
  searchPlayers: vi.fn(),
}));
vi.mock("@/lib/player-search/supabase-adapter", () => ({
  createSearchSupabaseClient: vi.fn(() => ({}) as unknown),
}));

import { searchPlayers } from "@/lib/player-search/search";
import { GET } from "@/app/api/player/search/route";

const CANDIDATES: PlayerSearchCandidate[] = [
  { id: "1", originalName: "Son Heung-min", koreanName: "손흥민", club: "Tottenham Hotspur", position: "FW" },
];

beforeEach(() => {
  vi.mocked(searchPlayers).mockReset();
});

describe("GET /api/player/search — missing/blank query (REQ-SEARCH-005)", () => {
  it("returns an empty array when q is absent", async () => {
    const response = await GET(new Request("http://localhost/api/player/search"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
    expect(searchPlayers).not.toHaveBeenCalled();
  });

  it("returns an empty array when q is blank/whitespace-only", async () => {
    const response = await GET(new Request("http://localhost/api/player/search?q=%20%20"));
    const body = await response.json();

    expect(body).toEqual([]);
    expect(searchPlayers).not.toHaveBeenCalled();
  });
});

describe("GET /api/player/search — a real query (REQ-SEARCH-001..003)", () => {
  it("returns the candidate array as-is", async () => {
    vi.mocked(searchPlayers).mockResolvedValue(CANDIDATES);

    const response = await GET(new Request("http://localhost/api/player/search?q=%EC%86%90%ED%9D%A5"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(CANDIDATES);
    expect(searchPlayers).toHaveBeenCalledWith("손흥", expect.objectContaining({ supabase: expect.anything() }));
  });
});
