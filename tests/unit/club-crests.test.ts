import { describe, expect, it } from "vitest";
import { getClubCrestUrl } from "@/lib/game/club-crests";

const EXPECTED: Array<[string, string]> = [
  ["Arsenal FC", "https://crests.football-data.org/57.png"],
  ["Aston Villa FC", "https://crests.football-data.org/58.png"],
  ["Chelsea FC", "https://crests.football-data.org/61.png"],
  ["Everton FC", "https://crests.football-data.org/62.png"],
  ["Fulham FC", "https://crests.football-data.org/63.png"],
  ["Liverpool FC", "https://crests.football-data.org/64.png"],
  ["Manchester City FC", "https://crests.football-data.org/65.png"],
  ["Manchester United FC", "https://crests.football-data.org/66.png"],
  ["Newcastle United FC", "https://crests.football-data.org/67.png"],
  ["Sunderland AFC", "https://crests.football-data.org/71.png"],
  ["Tottenham Hotspur FC", "https://crests.football-data.org/73.png"],
  ["Hull City AFC", "https://crests.football-data.org/322.png"],
  ["Leeds United FC", "https://crests.football-data.org/341.png"],
  ["Ipswich Town FC", "https://crests.football-data.org/349.png"],
  ["Nottingham Forest FC", "https://crests.football-data.org/351.png"],
  ["Crystal Palace FC", "https://crests.football-data.org/354.png"],
  ["Brighton & Hove Albion FC", "https://crests.football-data.org/397.png"],
  ["Brentford FC", "https://crests.football-data.org/402.png"],
  ["AFC Bournemouth", "https://crests.football-data.org/bournemouth.png"],
  ["Coventry City FC", "https://crests.football-data.org/1076.png"],
];

describe("getClubCrestUrl (REQ-COMPARE-011, AC-GAME-CORE-040)", () => {
  it("has exactly 20 entries in the verified mapping", () => {
    expect(EXPECTED).toHaveLength(20);
  });

  it.each(EXPECTED)("resolves %s to its verified crest URL", (club, url) => {
    expect(getClubCrestUrl(club)).toBe(url);
  });

  it("returns null for an unmapped club name (REQ-COMPARE-012)", () => {
    expect(getClubCrestUrl("FC Barcelona")).toBeNull();
  });

  it("returns null for null input (REQ-COMPARE-012)", () => {
    expect(getClubCrestUrl(null)).toBeNull();
  });

  it("never throws for an unmapped or null input", () => {
    expect(() => getClubCrestUrl("Not A Real Club")).not.toThrow();
    expect(() => getClubCrestUrl(null)).not.toThrow();
  });
});
