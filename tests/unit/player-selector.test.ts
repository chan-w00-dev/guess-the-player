import { describe, expect, it } from "vitest";
import {
  selectTargetPlayer,
  type PlayerSelectorMappingRow,
  type PlayerSelectorPlayerRow,
  type PlayerSelectorSupabaseLike,
} from "@/lib/game/player-selector";

/**
 * Lightweight in-memory fake mirroring the `.select(columns)`-returns-a-
 * promise-directly style established by `lib/player-review/export.ts`'s
 * `PlayerReviewExportSupabaseLike` (no `.ilike()`/`.eq()` builder chain
 * needed — every filter for REQ-SELECT-005 happens in application code,
 * exactly like the review-export join).
 */
function buildFakeSupabase(
  opts: {
    players?: PlayerSelectorPlayerRow[];
    mappings?: PlayerSelectorMappingRow[];
    playersError?: { message: string };
    mappingsError?: { message: string };
  } = {},
): PlayerSelectorSupabaseLike {
  const players = opts.players ?? [];
  const mappings = opts.mappings ?? [];

  return {
    from(table: "players" | "korean_name_mappings") {
      if (table === "players") {
        return {
          select() {
            return Promise.resolve({
              data: opts.playersError ? null : players,
              error: opts.playersError ?? null,
            });
          },
        };
      }
      return {
        select() {
          return Promise.resolve({
            data: opts.mappingsError ? null : mappings,
            error: opts.mappingsError ?? null,
          });
        },
      };
    },
  } as PlayerSelectorSupabaseLike;
}

const PLAYER_A: PlayerSelectorPlayerRow = {
  id: 1,
  name: "Son Heung-min",
  club: "Tottenham Hotspur",
  position: "FW",
  nationality: "South Korea",
  age: 33,
  squad_number: 7,
  photo_url: null,
};

const PLAYER_B: PlayerSelectorPlayerRow = {
  id: 2,
  name: "Erling Haaland",
  club: "Manchester City",
  position: "FW",
  nationality: "Norway",
  age: 25,
  squad_number: 9,
  photo_url: "https://example.com/haaland.jpg",
};

/** Missing a Korean name mapping — ineligible per REQ-SELECT-005. */
const PLAYER_NO_MAPPING: PlayerSelectorPlayerRow = {
  id: 3,
  name: "No Mapping FC",
  club: "Test FC",
  position: "MF",
  nationality: "England",
  age: 22,
  squad_number: 10,
  photo_url: null,
};

/** Missing a registered squad number — ineligible per REQ-SELECT-005. */
const PLAYER_NO_SQUAD_NUMBER: PlayerSelectorPlayerRow = {
  id: 4,
  name: "No Squad Number FC",
  club: "Test FC",
  position: "DF",
  nationality: "England",
  age: 27,
  squad_number: null,
  photo_url: null,
};

/** Fails the canonical FW/MF/DF/GK position guard — excluded defensively. */
const PLAYER_BAD_POSITION: PlayerSelectorPlayerRow = {
  id: 5,
  name: "Bad Position FC",
  club: "Test FC",
  position: "XX",
  nationality: "England",
  age: 30,
  squad_number: 11,
  photo_url: null,
};

const MAPPING_A: PlayerSelectorMappingRow = {
  original_name: "Son Heung-min",
  korean_name: "손흥민",
};
const MAPPING_B: PlayerSelectorMappingRow = {
  original_name: "Erling Haaland",
  korean_name: "홀란드",
};
const MAPPING_BAD_POSITION: PlayerSelectorMappingRow = {
  original_name: "Bad Position FC",
  korean_name: "Bad Position KR",
};

describe("selectTargetPlayer — random selection + duplicate avoidance (REQ-SELECT-001, 002, AC-GAME-CORE-001)", () => {
  it("excludes the immediately preceding round's target when the eligible pool has >= 2 players", async () => {
    const supabase = buildFakeSupabase({
      players: [PLAYER_A, PLAYER_B],
      mappings: [MAPPING_A, MAPPING_B],
    });

    const result = await selectTargetPlayer({
      supabase,
      excludePlayerId: "1",
      random: () => 0.5,
    });

    expect(result.status).toBe("selected");
    if (result.status === "selected") {
      expect(result.player.id).toBe("2");
    }
  });

  it("selects a uniformly-random candidate from a pool of >= 2 via the injected random() index", async () => {
    const supabase = buildFakeSupabase({
      players: [PLAYER_A, PLAYER_B],
      mappings: [MAPPING_A, MAPPING_B],
    });

    const low = await selectTargetPlayer({ supabase, random: () => 0 });
    const high = await selectTargetPlayer({ supabase, random: () => 0.999999 });

    expect(low.status).toBe("selected");
    expect(high.status).toBe("selected");
    if (low.status === "selected" && high.status === "selected") {
      expect(low.player.id).toBe("1");
      expect(high.player.id).toBe("2");
    }
  });

  it("does not exclude anything when excludePlayerId does not match any eligible player", async () => {
    const supabase = buildFakeSupabase({
      players: [PLAYER_A, PLAYER_B],
      mappings: [MAPPING_A, MAPPING_B],
    });

    const result = await selectTargetPlayer({
      supabase,
      excludePlayerId: "does-not-exist",
      random: () => 0,
    });

    expect(result.status).toBe("selected");
    if (result.status === "selected") {
      expect(result.player.id).toBe("1");
    }
  });
});

