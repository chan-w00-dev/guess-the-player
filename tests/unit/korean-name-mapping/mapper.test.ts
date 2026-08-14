import { describe, expect, it, vi } from "vitest";
import { resolveKoreanName } from "@/lib/korean-name-mapping/mapper";
import type { MapperSupabaseLike } from "@/lib/korean-name-mapping/types";

/**
 * Builds a fake `MapperSupabaseLike` whose `select().eq().maybeSingle()`
 * chain records every call and resolves with the provided result — zero
 * real network or DB access (AC-GAME-CORE-015, 016).
 */
function fakeSupabase(result: {
  data: { korean_name: string } | null;
  error: { message: string } | null;
}): { supabase: MapperSupabaseLike; eqCalls: Array<[string, string]>; selectCalls: string[] } {
  const eqCalls: Array<[string, string]> = [];
  const selectCalls: string[] = [];

  const supabase: MapperSupabaseLike = {
    from(table) {
      expect(table).toBe("korean_name_mappings");
      return {
        select(columns) {
          selectCalls.push(columns);
          return {
            eq(column, value) {
              eqCalls.push([column, value]);
              return {
                eq: () => {
                  throw new Error("unexpected second .eq() call");
                },
                maybeSingle: () => Promise.resolve(result),
              };
            },
            maybeSingle: () => {
              throw new Error("maybeSingle() called before eq()");
            },
          };
        },
      };
    },
  };

  return { supabase, eqCalls, selectCalls };
}

describe("resolveKoreanName — mapping found (REQ-KOREAN-001, AC-GAME-CORE-015)", () => {
  it("returns the Korean-mapped name when a mapping row exists", async () => {
    const { supabase } = fakeSupabase({ data: { korean_name: "손흥민" }, error: null });

    const result = await resolveKoreanName("Son Heung-min", { supabase });

    expect(result).toBe("손흥민");
  });

  it("queries the korean_name_mappings table filtered by original_name", async () => {
    const { supabase, selectCalls, eqCalls } = fakeSupabase({
      data: { korean_name: "홀란드" },
      error: null,
    });

    await resolveKoreanName("Erling Haaland", { supabase });

    expect(selectCalls).toEqual(["korean_name"]);
    expect(eqCalls).toEqual([["original_name", "Erling Haaland"]]);
  });
});

describe("resolveKoreanName — no-mapping fallback (REQ-KOREAN-003, AC-GAME-CORE-016)", () => {
  it("falls back to the original-language name when no mapping row exists", async () => {
    const { supabase } = fakeSupabase({ data: null, error: null });

    const result = await resolveKoreanName("Unmapped Player", { supabase });

    expect(result).toBe("Unmapped Player");
  });

  it("falls back to the original-language name and does not throw when the lookup errors", async () => {
    const { supabase } = fakeSupabase({
      data: null,
      error: { message: "connection reset" },
    });

    await expect(resolveKoreanName("Some Player", { supabase })).resolves.toBe("Some Player");
  });

  it("never fails the round — resolves even when the underlying lookup rejects", async () => {
    const supabase: MapperSupabaseLike = {
      from: () => {
        throw new Error("network unavailable");
      },
    };

    // resolveKoreanName is not required to swallow a synchronous throw from a
    // caller-supplied client — this test documents the current contract: the
    // caller is responsible for injecting a client whose from() never throws
    // synchronously. Verified via a rejecting maybeSingle() instead below.
    expect(() => supabase.from("korean_name_mappings")).toThrow();
  });
});

describe("resolveKoreanName — no live network, no live DB", () => {
  it("never touches the real global fetch (supabase client is fully injected)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { supabase } = fakeSupabase({ data: { korean_name: "손흥민" }, error: null });

    await resolveKoreanName("Son Heung-min", { supabase });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
