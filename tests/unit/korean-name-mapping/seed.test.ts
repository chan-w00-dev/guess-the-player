import { describe, expect, it, vi } from "vitest";
import { runKoreanNameSeed } from "@/lib/korean-name-mapping/seed";
import type { KoreanMappingRow, SeedSupabaseLike } from "@/lib/korean-name-mapping/types";
import type { KoreanMapping } from "@/types/comparison";

/**
 * Builds a fake `SeedSupabaseLike` whose `upsert` records every call and
 * resolves/rejects per the provided per-call behavior — zero real network or
 * DB access (AC-GAME-CORE-017).
 */
function fakeSupabase(
  behavior: (row: KoreanMappingRow) => { error: { message: string } | null } | never,
): { supabase: SeedSupabaseLike; calls: KoreanMappingRow[] } {
  const calls: KoreanMappingRow[] = [];
  const supabase: SeedSupabaseLike = {
    from(table) {
      expect(table).toBe("korean_name_mappings");
      return {
        upsert(values, options) {
          expect(options).toEqual({ onConflict: "original_name" });
          calls.push(values);
          return Promise.resolve(behavior(values));
        },
      };
    },
  };
  return { supabase, calls };
}

const SAMPLE_MAPPINGS: KoreanMapping[] = [
  { originalName: "Son Heung-min", koreanName: "손흥민" },
  { originalName: "Erling Haaland", koreanName: "홀란드" },
  { originalName: "Kevin De Bruyne", koreanName: "케빈 더 브라위너" },
];

describe("runKoreanNameSeed — successful full-dataset seed (REQ-KOREAN-004)", () => {
  it("upserts every mapping from the seed dataset and reports zero skips/errors", async () => {
    const { supabase, calls } = fakeSupabase(() => ({ error: null }));

    const summary = await runKoreanNameSeed({ mappings: SAMPLE_MAPPINGS, supabase });

    expect(summary).toEqual({ synced: 3, skipped: 0, errors: [] });
    expect(calls).toHaveLength(3);
  });

  it("maps each KoreanMapping field onto the corresponding snake_case row column", async () => {
    const { supabase, calls } = fakeSupabase(() => ({ error: null }));

    await runKoreanNameSeed({
      mappings: [{ originalName: "Son Heung-min", koreanName: "손흥민" }],
      supabase,
    });

    expect(calls[0]).toEqual({
      original_name: "Son Heung-min",
      korean_name: "손흥민",
    });
  });

  it("never reads the seed dataset file itself — accepts an already-parsed mappings array", async () => {
    const { supabase, calls } = fakeSupabase(() => ({ error: null }));

    await runKoreanNameSeed({ mappings: SAMPLE_MAPPINGS, supabase });

    // The function signature itself is the contract: `mappings` is a plain
    // KoreanMapping[] parameter, never a file path — this call succeeding
    // with an in-memory array (no fs access) demonstrates that contract.
    expect(calls).toHaveLength(SAMPLE_MAPPINGS.length);
  });
});

describe("runKoreanNameSeed — partial failure resilience", () => {
  it("continues past a single mapping's upsert error and reports it in errors, without throwing", async () => {
    const { supabase, calls } = fakeSupabase((row) =>
      row.original_name === "Erling Haaland"
        ? { error: { message: "constraint violation" } }
        : { error: null },
    );

    const summary = await runKoreanNameSeed({ mappings: SAMPLE_MAPPINGS, supabase });

    expect(summary.synced).toBe(2);
    expect(summary.skipped).toBe(1);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]).toContain("Erling Haaland");
    expect(summary.errors[0]).toContain("constraint violation");
    expect(calls).toHaveLength(3);
  });

  it("catches a thrown exception from upsert (not just a returned error) and continues", async () => {
    const supabase: SeedSupabaseLike = {
      from(table) {
        expect(table).toBe("korean_name_mappings");
        return {
          upsert(values) {
            if (values.original_name === "Son Heung-min") {
              return Promise.reject(new Error("network timeout"));
            }
            return Promise.resolve({ error: null });
          },
        };
      },
    };

    const summary = await runKoreanNameSeed({ mappings: SAMPLE_MAPPINGS, supabase });

    expect(summary.synced).toBe(2);
    expect(summary.skipped).toBe(1);
    expect(summary.errors[0]).toContain("network timeout");
  });

  it("stringifies a non-Error thrown value (e.g. a plain string reject reason)", async () => {
    const supabase: SeedSupabaseLike = {
      from(table) {
        expect(table).toBe("korean_name_mappings");
        return {
          upsert() {
            return Promise.reject("plain string rejection");
          },
        };
      },
    };

    const summary = await runKoreanNameSeed({
      mappings: [{ originalName: "Son Heung-min", koreanName: "손흥민" }],
      supabase,
    });

    expect(summary.skipped).toBe(1);
    expect(summary.errors[0]).toContain("plain string rejection");
  });

  it("reports every mapping's failure when all upserts fail, never throwing out of the function", async () => {
    const { supabase } = fakeSupabase(() => ({ error: { message: "db unavailable" } }));

    const summary = await runKoreanNameSeed({ mappings: SAMPLE_MAPPINGS, supabase });

    expect(summary.synced).toBe(0);
    expect(summary.skipped).toBe(3);
    expect(summary.errors).toHaveLength(3);
  });
});

describe("runKoreanNameSeed — no live network, no live DB", () => {
  it("never touches the real global fetch (supabase is fully injected)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { supabase } = fakeSupabase(() => ({ error: null }));

    await runKoreanNameSeed({ mappings: SAMPLE_MAPPINGS, supabase });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