describe("selectTargetPlayer — single-player pool allows immediate repeat (REQ-SELECT-003, AC-GAME-CORE-002)", () => {
  it("selects the sole eligible player even when it matches excludePlayerId", async () => {
    const supabase = buildFakeSupabase({
      players: [PLAYER_A],
      mappings: [MAPPING_A],
    });

    const result = await selectTargetPlayer({
      supabase,
      excludePlayerId: "1",
      random: () => 0.5,
    });

    expect(result.status).toBe("selected");
    if (result.status === "selected") {
      expect(result.player.id).toBe("1");
    }
  });

  it("selects the sole eligible player when the injected random() option is omitted", async () => {
    const supabase = buildFakeSupabase({
      players: [PLAYER_A],
      mappings: [MAPPING_A],
    });

    const result = await selectTargetPlayer({ supabase });

    expect(result.status).toBe("selected");
    if (result.status === "selected") {
      expect(result.player.id).toBe("1");
    }
  });
});

describe("selectTargetPlayer — empty pool never starts a round (REQ-SELECT-004, AC-GAME-CORE-003)", () => {
  it("returns empty-pool when the players table has zero rows", async () => {
    const supabase = buildFakeSupabase({ players: [], mappings: [] });

    const result = await selectTargetPlayer({ supabase });

    expect(result).toEqual({ status: "empty-pool" });
  });

  it("returns empty-pool when every player fails the REQ-SELECT-005 pool filter", async () => {
    const supabase = buildFakeSupabase({
      players: [PLAYER_NO_MAPPING, PLAYER_NO_SQUAD_NUMBER],
      mappings: [],
    });

    const result = await selectTargetPlayer({ supabase });

    expect(result).toEqual({ status: "empty-pool" });
  });

  it("returns empty-pool (never throws) when the players query errors", async () => {
    const supabase = buildFakeSupabase({ playersError: { message: "boom" } });

    const result = await selectTargetPlayer({ supabase });

    expect(result).toEqual({ status: "empty-pool" });
  });

  it("returns empty-pool (never throws) when the korean_name_mappings query errors", async () => {
    const supabase = buildFakeSupabase({
      players: [PLAYER_A],
      mappingsError: { message: "boom" },
    });

    const result = await selectTargetPlayer({ supabase });

    expect(result).toEqual({ status: "empty-pool" });
  });
});

describe("selectTargetPlayer — REQ-SELECT-005 pool restriction (AC-GAME-CORE-032)", () => {
  it("only ever selects from players with BOTH a squad number AND a Korean mapping", async () => {
    const supabase = buildFakeSupabase({
      players: [PLAYER_A, PLAYER_B, PLAYER_NO_MAPPING, PLAYER_NO_SQUAD_NUMBER],
      mappings: [MAPPING_A, MAPPING_B],
    });

    const seenIds = new Set<string>();
    for (const randomValue of [0, 0.25, 0.5, 0.75, 0.99]) {
      const result = await selectTargetPlayer({ supabase, random: () => randomValue });
      expect(result.status).toBe("selected");
      if (result.status === "selected") {
        seenIds.add(result.player.id);
      }
    }

    expect(seenIds).toEqual(new Set(["1", "2"]));
  });

  it("excludes a player missing only a Korean mapping (squad number present)", async () => {
    const supabase = buildFakeSupabase({
      players: [PLAYER_A, PLAYER_NO_MAPPING],
      mappings: [MAPPING_A],
    });

    const result = await selectTargetPlayer({ supabase, random: () => 0.9 });

    expect(result.status).toBe("selected");
    if (result.status === "selected") {
      expect(result.player.id).toBe("1");
    }
  });

  it("excludes a player missing only a squad number (Korean mapping present)", async () => {
    const supabase = buildFakeSupabase({
      players: [PLAYER_A, PLAYER_NO_SQUAD_NUMBER],
      mappings: [MAPPING_A],
    });

    const result = await selectTargetPlayer({ supabase, random: () => 0.9 });

    expect(result.status).toBe("selected");
    if (result.status === "selected") {
      expect(result.player.id).toBe("1");
    }
  });

  it("skips a row that fails the canonical position guard even when otherwise eligible", async () => {
    const supabase = buildFakeSupabase({
      players: [PLAYER_A, PLAYER_BAD_POSITION],
      mappings: [MAPPING_A, MAPPING_BAD_POSITION],
    });

    const result = await selectTargetPlayer({ supabase, random: () => 0.9 });

    expect(result.status).toBe("selected");
    if (result.status === "selected") {
      expect(result.player.id).toBe("1");
    }
  });
});

describe("selectTargetPlayer — Player row conversion", () => {
  it("converts every synced field and maps squad_number to squadNumber", async () => {
    const supabase = buildFakeSupabase({
      players: [PLAYER_B],
      mappings: [MAPPING_B],
    });

    const result = await selectTargetPlayer({ supabase });

    expect(result.status).toBe("selected");
    if (result.status === "selected") {
      expect(result.player).toEqual({
        id: "2",
        name: "Erling Haaland",
        club: "Manchester City",
        position: "FW",
        nationality: "Norway",
        age: 25,
        squadNumber: 9,
        photo: "https://example.com/haaland.jpg",
      });
    }
  });

  it("omits the optional photo field when photo_url is null", async () => {
    const supabase = buildFakeSupabase({
      players: [PLAYER_A],
      mappings: [MAPPING_A],
    });

    const result = await selectTargetPlayer({ supabase });

    expect(result.status).toBe("selected");
    if (result.status === "selected") {
      expect(result.player.photo).toBeUndefined();
      expect("photo" in result.player).toBe(false);
    }
  });
});
