import { describe, expect, it, vi } from "vitest";
import type { FootballDataProvider } from "@/lib/football-api";
import { MockFootballDataProvider } from "@/lib/football-api";
import { DEFAULT_SEASON, runPlayerDataSync } from "@/lib/player-data-sync/sync";
import type { PlayerRow, SupabaseLike } from "@/lib/player-data-sync/types";
import type { Player } from "@/types/player";

/** Builds a fake `SupabaseLike` whose `upsert` records every call and
 * resolves/rejects per the provided per-call behavior. Zero real network or
 * DB access — a plain in-memory recorder. */
function fakeSupabase(
  behavior: (row: PlayerRow) => { error: { message: string } | null } | never,
): { supabase: SupabaseLike; calls: PlayerRow[] } {
  const calls: PlayerRow[] = [];
  const supabase: SupabaseLike = {
    from(table) {
      expect(table).toBe("players");
      return {
        upsert(values, options) {
          expect(options).toEqual({ onConflict: "id" });
          calls.push(values);
          return Promise.resolve(behavior(values));
        },
      };
    },
  };
  return { supabase, calls };
}

function fakeProvider(players: Player[]): FootballDataProvider {
  return {
    fetchPlayerPool: async () => players,
  };
}

describe("runPlayerDataSync — successful full-pool sync", () => {
  it("upserts every player from the provider and reports zero skips/errors", async () => {
    const provider = new MockFootballDataProvider();
    const { supabase, calls } = fakeSupabase(() => ({ error: null }));

    const summary = await runPlayerDataSync({ provider, supabase });

    expect(summary).toEqual({ synced: 5, skipped: 0, errors: [] });
    expect(calls).toHaveLength(5);
  });

  it("maps each Player field onto the corresponding snake_case PlayerRow column", async () => {
    const provider = fakeProvider([
      {
        id: "1001",
        name: "Test Player",
        club: "Test FC",
        position: "MF",
        nationality: "Testland",
        age: 24,
        squadNumber: 8,
        photo: "https://example.com/photo.jpg",
      },
    ]);
    const { supabase, calls } = fakeSupabase(() => ({ error: null }));
    const fixedNow = () => new Date("2026-08-14T12:00:00.000Z");

    await runPlayerDataSync({ provider, supabase, now: fixedNow });

    expect(calls[0]).toEqual({
      id: 1001,
      name: "Test Player",
      club: "Test FC",
      position: "MF",
      nationality: "Testland",
      age: 24,
      squad_number: 8,
      photo_url: "https://example.com/photo.jpg",
      season: DEFAULT_SEASON,
      synced_at: "2026-08-14T12:00:00.000Z",
    });
  });

  it("maps a Player with no optional photo to a null photo_url", async () => {
    const provider = fakeProvider([
      {
        id: "1002",
        name: "No Photo Player",
        club: null,
        position: "DF",
        nationality: null,
        age: null,
        squadNumber: null,
      },
    ]);
    const { supabase, calls } = fakeSupabase(() => ({ error: null }));

    await runPlayerDataSync({ provider, supabase });

    expect(calls[0].photo_url).toBeNull();
    expect(calls[0].club).toBeNull();
    expect(calls[0].nationality).toBeNull();
    expect(calls[0].age).toBeNull();
    expect(calls[0].squad_number).toBeNull();
  });
});

