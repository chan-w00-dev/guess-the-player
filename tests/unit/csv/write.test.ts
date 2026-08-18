import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv/parse";
import { writeCsv } from "@/lib/csv/write";

describe("writeCsv — plain fields", () => {
  it("joins cells with commas and rows with newlines", () => {
    expect(
      writeCsv([
        ["a", "b", "c"],
        ["1", "2", "3"],
      ]),
    ).toBe("a,b,c\n1,2,3");
  });

  it("returns an empty string for zero rows", () => {
    expect(writeCsv([])).toBe("");
  });
});

describe("writeCsv — quoting", () => {
  it("quotes a field containing a comma", () => {
    expect(writeCsv([["Doe, John", "Arsenal"]])).toBe('"Doe, John",Arsenal');
  });

  it("doubles an internal double-quote and wraps the field in quotes", () => {
    expect(writeCsv([['Say "hi"']])).toBe('"Say ""hi"""');
  });

  it("quotes a field containing a newline", () => {
    expect(writeCsv([["line one\nline two"]])).toBe('"line one\nline two"');
  });

  it("leaves an empty field as an empty, unquoted string", () => {
    expect(writeCsv([["a", "", "c"]])).toBe("a,,c");
  });

  it("leaves a plain field without comma/quote/newline unquoted", () => {
    expect(writeCsv([["Tottenham Hotspur"]])).toBe("Tottenham Hotspur");
  });
});

describe("writeCsv / parseCsv round trip", () => {
  it("round-trips plain fields, a comma field, a quote field, and an empty field", () => {
    const rows = [
      ["id", "name", "note"],
      ["1", "Doe, John", ""],
      ["2", 'Say "hi"', "plain"],
    ];
    expect(parseCsv(writeCsv(rows))).toEqual(rows);
  });
});
