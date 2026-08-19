import { describe, expect, it } from "vitest";
import { getNationalityFlag } from "@/lib/game/nationality-flags";

/** The 69 ground-truth nationality values (spec.md REQ-COMPARE-010). */
const ALL_NATIONALITIES = [
  "Albania",
  "Algeria",
  "Argentina",
  "Australia",
  "Austria",
  "Belgium",
  "Bosnia-Herzegovina",
  "Brazil",
  "Bulgaria",
  "Burkina Faso",
  "Cameroon",
  "Canada",
  "Chile",
  "Colombia",
  "Congo DR",
  "Croatia",
  "Czech Republic",
  "Denmark",
  "Ecuador",
  "Egypt",
  "England",
  "France",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Guinea-Bissau",
  "Haiti",
  "Hungary",
  "Iceland",
  "Indonesia",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Ivory Coast",
  "Jamaica",
  "Japan",
  "Luxembourg",
  "Mali",
  "Morocco",
  "Mozambique",
  "Netherlands",
  "New Zealand",
  "Nigeria",
  "Northern Ireland",
  "Norway",
  "Paraguay",
  "Poland",
  "Portugal",
  "Scotland",
  "Senegal",
  "Serbia",
  "Sierra Leone",
  "Slovakia",
  "Slovenia",
  "South Korea",
  "Spain",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Trinidad & Tobago",
  "Turkey",
  "USA",
  "Ukraine",
  "Uruguay",
  "Uzbekistan",
  "Wales",
];

/** Regional-indicator-derived plain flag for a 2-letter ISO code — same algorithm the module uses internally, re-derived here so this test does not depend on the module's private implementation. */
function regionalIndicatorFlag(iso2: string): string {
  const base = 0x1f1e6;
  const a = "A".charCodeAt(0);
  return [...iso2.toUpperCase()]
    .map((letter) => String.fromCodePoint(base + (letter.charCodeAt(0) - a)))
    .join("");
}

describe("getNationalityFlag (REQ-COMPARE-010, AC-GAME-CORE-039)", () => {
  it("has exactly 69 ground-truth nationality values under test", () => {
    expect(ALL_NATIONALITIES).toHaveLength(69);
  });

  it.each(ALL_NATIONALITIES)("resolves %s to a non-null flag string", (nationality) => {
    const flag = getNationalityFlag(nationality);
    expect(flag).not.toBeNull();
    expect(typeof flag).toBe("string");
    expect(flag!.length).toBeGreaterThan(0);
  });

  describe("England / Scotland / Wales special subdivision flags", () => {
    it("produces three different flag strings for England, Scotland, and Wales", () => {
      const england = getNationalityFlag("England");
      const scotland = getNationalityFlag("Scotland");
      const wales = getNationalityFlag("Wales");

      expect(england).not.toBe(scotland);
      expect(england).not.toBe(wales);
      expect(scotland).not.toBe(wales);
    });

    it("England's flag differs from the plain UK flag", () => {
      const england = getNationalityFlag("England");
      const plainGb = regionalIndicatorFlag("GB");
      expect(england).not.toBe(plainGb);
    });

    it("Scotland's flag differs from the plain UK flag", () => {
      const scotland = getNationalityFlag("Scotland");
      const plainGb = regionalIndicatorFlag("GB");
      expect(scotland).not.toBe(plainGb);
    });

    it("Wales's flag differs from the plain UK flag", () => {
      const wales = getNationalityFlag("Wales");
      const plainGb = regionalIndicatorFlag("GB");
      expect(wales).not.toBe(plainGb);
    });

    it("each home-nation flag begins with the black flag base character (tag-sequence construction)", () => {
      const blackFlag = "\u{1F3F4}";
      expect(getNationalityFlag("England")!.startsWith(blackFlag)).toBe(true);
      expect(getNationalityFlag("Scotland")!.startsWith(blackFlag)).toBe(true);
      expect(getNationalityFlag("Wales")!.startsWith(blackFlag)).toBe(true);
    });
  });

  describe("Northern Ireland fallback exception (recorded, user-confirmed)", () => {
    it("resolves to exactly the programmatically-derived plain-GB flag, not a hardcoded literal, not the England flag, and not a new/wrong flag", () => {
      const northernIreland = getNationalityFlag("Northern Ireland");
      const plainGb = regionalIndicatorFlag("GB");
      const england = getNationalityFlag("England");

      expect(northernIreland).toBe(plainGb);
      expect(northernIreland).not.toBe(england);
    });
  });

  describe("REQ-COMPARE-012 fallback", () => {
    it("returns null for an unmapped nationality string", () => {
      expect(getNationalityFlag("Atlantis")).toBeNull();
    });

    it("returns null for null input", () => {
      expect(getNationalityFlag(null)).toBeNull();
    });

    it("never throws for an unmapped or null input", () => {
      expect(() => getNationalityFlag("Not A Real Country")).not.toThrow();
      expect(() => getNationalityFlag(null)).not.toThrow();
    });
  });
});
