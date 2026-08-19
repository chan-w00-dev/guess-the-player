import { describe, expect, it, vi } from "vitest";
import { searchPlayers } from "@/lib/player-search/search";
import type {
  KoreanMappingSearchRow,
  PlayerSearchRow,
  PlayerSearchSupabaseLike,
} from "@/lib/player-search/types";

/**
 * Converts a Postgres-style `ilike` pattern (with `\`-escaped literals) into
 * an equivalent case-insensitive, anchored JS `RegExp` — good enough to
 * exercise this module's wildcard-escaping contract (REQ boundary
 * sanitization, plan.md §D) against a lightweight in-memory fake, with zero
 * real network or DB access (mirrors `tests/unit/korean-name-mapping/mapper.test.ts`).
 */
function sqlIlikeToRegExp(pattern: string): RegExp {
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "\\" && i + 1 < pattern.length) {
      const next = pattern[i + 1];
      out += next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      i++;
      continue;
    }
    if (ch === "%") {
      out += ".*";
      continue;
    }
    if (ch === "_") {
      out += ".";
      continue;
    }
    out += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`, "i");
}

interface FakeQueryResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

function project<T extends object>(row: T, columns: string[]): Partial<T> {
  const out: Partial<T> = {};
  for (const c of columns) {
    const key = c as keyof T;
    out[key] = row[key];
  }
  return out;
}

function fakePlayersTable(
  rows: PlayerSearchRow[],
  opts: { ilikeError?: { message: string } } = {},
) {
  return {
    select(columnsStr: string) {
      const columns = columnsStr.split(",").map((c) => c.trim());
      return {
        ilike(column: "name", pattern: string): Promise<FakeQueryResult<PlayerSearchRow>> {
          if (opts.ilikeError) {
            return Promise.resolve({ data: null, error: opts.ilikeError });
          }
          const regex = sqlIlikeToRegExp(pattern);
          const matched = rows
            .filter((r) => regex.test(String(r[column])))
            .map((r) => project(r, columns) as PlayerSearchRow);
          return Promise.resolve({ data: matched, error: null });
        },
        in(column: "name", values: string[]): Promise<FakeQueryResult<PlayerSearchRow>> {
          const set = new Set(values);
          const matched = rows
            .filter((r) => set.has(r[column]))
            .map((r) => project(r, columns) as PlayerSearchRow);
          return Promise.resolve({ data: matched, error: null });
        },
      };
    },
  };
}

function fakeKoreanMappingsTable(
  rows: KoreanMappingSearchRow[],
  opts: { ilikeError?: { message: string } } = {},
) {
  return {
    select(columnsStr: string) {
      const columns = columnsStr.split(",").map((c) => c.trim());
      return {
        ilike(
          column: "korean_name",
          pattern: string,
        ): Promise<FakeQueryResult<KoreanMappingSearchRow>> {
          if (opts.ilikeError) {
            return Promise.resolve({ data: null, error: opts.ilikeError });
          }
          const regex = sqlIlikeToRegExp(pattern);
          const matched = rows
            .filter((r) => regex.test(String(r[column])))
            .map((r) => project(r, columns) as KoreanMappingSearchRow);
          return Promise.resolve({ data: matched, error: null });
        },
        // Reused by resolveKoreanName (lib/korean-name-mapping/mapper.ts) via
        // the internal MapperSupabaseLike bridge in search.ts.
        eq(column: "original_name", value: string) {
          return {
            maybeSingle() {
              const row = rows.find((r) => r[column] === value);
              return Promise.resolve({
                data: row ? (project(row, columns) as Pick<KoreanMappingSearchRow, "korean_name">) : null,
                error: null,
              });
            },
          };
        },
      };
    },
  };
}

const PLAYER_ROWS: PlayerSearchRow[] = [
  {
    id: 1,
    name: "Son Heung-min",
    club: "Tottenham Hotspur",
    position: "FW",
    nationality: "South Korea",
    age: 33,
    squad_number: 7,
  },
  {
    id: 2,
    name: "Erling Haaland",
    club: "Manchester City",
    position: "FW",
    nationality: "Norway",
    age: 25,
    squad_number: 9,
  },
  {
    id: 3,
    name: "John Doe",
    club: "Test FC",
    position: "MF",
    nationality: "USA",
    age: 27,
    squad_number: 10,
  },
  {
    id: 5,
    name: "Sonny",
    club: "Merge FC",
    position: "DF",
    nationality: "England",
    age: 24,
    squad_number: 4,
  },
  { id: 77, name: "BadPosition", club: null, position: "XX", nationality: null, age: null, squad_number: null },
  {
    id: 98,
    name: "Under_score",
    club: null,
    position: "GK",
    nationality: null,
    age: null,
    squad_number: null,
  },
  {
    id: 99,
    name: "Player%Percent",
    club: null,
    position: "DF",
    nationality: null,
    age: null,
    squad_number: null,
  },
];

const MAPPING_ROWS: KoreanMappingSearchRow[] = [
  { original_name: "Son Heung-min", korean_name: "손흥민" },
  { original_name: "Erling Haaland", korean_name: "홀란드" },
  { original_name: "Sonny", korean_name: "Sonny-KR" },
];

function buildFakeSupabase(
  opts: {
    players?: PlayerSearchRow[];
    mappings?: KoreanMappingSearchRow[];
    mappingIlikeError?: { message: string };
    playersIlikeError?: { message: string };
  } = {},
): PlayerSearchSupabaseLike {
  const players = opts.players ?? PLAYER_ROWS;
  const mappings = opts.mappings ?? MAPPING_ROWS;
  const playersTable = fakePlayersTable(players, { ilikeError: opts.playersIlikeError });
  const mappingsTable = fakeKoreanMappingsTable(mappings, { ilikeError: opts.mappingIlikeError });

  return {
    from(table: "players" | "korean_name_mappings") {
      if (table === "players") {
        return playersTable;
      }
      return mappingsTable;
    },
  } as PlayerSearchSupabaseLike;
}

describe("searchPlayers — Korean-language partial match (REQ-SEARCH-001, 002, AC-GAME-CORE-019)", () => {
  it("returns the matching candidate for a partial Korean query", async () => {
    const supabase = buildFakeSupabase();

    const results = await searchPlayers("손흥", { supabase });

    expect(results).toEqual([
      {
        id: "1",
        originalName: "Son Heung-min",
        koreanName: "손흥민",
        club: "Tottenham Hotspur",
        position: "FW",
        nationality: "South Korea",
        age: 33,
        squadNumber: 7,
      },
    ]);
  });

  it("returns the matching candidate for a different partial Korean query", async () => {
    const supabase = buildFakeSupabase();

    const results = await searchPlayers("홀란", { supabase });

    expect(results).toEqual([
      {
        id: "2",
        originalName: "Erling Haaland",
        koreanName: "홀란드",
        club: "Manchester City",
        position: "FW",
        nationality: "Norway",
        age: 25,
        squadNumber: 9,
      },
    ]);
  });
});

describe("searchPlayers — original-language / romanized partial match (REQ-SEARCH-003, AC-GAME-CORE-020)", () => {
  it("returns the matching candidate for a partial original-language query (case-insensitive)", async () => {
    const supabase = buildFakeSupabase();

    const results = await searchPlayers("haaland", { supabase });

    expect(results).toEqual([
      {
        id: "2",
        originalName: "Erling Haaland",
        koreanName: "홀란드",
        club: "Manchester City",
        position: "FW",
        nationality: "Norway",
        age: 25,
        squadNumber: 9,
      },
    ]);
  });

  it("falls back to the original name via resolveKoreanName reuse when no Korean mapping exists (REQ-KOREAN-003)", async () => {
    const supabase = buildFakeSupabase();

    const results = await searchPlayers("John", { supabase });

    expect(results).toEqual([
      {
        id: "3",
        originalName: "John Doe",
        koreanName: "John Doe",
        club: "Test FC",
        position: "MF",
        nationality: "USA",
        age: 27,
        squadNumber: 10,
      },
    ]);
  });

  it("excludes a candidate whose synced position fails the canonical FW/MF/DF/GK guard", async () => {
    const supabase = buildFakeSupabase();

    const results = await searchPlayers("BadPosition", { supabase });

    expect(results).toEqual([]);
  });
});

describe("searchPlayers — merge and de-duplicate across both match paths (plan.md §D constraint 2)", () => {
  it("returns exactly one candidate when a player matches via both the Korean path and the original-name path", async () => {
    const supabase = buildFakeSupabase();

    const results = await searchPlayers("Sonny", { supabase });

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      id: "5",
      originalName: "Sonny",
      koreanName: "Sonny-KR",
      club: "Merge FC",
      position: "DF",
      nationality: "England",
      age: 24,
      squadNumber: 4,
    });
  });
});

describe("searchPlayers — input sanitization at the search boundary (plan.md §D constraint 4)", () => {
  it("treats a literal '%' in the query as a literal character, not a SQL wildcard", async () => {
    const supabase = buildFakeSupabase();

    const results = await searchPlayers("%", { supabase });

    expect(results).toEqual([
      {
        id: "99",
        originalName: "Player%Percent",
        koreanName: "Player%Percent",
        club: null,
        position: "DF",
        nationality: null,
        age: null,
        squadNumber: null,
      },
    ]);
  });

  it("treats a literal '_' in the query as a literal character, not a SQL single-char wildcard", async () => {
    const supabase = buildFakeSupabase();

    const results = await searchPlayers("_", { supabase });

    expect(results).toEqual([
      {
        id: "98",
        originalName: "Under_score",
        koreanName: "Under_score",
        club: null,
        position: "GK",
        nationality: null,
        age: null,
        squadNumber: null,
      },
    ]);
  });
});

describe("searchPlayers — no match (REQ-SEARCH-005 precondition, AC-GAME-CORE-021)", () => {
  it("returns an empty array — never null/undefined — when nothing matches", async () => {
    const supabase = buildFakeSupabase();

    const results = await searchPlayers("zzz-no-such-player-zzz", { supabase });

    expect(results).toEqual([]);
    expect(results).not.toBeNull();
    expect(results).not.toBeUndefined();
  });

  it("never throws and degrades to an empty result when the Korean-mapping lookup errors", async () => {
    const supabase = buildFakeSupabase({
      mappingIlikeError: { message: "connection reset" },
      players: [],
    });

    await expect(searchPlayers("anything", { supabase })).resolves.toEqual([]);
  });

  it("never throws and degrades to an empty result when the players lookup errors", async () => {
    const supabase = buildFakeSupabase({
      playersIlikeError: { message: "connection reset" },
      mappings: [],
    });

    await expect(searchPlayers("anything", { supabase })).resolves.toEqual([]);
  });
});

describe("searchPlayers — Korean-path vs original-path equivalence (REQ-SEARCH-006 precondition, AC-GAME-CORE-022)", () => {
  it("resolves the same underlying player to an identical PlayerSearchCandidate via either match path", async () => {
    const supabase = buildFakeSupabase();

    const viaKorean = await searchPlayers("손흥", { supabase });
    const viaOriginal = await searchPlayers("Heung-min", { supabase });

    expect(viaKorean).toHaveLength(1);
    expect(viaOriginal).toHaveLength(1);
    expect(viaKorean[0]).toEqual(viaOriginal[0]);
  });
});

describe("searchPlayers — REQ-SEARCH-007 widened fields sourced from a single query, no new API call (M13 D3)", () => {
  it("populates nationality/age/squadNumber from the SAME players-table select() call that already fetched id/name/club/position — the original-language match path makes exactly 1 players-table call, unchanged from before this milestone", async () => {
    const playersTable = fakePlayersTable(PLAYER_ROWS);
    const selectSpy = vi.spyOn(playersTable, "select");
    const mappingsTable = fakeKoreanMappingsTable(MAPPING_ROWS);
    const supabase: PlayerSearchSupabaseLike = {
      from(table: "players" | "korean_name_mappings") {
        return table === "players" ? playersTable : mappingsTable;
      },
    } as PlayerSearchSupabaseLike;

    // "Haaland" matches no Korean-name mapping, so only the original-language
    // branch queries the `players` table — exactly 1 select() call, the same
    // single call this branch has always made (REQ-SEARCH-003, pre-M13). No
    // second/dedicated query was added to fetch the widened fields.
    const results = await searchPlayers("Haaland", { supabase });

    expect(selectSpy).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      {
        id: "2",
        originalName: "Erling Haaland",
        koreanName: "홀란드",
        club: "Manchester City",
        position: "FW",
        nationality: "Norway",
        age: 25,
        squadNumber: 9,
      },
    ]);
  });

  it("populates nationality/age/squadNumber from the Korean-match path's players-table select() call — still exactly the same 2-call total (Korean .in() + original .ilike()) this query has always made, no third call added", async () => {
    const playersTable = fakePlayersTable(PLAYER_ROWS);
    const selectSpy = vi.spyOn(playersTable, "select");
    const mappingsTable = fakeKoreanMappingsTable(MAPPING_ROWS);
    const supabase: PlayerSearchSupabaseLike = {
      from(table: "players" | "korean_name_mappings") {
        return table === "players" ? playersTable : mappingsTable;
      },
    } as PlayerSearchSupabaseLike;

    // "손흥" matches a Korean-name mapping (triggering the Korean-path
    // players.in() call) AND, unconditionally, the original-language
    // players.ilike() call also runs (REQ-SEARCH-003 regression-preserving)
    // — 2 total players-table calls, the same count this dual-path design
    // has always made since M6. The widened fields ride the SAME .in() call
    // that already resolved id/name/club/position for the Korean match.
    const results = await searchPlayers("손흥", { supabase });

    expect(selectSpy).toHaveBeenCalledTimes(2);
    expect(results[0]).toMatchObject({
      nationality: "South Korea",
      age: 33,
      squadNumber: 7,
    });
  });
});
