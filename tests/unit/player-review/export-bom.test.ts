import { describe, expect, it } from "vitest";
import { withUtf8Bom } from "@/scripts/export-players-for-review";

describe("withUtf8Bom (REQ-REVIEW-001 Excel-compat fix)", () => {
  it("prepends the UTF-8 BOM to the given CSV text", () => {
    const csvText = "id,name\n1001,Ødegaard";

    const result = withUtf8Bom(csvText);

    expect(result).toBe(`﻿${csvText}`);
    expect(result.charCodeAt(0)).toBe(0xfeff);
  });

  it("does not alter the CSV content following the BOM", () => {
    const csvText = "id,name\n1001,Ødegaard";

    const result = withUtf8Bom(csvText);

    expect(result.slice(1)).toBe(csvText);
  });
});