describe("runPlayerDataSync — season and synced_at stamping (REQ-SYNC-002)", () => {
  it("stamps every row with the default season '2026/27' when no season override is given", async () => {
    const provider = new MockFootballDataProvider();
    const { supabase, calls } = fakeSupabase(() => ({ error: null }));

    await runPlayerDataSync({ provider, supabase });

    expect(calls.every((row) => row.season === "2026/27")).toBe(true);
  });

  it("stamps every row with a caller-provided season override", async () => {
    const provider = new MockFootballDataProvider();
    const { supabase, calls } = fakeSupabase(() => ({ error: null }));

    await runPlayerDataSync({ provider, supabase, season: "2027/28" });

    expect(calls.every((row) => row.season === "2027/28")).toBe(true);
  });

  it("stamps every row with the same synced_at timestamp from a single sync run", async () => {
    const provider = new MockFootballDataProvider();
    const { supabase, calls } = fakeSupabase(() => ({ error: null }));
    const fixedNow = () => new Date("2026-08-14T09:30:00.000Z");

    await runPlayerDataSync({ provider, supabase, now: fixedNow });

    expect(calls.every((row) => row.synced_at === "2026-08-14T09:30:00.000Z")).toBe(true);
  });
});

describe("runPlayerDataSync — partial failure resilience", () => {
  it("continues past a single player's upsert error and reports it in errors, without throwing", async () => {
    const provider = fakeProvider([
      { id: "1", name: "Player One", club: "A", position: "FW", nationality: "X", age: 20, squadNumber: 10 },
      { id: "2", name: "Player Two", club: "B", position: "MF", nationality: "Y", age: 22, squadNumber: 11 },
      { id: "3", name: "Player Three", club: "C", position: "DF", nationality: "Z", age: 25, squadNumber: 12 },
    ]);
    const { supabase, calls } = fakeSupabase((row) =>
      row.id === 2 ? { error: { message: "constraint violation" } } : { error: null },
    );

    const summary = await runPlayerDataSync({ provider, supabase });

    expect(summary.synced).toBe(2);
    expect(summary.skipped).toBe(1);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]).toContain("id=2");
    expect(summary.errors[0]).toContain("Player Two");
    expect(summary.errors[0]).toContain("constraint violation");
    // All 3 players were still attempted — the loop did not stop at the failure.
    expect(calls).toHaveLength(3);
  });

  it("catches a thrown exception from upsert (not just a returned error) and continues", async () => {
    const provider = fakeProvider([
      { id: "1", name: "Player One", club: "A", position: "FW", nationality: "X", age: 20, squadNumber: 10 },
      { id: "2", name: "Player Two", club: "B", position: "MF", nationality: "Y", age: 22, squadNumber: 11 },
    ]);
    const supabase: SupabaseLike = {
      from(table) {
        expect(table).toBe("players");
        return {
          upsert(values) {
            if (values.id === 1) {
              return Promise.reject(new Error("network timeout"));
            }
            return Promise.resolve({ error: null });
          },
        };
      },
    };

    const summary = await runPlayerDataSync({ provider, supabase });

    expect(summary.synced).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.errors[0]).toContain("network timeout");
  });

  it("stringifies a non-Error thrown value (e.g. a plain string reject reason)", async () => {
    const provider = fakeProvider([
      { id: "1", name: "Player One", club: "A", position: "FW", nationality: "X", age: 20, squadNumber: 10 },
    ]);
    const supabase: SupabaseLike = {
      from(table) {
        expect(table).toBe("players");
        return {
          upsert() {
            return Promise.reject("plain string rejection");
          },
        };
      },
    };

    const summary = await runPlayerDataSync({ provider, supabase });

    expect(summary.skipped).toBe(1);
    expect(summary.errors[0]).toContain("plain string rejection");
  });

  it("reports every player's failure when all upserts fail, never throwing out of the function", async () => {
    const provider = new MockFootballDataProvider();
    const { supabase } = fakeSupabase(() => ({ error: { message: "db unavailable" } }));

    const summary = await runPlayerDataSync({ provider, supabase });

    expect(summary.synced).toBe(0);
    expect(summary.skipped).toBe(5);
    expect(summary.errors).toHaveLength(5);
  });
});

describe("runPlayerDataSync — no live network, no live DB", () => {
  it("never touches the real global fetch (provider and supabase are both fully injected)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const provider = new MockFootballDataProvider();
    const { supabase } = fakeSupabase(() => ({ error: null }));

    await runPlayerDataSync({ provider, supabase });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
