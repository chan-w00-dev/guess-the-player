import { describe, expect, it } from "vitest";
import { mapPosition } from "@/lib/football-api/position-mapper";

describe("mapPosition — Goalkeeper (rule 1)", () => {
  it.each(["Goalkeeper", "GOALKEEPER", "goalkeeper"])(
    'classifies "%s" as GK',
    (raw) => {
      expect(mapPosition(raw)).toBe("GK");
    },
  );
});

describe("mapPosition — Midfield (rule 2, checked before Back/Defen and Forward/Attack)", () => {
  it.each(["Midfield", "Central Midfield", "MIDFIELD"])(
    'classifies "%s" as MF',
    (raw) => {
      expect(mapPosition(raw)).toBe("MF");
    },
  );

  it('classifies "Attacking Midfield" as MF, not FW via the "Attack" keyword', () => {
    expect(mapPosition("Attacking Midfield")).toBe("MF");
  });

  it('classifies "Defensive Midfield" as MF, not DF via the "Defen" keyword', () => {
    expect(mapPosition("Defensive Midfield")).toBe("MF");
  });

  it('classifies "Right Attacking Midfield" as MF (Midfield keyword wins regardless of position in the string)', () => {
    expect(mapPosition("Right Attacking Midfield")).toBe("MF");
  });
});

describe("mapPosition — Back/Defen (rule 3)", () => {
  it.each(["Defender", "Centre-Back", "Right-Back", "Left-Back", "Defence", "Defensive"])(
    'classifies "%s" as DF',
    (raw) => {
      expect(mapPosition(raw)).toBe("DF");
    },
  );
});

describe("mapPosition — Forward/Winger/Attack/Striker (rule 4)", () => {
  it.each(["Forward", "Centre-Forward", "Left Winger", "Right Winger", "Attack", "Striker"])(
    'classifies "%s" as FW',
    (raw) => {
      expect(mapPosition(raw)).toBe("FW");
    },
  );
});

describe("mapPosition — fallback (rule 5, unmapped values)", () => {
  it.each(["Coach", "Manager", "", "Unknown Role", "Physio"])(
    'returns null for unmapped raw value "%s"',
    (raw) => {
      expect(mapPosition(raw)).toBeNull();
    },
  );
});

describe("mapPosition — case-insensitivity across all rules", () => {
  it("matches regardless of casing", () => {
    expect(mapPosition("gOaLkEePeR")).toBe("GK");
    expect(mapPosition("mIdFiElD")).toBe("MF");
    expect(mapPosition("dEfEnDeR")).toBe("DF");
    expect(mapPosition("fOrWaRd")).toBe("FW");
  });
});
