import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv/parse";

describe("parseCsv — plain fields", () => {
  it("parses a header row and a data row into a string[][] matrix", () => {
    const result = parseCsv("a,b,c\n1,2,3");
    expect(result).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("does not append a phantom trailing row for a trailing newline", () => {
    expect(parseCsv("a,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("handles CRLF row terminators", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("handles a lone CR (not followed by LF) as a row terminator", () => {
    expect(parseCsv("a,b\r1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("parseCsv — quoted fields", () => {
  it("un-quotes a field containing a comma", () => {
    const result = parseCsv('name,club\n"Doe, John",Arsenal');
    expect(result).toEqual([
      ["name", "club"],
      ["Doe, John", "Arsenal"],
    ]);
  });

  it("un-escapes a doubled double-quote inside a quoted field", () => {
    const result = parseCsv('name\n"Say ""hi"""');
    expect(result).toEqual([["name"], ['Say "hi"']]);
  });

  it("preserves a literal newline inside a quoted field", () => {
    const result = parseCsv('note\n"line one\nline two"');
    expect(result).toEqual([["note"], ["line one\nline two"]]);
  });

  it("preserves an empty field", () => {
    const result = parseCsv("a,,c\n1,,3");
    expect(result).toEqual([
      ["a", "", "c"],
      ["1", "", "3"],
    ]);
  });
});
