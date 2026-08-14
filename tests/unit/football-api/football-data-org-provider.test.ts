import { afterEach, describe, expect, it, vi } from "vitest";
import { FootballDataOrgProvider } from "@/lib/football-api/football-data-org-provider";

/** Builds a mock `Response` without ever touching the real network. */
function jsonResponse(
  body: unknown,
  init: { status?: number; statusText?: string } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    statusText: init.statusText ?? "OK",
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("FootballDataOrgProvider — request construction (X-Auth-Token header, URL, query param)", () => {
  it("sends the API key via the X-Auth-Token header, not Authorization: Bearer, not a query param", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ teams: [] }));
    const provider = new FootballDataOrgProvider({ apiKey: "test-key-123", fetchImpl });

    await provider.fetchPlayerPool();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0];
    const headers = init?.headers as Record<string, string>;

    expect(headers["X-Auth-Token"]).toBe("test-key-123");
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("requests the PL competition teams endpoint with the configured season as a query param", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ teams: [] }));
    const provider = new FootballDataOrgProvider({ apiKey: "k", season: 2026, fetchImpl });

    await provider.fetchPlayerPool();

    const [url] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.football-data.org/v4/competitions/PL/teams?season=2026");
  });

  it("defaults season to 2026 (PL 2026/27) when not explicitly configured", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ teams: [] }));
    const provider = new FootballDataOrgProvider({ apiKey: "k", fetchImpl });

    await provider.fetchPlayerPool();

    const [url] = fetchImpl.mock.calls[0];
    expect(url).toContain("season=2026");
  });
});

describe("FootballDataOrgProvider — response-to-Player mapping correctness", () => {
  const fixedReferenceDate = new Date("2026-08-14T00:00:00Z");

  it("maps team name to club, and all attribute fields correctly", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        teams: [
          {
            name: "Manchester City",
            squad: [
              {
                id: 8464,
                name: "Erling Haaland",
                position: "Centre-Forward",
                dateOfBirth: "2000-07-21",
                nationality: "Norway",
                shirtNumber: 9,
              },
            ],
          },
        ],
      }),
    );
    const provider = new FootballDataOrgProvider({
      apiKey: "k",
      fetchImpl,
      referenceDate: fixedReferenceDate,
    });

    const pool = await provider.fetchPlayerPool();

    expect(pool).toHaveLength(1);
    expect(pool[0]).toEqual({
      id: "8464",
      name: "Erling Haaland",
      club: "Manchester City",
      position: "FW",
      nationality: "Norway",
      age: 26,
      squadNumber: 9,
    });
  });

  it("aggregates players across multiple teams into a single flat pool", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        teams: [
          {
            name: "Team A",
            squad: [
              {
                id: 1,
                name: "Player One",
                position: "Goalkeeper",
                dateOfBirth: "1995-01-01",
                nationality: "England",
                shirtNumber: 1,
              },
            ],
          },
          {
            name: "Team B",
            squad: [
              {
                id: 2,
                name: "Player Two",
                position: "Defender",
                dateOfBirth: "1996-01-01",
                nationality: "France",
                shirtNumber: 4,
              },
            ],
          },
        ],
      }),
    );
    const provider = new FootballDataOrgProvider({
      apiKey: "k",
      fetchImpl,
      referenceDate: fixedReferenceDate,
    });

    const pool = await provider.fetchPlayerPool();

    expect(pool.map((player) => player.club)).toEqual(["Team A", "Team B"]);
    expect(pool.map((player) => player.id)).toEqual(["1", "2"]);
  });

  it("maps null nationality, null dateOfBirth, and null shirtNumber to null Player fields", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        teams: [
          {
            name: "Some Club",
            squad: [
              {
                id: 42,
                name: "New Signing",
                position: "Midfield",
                dateOfBirth: null,
                nationality: null,
                shirtNumber: null,
              },
            ],
          },
        ],
      }),
    );
    const provider = new FootballDataOrgProvider({
      apiKey: "k",
      fetchImpl,
      referenceDate: fixedReferenceDate,
    });

    const pool = await provider.fetchPlayerPool();

    expect(pool[0].age).toBeNull();
    expect(pool[0].nationality).toBeNull();
    expect(pool[0].squadNumber).toBeNull();
    expect(pool[0].position).toBe("MF");
  });
});

