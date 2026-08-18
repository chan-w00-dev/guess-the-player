import { describe, expect, it } from "vitest";
import { runKoreanNameSeed } from "@/lib/korean-name-mapping/seed";
import type { KoreanMappingRow, SeedSupabaseLike } from "@/lib/korean-name-mapping/types";
import { buildReviewWriteBatches, parsePlayerReviewCsv } from "@/lib/player-review/import";
import { runSquadNumberUpdate } from "@/lib/squad-number/update";
import type { SquadNumberSupabaseLike } from "@/lib/squad-number/types";

/**
 * Integration-style coverage (AC-GAME-CORE-034): wires the review-import
 * batch-building logic (`lib/player-review/import.ts`) into the real,
 * already-tested `runKoreanNameSeed` / `runSquadNumberUpdate` functions —
 * never a raw `.upsert()`/`.update()` mock, so this test exercises the exact
 * reuse boundary `scripts/import-players-review.ts` relies on (plan.md §G).
 */

const HEADER = "id,name,nationality,club,age,koreanName,squadNumber";

describe("review-import → reused write paths (REQ-REVIEW-002, AC-GAME-CORE-034)", () => {
  it("upserts a filled koreanName via runKoreanNameSeed, keyed by original name", async () => {
    const rows = parsePlayerReviewCsv(`${HEADER}\n1001,Son Heung-min,South Korea,Tottenham,33,손흥민,7`);
    const { koreanMappings } = buildReviewWriteBatches(rows);

    const calls: KoreanMappingRow[] = [];
    const supabase: SeedSupabaseLike = {
      from(table) {
        expect(table).toBe("korean_name_mappings");
        return {
          upsert(values, options) {
            expect(options).toEqual({ onConflict: "original_name" });
            calls.push(values);
            return Promise.resolve({ error: null });
          },
        };
      },
    };

    const summary = await runKoreanNameSeed({ mappings: koreanMappings, supabase });

    expect(summary).toEqual({ synced: 1, skipped: 0, errors: [] });
    expect(calls).toEqual([{ original_name: "Son Heung-min", korean_name: "손흥민" }]);
  });

  it("updates a filled squadNumber via runSquadNumberUpdate, keyed by numeric id", async () => {
    const rows = parsePlayerReviewCsv(`${HEADER}\n1001,Son Heung-min,South Korea,Tottenham,33,손흥민,7`);
    const { squadNumberEntries } = buildReviewWriteBatches(rows);

    const calls: Array<{ id: number; squadNumber: number }> = [];
    const supabase: SquadNumberSupabaseLike = {
      from(table) {
        expect(table).toBe("players");
        return {
          update(values) {
            return {
              eq(column, value) {
                expect(column).toBe("id");
                calls.push({ id: value, squadNumber: values.squad_number });
                return {
                  select: () => Promise.resolve({ data: [{ id: value }], error: null }),
                };
              },
            };
          },
        };
      },
    };

    const summary = await runSquadNumberUpdate({ entries: squadNumberEntries, supabase });

    expect(summary).toEqual({ updated: 1, skipped: 0, errors: [] });
    expect(calls).toEqual([{ id: 1001, squadNumber: 7 }]);
  });

  it("never calls either reused write function for a blank cell (REQ-REVIEW-003)", async () => {
    const rows = parsePlayerReviewCsv(`${HEADER}\n1002,New Signing,England,Arsenal,20,,`);
    const { koreanMappings, squadNumberEntries } = buildReviewWriteBatches(rows);

    const seedCalls: KoreanMappingRow[] = [];
    const seedSupabase: SeedSupabaseLike = {
      from() {
        return {
          upsert(values) {
            seedCalls.push(values);
            return Promise.resolve({ error: null });
          },
        };
      },
    };
    const updateCalls: Array<{ id: number }> = [];
    const squadSupabase: SquadNumberSupabaseLike = {
      from() {
        return {
          update() {
            return {
              eq(_column, value) {
                updateCalls.push({ id: value });
                return { select: () => Promise.resolve({ data: [{ id: value }], error: null }) };
              },
            };
          },
        };
      },
    };

    const seedSummary = await runKoreanNameSeed({ mappings: koreanMappings, supabase: seedSupabase });
    const updateSummary = await runSquadNumberUpdate({
      entries: squadNumberEntries,
      supabase: squadSupabase,
    });

    expect(seedSummary).toEqual({ synced: 0, skipped: 0, errors: [] });
    expect(updateSummary).toEqual({ updated: 0, skipped: 0, errors: [] });
    expect(seedCalls).toEqual([]);
    expect(updateCalls).toEqual([]);
  });

  it("a pre-existing stored value is never touched by a blank-cell row (REQ-REVIEW-003 no-overwrite)", async () => {
    // A row with a blank koreanName for a player that already has a stored
    // mapping — the write batch must not include this row at all, so a fake
    // supabase that would reject any call for this player proves the
    // pre-existing value is left untouched.
    const rows = parsePlayerReviewCsv(`${HEADER}\n1007,Existing Player,Brazil,Chelsea,27,,9`);
    const { koreanMappings } = buildReviewWriteBatches(rows);

    let called = false;
    const supabase: SeedSupabaseLike = {
      from() {
        return {
          upsert() {
            called = true;
            return Promise.resolve({ error: null });
          },
        };
      },
    };

    await runKoreanNameSeed({ mappings: koreanMappings, supabase });

    expect(called).toBe(false);
  });
});
