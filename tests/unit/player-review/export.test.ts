import { describe, expect, it } from "vitest";
import {
  buildPlayerReviewRows,
  runPlayerReviewExport,
  toReviewCsvText,
} from "@/lib/player-review/export";
import type {
  PlayerReviewExportSupabaseLike,
  PlayerReviewMappingRow,
  PlayerReviewPlayerRow,
} from "@/lib/player-review/types";

describe("buildPlayerReviewRows — column pre-fill (REQ-REVIEW-001, AC-GAME-CORE-033)", () => {
  it("pre-fills id/name/nationality/club/age from the players row and koreanName from a matched mapping", () => {
    const players: PlayerReviewPlayerRow[] = [
      {
        id: 1001,
        name: "Son Heung-min",
        nationality: "South Korea",
        club: "Tottenham Hotspur",
        age: 33,
        squad_number: 7,
      },
    ];
    const mappings: PlayerReviewMappingRow[] = [
      { original_name: "Son Heung-min", korean_name: "손흥민" },
    ];

    const rows = buildPlayerReviewRows(players, mappings);

    expect(rows).toEqual([
      {
        id: "1001",
        name: "Son Heung-min",
        nationality: "South Korea",
        club: "Tottenham Hotspur",
        age: "33",
        koreanName: "손흥민",
        squadNumber: "7",
      },
    ]);
  });

  it("leaves koreanName and squadNumber blank when no mapping/squad number exists", () => {
    const players: PlayerReviewPlayerRow[] = [
      { id: 1002, name: "New Signing", nationality: null, club: null, age: null, squad_number: null },
    ];

    const rows = buildPlayerReviewRows(players, []);

    expect(rows).toEqual([
      {
        id: "1002",
        name: "New Signing",
        nationality: "",
        club: "",
        age: "",
        koreanName: "",
        squadNumber: "",
      },
    ]);
  });

  it('never writes the literal string "null" for a null nationality/club/age', () => {
    const players: PlayerReviewPlayerRow[] = [
      { id: 1003, name: "X", nationality: null, club: null, age: null, squad_number: null },
    ];

    const [row] = buildPlayerReviewRows(players, []);

    expect(row.nationality).not.toBe("null");
    expect(row.club).not.toBe("null");
    expect(row.age).not.toBe("null");
    expect(row.squadNumber).not.toBe("null");
  });

  it("preserves a zero age or zero squad number rather than blanking it", () => {
    const players: PlayerReviewPlayerRow[] = [
      { id: 1004, name: "Edge Case", nationality: "X", club: "Y", age: 0, squad_number: 0 },
    ];

    const [row] = buildPlayerReviewRows(players, []);

    expect(row.age).toBe("0");
    expect(row.squadNumber).toBe("0");
  });

  it("joins players to mappings by name, not by array position", () => {
    const players: PlayerReviewPlayerRow[] = [
      { id: 1, name: "A", nationality: null, club: null, age: null, squad_number: null },
      { id: 2, name: "B", nationality: null, club: null, age: null, squad_number: null },
    ];
    const mappings: PlayerReviewMappingRow[] = [{ original_name: "B", korean_name: "비" }];

    const rows = buildPlayerReviewRows(players, mappings);

    expect(rows[0].koreanName).toBe("");
    expect(rows[1].koreanName).toBe("비");
  });
});

describe("toReviewCsvText — header + row shape", () => {
  it("emits the header row followed by one row per player", () => {
    const csv = toReviewCsvText([
      { id: "1", name: "A", nationality: "X", club: "Y", age: "20", koreanName: "가", squadNumber: "9" },
    ]);

    expect(csv).toBe("id,name,nationality,club,age,koreanName,squadNumber\n1,A,X,Y,20,가,9");
  });

  it("quotes a club name containing a comma", () => {
    const csv = toReviewCsvText([
      { id: "1", name: "A", nationality: "X", club: "Y, Z", age: "20", koreanName: "", squadNumber: "" },
    ]);

    expect(csv).toContain('"Y, Z"');
  });

  it("emits only the header for an empty row list", () => {
    expect(toReviewCsvText([])).toBe("id,name,nationality,club,age,koreanName,squadNumber");
  });
});

describe("runPlayerReviewExport — mock Supabase fixture (AC-GAME-CORE-033)", () => {
  function fakeSupabase(
    players: PlayerReviewPlayerRow[],
    mappings: PlayerReviewMappingRow[],
  ): PlayerReviewExportSupabaseLike {
    return {
      from(table: "players" | "korean_name_mappings") {
        if (table === "players") {
          return { select: () => Promise.resolve({ data: players, error: null }) };
        }
        return { select: () => Promise.resolve({ data: mappings, error: null }) };
      },
    } as PlayerReviewExportSupabaseLike;
  }

  it("joins players with their korean name mapping and returns the review rows", async () => {
    const supabase = fakeSupabase(
      [
        {
          id: 1,
          name: "Son Heung-min",
          nationality: "South Korea",
          club: "Tottenham",
          age: 33,
          squad_number: 7,
        },
      ],
      [{ original_name: "Son Heung-min", korean_name: "손흥민" }],
    );

    const rows = await runPlayerReviewExport({ supabase });

    expect(rows).toEqual([
      {
        id: "1",
        name: "Son Heung-min",
        nationality: "South Korea",
        club: "Tottenham",
        age: "33",
        koreanName: "손흥민",
        squadNumber: "7",
      },
    ]);
  });

  it("treats a null players result as an empty pool rather than throwing", async () => {
    const supabase: PlayerReviewExportSupabaseLike = {
      from(table: "players" | "korean_name_mappings") {
        if (table === "players") {
          return { select: () => Promise.resolve({ data: null, error: null }) };
        }
        return { select: () => Promise.resolve({ data: null, error: null }) };
      },
    } as PlayerReviewExportSupabaseLike;

    await expect(runPlayerReviewExport({ supabase })).resolves.toEqual([]);
  });

  it("throws a descriptive error when the players query fails", async () => {
    const supabase: PlayerReviewExportSupabaseLike = {
      from(table: "players" | "korean_name_mappings") {
        if (table === "players") {
          return { select: () => Promise.resolve({ data: null, error: { message: "db down" } }) };
        }
        return { select: () => Promise.resolve({ data: [], error: null }) };
      },
    } as PlayerReviewExportSupabaseLike;

    await expect(runPlayerReviewExport({ supabase })).rejects.toThrow(/db down/);
  });

  it("throws a descriptive error when the korean_name_mappings query fails", async () => {
    const supabase: PlayerReviewExportSupabaseLike = {
      from(table: "players" | "korean_name_mappings") {
        if (table === "players") {
          return { select: () => Promise.resolve({ data: [], error: null }) };
        }
        return { select: () => Promise.resolve({ data: null, error: { message: "mapping db down" } }) };
      },
    } as PlayerReviewExportSupabaseLike;

    await expect(runPlayerReviewExport({ supabase })).rejects.toThrow(/mapping db down/);
  });
});
