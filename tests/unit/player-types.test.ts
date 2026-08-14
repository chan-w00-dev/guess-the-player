import { describe, expect, it } from "vitest";
import { isPosition, POSITIONS, type Player, type Position } from "@/types/player";

describe("Position taxonomy (REQ-COMPARE-005)", () => {
  it("POSITIONS contains exactly the 4 canonical values", () => {
    expect(POSITIONS).toHaveLength(4);
    expect(new Set(POSITIONS)).toEqual(new Set(["FW", "MF", "DF", "GK"]));
  });

  it.each(["FW", "MF", "DF", "GK"] as const)(
    "isPosition accepts the canonical value %s",
    (value) => {
      expect(isPosition(value)).toBe(true);
    },
  );

  it.each([
    "Attacker",
    "fw",
    "",
    "Goalkeeper",
    "Centre-Forward",
    123,
    null,
    undefined,
    {},
    ["FW"],
  ])("isPosition rejects non-canonical value %j", (value) => {
    expect(isPosition(value)).toBe(false);
  });

  it("every POSITIONS entry passes isPosition", () => {
    for (const position of POSITIONS) {
      expect(isPosition(position)).toBe(true);
    }
  });
});

describe("Player domain type (types/player.ts)", () => {
  it("accepts a fully-populated player", () => {
    const player: Player = {
      id: "p-1",
      name: "Son Heung-min",
      club: "Tottenham Hotspur",
      position: "FW",
      nationality: "South Korea",
      age: 33,
      photo: "https://example.com/son.jpg",
    };

    expect(player.id).toBe("p-1");
    expect(isPosition(player.position)).toBe(true);
  });

  it("allows the optional photo field to be omitted", () => {
    const player: Player = {
      id: "p-2",
      name: "New Signing",
      club: "Some FC",
      position: "MF",
      nationality: "England",
      age: 21,
    };

    expect(player.photo).toBeUndefined();
  });

  it("allows nullable club/nationality/age for incomplete synced data (REQ-COMPARE-007)", () => {
    const player: Player = {
      id: "p-3",
      name: "Unconfirmed Transfer",
      club: null,
      position: "DF",
      nationality: null,
      age: null,
    };

    expect(player.club).toBeNull();
    expect(player.nationality).toBeNull();
    expect(player.age).toBeNull();
  });

  it("still requires position to always be one of the 4 canonical values, never null", () => {
    // Compile-time only assertion: `position` is typed as the non-nullable
    // `Position` union — an unmapped raw string never reaches Player per the
    // plan.md §B fallback (log + skip that player for the sync run).
    const position: Position = "GK";
    const player: Player = {
      id: "p-4",
      name: "Keeper",
      club: "Some FC",
      position,
      nationality: "France",
      age: 29,
    };

    expect(isPosition(player.position)).toBe(true);
  });
});
