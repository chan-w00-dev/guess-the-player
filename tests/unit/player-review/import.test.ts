import { describe, expect, it } from "vitest";
import { buildReviewWriteBatches, parsePlayerReviewCsv } from "@/lib/player-review/import";

const HEADER = "id,name,nationality,club,age,koreanName,squadNumber";

describe("parsePlayerReviewCsv", () => {
  it("parses a CSV body into PlayerReviewRow objects keyed by the header columns", () => {
    const csv = `${HEADER}\n1001,Son Heung-min,South Korea,Tottenham,33,손흥민,7`;

    expect(parsePlayerReviewCsv(csv)).toEqual([
      {
        id: "1001",
        name: "Son Heung-min",
        nationality: "South Korea",
        club: "Tottenham",
        age: "33",
        koreanName: "손흥민",
        squadNumber: "7",
      },
    ]);
  });

  it("returns an empty array for a header-only CSV", () => {
    expect(parsePlayerReviewCsv(HEADER)).toEqual([]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parsePlayerReviewCsv("")).toEqual([]);
  });

  it("throws when the header does not match the expected column shape", () => {
    expect(() => parsePlayerReviewCsv("a,b,c\n1,2,3")).toThrow(/header/);
  });

  it("skips a blank line in the middle of the data rows", () => {
    const csv = [
      HEADER,
      "1001,Son Heung-min,South Korea,Tottenham,33,손흥민,7",
      "",
      "1002,New Signing,England,Arsenal,20,,",
    ].join("\n");

    const rows = parsePlayerReviewCsv(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("Son Heung-min");
    expect(rows[1].name).toBe("New Signing");
  });

  it("parses multiple data rows in order", () => {
    const csv = [
      HEADER,
      "1001,Son Heung-min,South Korea,Tottenham,33,손흥민,7",
      "1002,New Signing,England,Arsenal,20,,",
    ].join("\n");

    const rows = parsePlayerReviewCsv(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("Son Heung-min");
    expect(rows[1].name).toBe("New Signing");
  });
});

describe("buildReviewWriteBatches — non-blank cells only (REQ-REVIEW-002)", () => {
  it("collects a filled koreanName into the korean-name batch, name-keyed, and a filled squadNumber into the squad-number batch, id-keyed", () => {
    const rows = parsePlayerReviewCsv(`${HEADER}\n1001,Son Heung-min,South Korea,Tottenham,33,손흥민,7`);

    const { koreanMappings, squadNumberEntries } = buildReviewWriteBatches(rows);

    expect(koreanMappings).toEqual([{ originalName: "Son Heung-min", koreanName: "손흥민" }]);
    expect(squadNumberEntries).toEqual([{ id: 1001, squadNumber: 7 }]);
  });
});

describe("buildReviewWriteBatches — blank-cell-skip rule (REQ-REVIEW-003, AC-GAME-CORE-035)", () => {
  it("excludes a row with a blank koreanName cell from the korean-name batch, even when squadNumber is filled", () => {
    const rows = parsePlayerReviewCsv(`${HEADER}\n1002,New Signing,England,Arsenal,20,,10`);

    const { koreanMappings, squadNumberEntries } = buildReviewWriteBatches(rows);

    expect(koreanMappings).toEqual([]);
    expect(squadNumberEntries).toEqual([{ id: 1002, squadNumber: 10 }]);
  });

  it("excludes a row with a blank squadNumber cell from the squad-number batch, even when koreanName is filled", () => {
    const rows = parsePlayerReviewCsv(`${HEADER}\n1003,Another Player,France,Chelsea,25,다른선수,`);

    const { koreanMappings, squadNumberEntries } = buildReviewWriteBatches(rows);

    expect(koreanMappings).toEqual([{ originalName: "Another Player", koreanName: "다른선수" }]);
    expect(squadNumberEntries).toEqual([]);
  });

  it("excludes a row with both cells blank from both batches", () => {
    const rows = parsePlayerReviewCsv(`${HEADER}\n1004,Blank Both,Spain,Real,22,,`);

    const { koreanMappings, squadNumberEntries } = buildReviewWriteBatches(rows);

    expect(koreanMappings).toEqual([]);
    expect(squadNumberEntries).toEqual([]);
  });

  it("treats a whitespace-only cell as blank", () => {
    const rows = parsePlayerReviewCsv(`${HEADER}\n1005,Whitespace,Italy,Milan,28,   ,   `);

    const { koreanMappings, squadNumberEntries } = buildReviewWriteBatches(rows);

    expect(koreanMappings).toEqual([]);
    expect(squadNumberEntries).toEqual([]);
  });

  it("skips a non-numeric squadNumber cell rather than passing a NaN entry", () => {
    const rows = parsePlayerReviewCsv(`${HEADER}\n1006,Bad Number,Wales,Cardiff,19,,abc`);

    const { squadNumberEntries } = buildReviewWriteBatches(rows);

    expect(squadNumberEntries).toEqual([]);
  });

  it("processes multiple rows independently, mixing filled and blank cells", () => {
    const rows = parsePlayerReviewCsv(
      [
        HEADER,
        "1001,Son Heung-min,South Korea,Tottenham,33,손흥민,7",
        "1002,New Signing,England,Arsenal,20,,10",
        "1003,Another Player,France,Chelsea,25,다른선수,",
      ].join("\n"),
    );

    const { koreanMappings, squadNumberEntries } = buildReviewWriteBatches(rows);

    expect(koreanMappings).toEqual([
      { originalName: "Son Heung-min", koreanName: "손흥민" },
      { originalName: "Another Player", koreanName: "다른선수" },
    ]);
    expect(squadNumberEntries).toEqual([
      { id: 1001, squadNumber: 7 },
      { id: 1002, squadNumber: 10 },
    ]);
  });

  it("returns empty batches for an empty row list", () => {
    expect(buildReviewWriteBatches([])).toEqual({ koreanMappings: [], squadNumberEntries: [] });
  });
});
