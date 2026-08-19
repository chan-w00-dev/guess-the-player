import { describe, expect, it } from "vitest";
import {
  getPlayerById,
  type PlayerLookupPlayerRow,
  type PlayerLookupSupabaseLike,
} from "@/lib/game/player-lookup";

/**
 * Lightweight in-memory fake, mirroring the `.select().eq().maybeSingle()`
 * builder-chain style established by `lib/korean-name-mapping/mapper.ts`'s
 * test fakes.
 */
function buildFakeSupabase(opts: {
  row?: PlayerLookupPlayerRow | null;
  error?: { message: string };
}): PlayerLookupSupabaseLike {
  const queryBuilder = {
    eq() {
      return queryBuilder;
    },
    maybeSingle() {
      return Promise.resolve({
        data: opts.error ? null : (opts.row ?? null),
        error: opts.error ?? null,
      });
    },
  };

  return {
    from() {
      return {
        select() {
          return queryBuilder;
        },
      };
    },
  } as PlayerLookupSupabaseLike;
}

const PLAYER_ROW: PlayerLookupPlayerRow = {
  id: 42,
  name: "Bukayo Saka",
  club: "Arsenal",
  position: "MF",
  nationality: "England",
  age: 24,
  squad_number: 7,
  photo_url: null,
};

describe("getPlayerById — found (D2)", () => {
  it("maps a matching row to a Player", async () => {
    const supabase = buildFakeSupabase({ row: PLAYER_ROW });

    const player = await getPlayerById({ supabase, id: "42" });

    expect(player).toEqual({
      id: "42",
      name: "Bukayo Saka",
      club: "Arsenal",
      position: "MF",
      nationality: "England",
      age: 24,
      squadNumber: 7,
    });
  });

  it("includes the optional photo field when photo_url is present", async () => {
    const supabase = buildFakeSupabase({
      row: { ...PLAYER_ROW, photo_url: "https://example.com/saka.jpg" },
    });

    const player = await getPlayerById({ supabase, id: "42" });

    expect(player?.photo).toBe("https://example.com/saka.jpg");
  });
});

describe("getPlayerById — not found (D2)", () => {
  it("returns null when no row matches the id", async () => {
    const supabase = buildFakeSupabase({ row: null });

    const player = await getPlayerById({ supabase, id: "999" });

    expect(player).toBeNull();
  });
});

describe("getPlayerById — Supabase error (D2, never throws)", () => {
  it("returns null when the underlying query errors", async () => {
    const supabase = buildFakeSupabase({ error: { message: "connection reset" } });

    const player = await getPlayerById({ supabase, id: "42" });

    expect(player).toBeNull();
  });
});

describe("getPlayerById — defensive position guard", () => {
  it("returns null when the row's position fails the canonical enum guard", async () => {
    const supabase = buildFakeSupabase({
      row: { ...PLAYER_ROW, position: "Central Midfield" },
    });

    const player = await getPlayerById({ supabase, id: "42" });

    expect(player).toBeNull();
  });
});
