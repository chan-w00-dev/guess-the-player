import { describe, expect, it } from "vitest";
import { parsePlayerReviewCsv } from "@/lib/player-review";
import { stripUtf8Bom } from "@/scripts/import-players-review";

describe("stripUtf8Bom (REQ-REVIEW-002/003 Excel-compat fix)", () => {
  it("strips a single leading UTF-8 BOM when present", () => {
    const csvText = "﻿id,name\n1001,Ødegaard";

    const result = stripUtf8Bom(csvText);

    expect(result).toBe("id,name\n1001,Ødegaard");
    expect(result.charCodeAt(0)).not.toBe(0xfeff);
  });

  it("leaves CSV text unchanged when no BOM is present", () => {
    const csvText = "id,name\n1001,Ødegaard";

    expect(stripUtf8Bom(csvText)).toBe(csvText);
  });

  it("correctly unblocks header parsing that would otherwise corrupt the first column name", () => {
    const csvTextWithBom =
      "﻿id,name,nationality,club,age,koreanName,squadNumber\n1001,Ødegaard,Norway,Real Madrid,25,오데가르,8";

    const rows = parsePlayerReviewCsv(stripUtf8Bom(csvTextWithBom));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "1001", name: "Ødegaard" });
  });
});