describe("FootballDataOrgProvider — position-taxonomy fallback (skip unmapped players)", () => {
  it("skips a player whose raw position string matches no classification keyword", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        teams: [
          {
            name: "Some Club",
            squad: [
              {
                id: 1,
                name: "Valid Player",
                position: "Goalkeeper",
                dateOfBirth: "1995-01-01",
                nationality: "England",
                shirtNumber: 1,
              },
              {
                id: 2,
                name: "Unclassifiable Player",
                position: "Team Coach",
                dateOfBirth: "1990-01-01",
                nationality: "England",
                shirtNumber: 99,
              },
            ],
          },
        ],
      }),
    );
    const provider = new FootballDataOrgProvider({
      apiKey: "k",
      fetchImpl,
      referenceDate: new Date("2026-08-14T00:00:00Z"),
    });

    const pool = await provider.fetchPlayerPool();

    expect(pool).toHaveLength(1);
    expect(pool[0].name).toBe("Valid Player");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("Team Coach");
  });

  it("skips a player with a missing (null) raw position string", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        teams: [
          {
            name: "Some Club",
            squad: [
              {
                id: 3,
                name: "No Position Player",
                position: null,
                dateOfBirth: "1990-01-01",
                nationality: "England",
                shirtNumber: 5,
              },
            ],
          },
        ],
      }),
    );
    const provider = new FootballDataOrgProvider({ apiKey: "k", fetchImpl });

    const pool = await provider.fetchPlayerPool();

    expect(pool).toHaveLength(0);
  });
});

describe("FootballDataOrgProvider — error handling", () => {
  it("throws when no apiKey is configured (option absent and no env var stubbed)", async () => {
    vi.stubEnv("FOOTBALL_DATA_API_KEY", "");
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ teams: [] }));
    const provider = new FootballDataOrgProvider({ fetchImpl });

    await expect(provider.fetchPlayerPool()).rejects.toThrow(/FOOTBALL_DATA_API_KEY/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reads the API key from process.env.FOOTBALL_DATA_API_KEY when no apiKey option is given", async () => {
    vi.stubEnv("FOOTBALL_DATA_API_KEY", "env-key-value");
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ teams: [] }));
    const provider = new FootballDataOrgProvider({ fetchImpl });

    await provider.fetchPlayerPool();

    const [, init] = fetchImpl.mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers["X-Auth-Token"]).toBe("env-key-value");
  });

  it("throws a descriptive error when the response is not ok", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ message: "Forbidden" }, { status: 403, statusText: "Forbidden" }));
    const provider = new FootballDataOrgProvider({ apiKey: "bad-key", fetchImpl });

    await expect(provider.fetchPlayerPool()).rejects.toThrow(/403/);
  });
});

describe("FootballDataOrgProvider — malformed response defensive handling", () => {
  it("returns an empty pool when the response body has no teams field", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({}));
    const provider = new FootballDataOrgProvider({ apiKey: "k", fetchImpl });

    const pool = await provider.fetchPlayerPool();

    expect(pool).toEqual([]);
  });

  it("skips a team with no squad field without throwing", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ teams: [{ name: "Squad-less Club" }] }),
    );
    const provider = new FootballDataOrgProvider({ apiKey: "k", fetchImpl });

    const pool = await provider.fetchPlayerPool();

    expect(pool).toEqual([]);
  });
});

describe("FootballDataOrgProvider — no live network calls", () => {
  it("never invokes the global fetch when a fetchImpl is injected", async () => {
    const globalFetchSpy = vi.spyOn(globalThis, "fetch");
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ teams: [] }));
    const provider = new FootballDataOrgProvider({ apiKey: "k", fetchImpl });

    await provider.fetchPlayerPool();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(globalFetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to the global fetch only when no fetchImpl is given, and that global fetch is fully mocked here", async () => {
    const globalFetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => jsonResponse({ teams: [] }));
    const provider = new FootballDataOrgProvider({ apiKey: "k" });

    await provider.fetchPlayerPool();

    expect(globalFetchSpy).toHaveBeenCalledTimes(1);
    const [url] = globalFetchSpy.mock.calls[0];
    expect(url).toContain("api.football-data.org/v4/competitions/PL/teams");
  });
});
