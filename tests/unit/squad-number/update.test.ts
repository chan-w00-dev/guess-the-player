import { describe, expect, it, vi } from "vitest";
import { runSquadNumberUpdate } from "@/lib/squad-number/update";
import type { SquadNumberEntry, SquadNumberSupabaseLike } from "@/lib/squad-number/types";

/**
 * Builds a fake `SquadNumberSupabaseLike` whose `update(...).eq(...).select(...)`
 * records every call and resolves/rejects per the provided per-call
 * behavior — zero real network or DB access (AC-GAME-CORE-030).
 *
 * `behavior` returns the same `{ data, error }` shape Postgrest's
 * `update().eq().select()` chain resolves with — `data` is the array of
 * rows actually matched/updated, so tests can distinguish "matched one row"
 * (`data: [{ id }]`) from "matched zero rows" (`data: []`), which
 * `error: null` alone cannot express.
 */
function fakeSupabase(
  behavior: (
    id: number,
    squadNumber: number,
  ) => { data: { id: number }[] | null; error: { message: string } | null },
): {
  supabase: SquadNumberSupabaseLike;
  calls: Array<{ id: number; squadNumber: number }>;
} {
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
                select(columns) {
                  expect(columns).toBe("id");
                  return Promise.resolve(behavior(value, values.squad_number));
                },
              };
            },
          };
        },
      };
    },
  };
  return { supabase, calls };
}

const SAMPLE_ENTRIES: SquadNumberEntry[] = [
  { id: 1001, squadNumber: 9 },
  { id: 1002, squadNumber: 7 },
  { id: 1003, squadNumber: 17 },
];

describe("runSquadNumberUpdate — successful entries (REQ-SYNC-004, AC-GAME-CORE-030)", () => {
  it("updates every entry keyed by numeric player id and reports zero skips/errors", async () => {
    const { supabase, calls } = fakeSupabase((id) => ({ data: [{ id }], error: null }));

    const summary = await runSquadNumberUpdate({ entries: SAMPLE_ENTRIES, supabase });

    expect(summary).toEqual({ updated: 3, skipped: 0, errors: [] });
    expect(calls).toEqual([
      { id: 1001, squadNumber: 9 },
      { id: 1002, squadNumber: 7 },
      { id: 1003, squadNumber: 17 },
    ]);
  });

  it("issues a targeted update filtered by id — never a name-keyed lookup", async () => {
    const { supabase, calls } = fakeSupabase((id) => ({ data: [{ id }], error: null }));

    await runSquadNumberUpdate({ entries: [{ id: 42, squadNumber: 10 }], supabase });

    expect(calls).toEqual([{ id: 42, squadNumber: 10 }]);
  });
});

describe("runSquadNumberUpdate — partial failure resilience", () => {
  it("continues past a single entry's update error and reports it in errors, without throwing", async () => {
    const { supabase, calls } = fakeSupabase((id) =>
      id === 1002
        ? { data: null, error: { message: "no matching row" } }
        : { data: [{ id }], error: null },
    );

    const summary = await runSquadNumberUpdate({ entries: SAMPLE_ENTRIES, supabase });

    expect(summary.updated).toBe(2);
    expect(summary.skipped).toBe(1);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]).toContain("id=1002");
    expect(summary.errors[0]).toContain("no matching row");
    expect(calls).toHaveLength(3);
  });

  it("catches a thrown exception from update (not just a returned error) and continues", async () => {
    const supabase: SquadNumberSupabaseLike = {
      from(table) {
        expect(table).toBe("players");
        return {
          update(values) {
            return {
              eq(_column, value) {
                return {
                  select() {
                    if (value === 1001) {
                      return Promise.reject(new Error("network timeout"));
                    }
                    void values;
                    return Promise.resolve({ data: [{ id: value }], error: null });
                  },
                };
              },
            };
          },
        };
      },
    };

    const summary = await runSquadNumberUpdate({ entries: SAMPLE_ENTRIES, supabase });

    expect(summary.updated).toBe(2);
    expect(summary.skipped).toBe(1);
    expect(summary.errors[0]).toContain("network timeout");
  });

  it("stringifies a non-Error thrown value (e.g. a plain string reject reason)", async () => {
    const supabase: SquadNumberSupabaseLike = {
      from(table) {
        expect(table).toBe("players");
        return {
          update() {
            return {
              eq() {
                return {
                  select() {
                    return Promise.reject("plain string rejection");
                  },
                };
              },
            };
          },
        };
      },
    };

    const summary = await runSquadNumberUpdate({
      entries: [{ id: 1, squadNumber: 9 }],
      supabase,
    });

    expect(summary.skipped).toBe(1);
    expect(summary.errors[0]).toContain("plain string rejection");
  });

  it("reports every entry's failure when all updates fail, never throwing out of the function", async () => {
    const { supabase } = fakeSupabase(() => ({
      data: null,
      error: { message: "db unavailable" },
    }));

    const summary = await runSquadNumberUpdate({ entries: SAMPLE_ENTRIES, supabase });

    expect(summary.updated).toBe(0);
    expect(summary.skipped).toBe(3);
    expect(summary.errors).toHaveLength(3);
  });
});

describe("runSquadNumberUpdate — no live network, no live DB", () => {
  it("never touches the real global fetch (supabase is fully injected)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { supabase } = fakeSupabase((id) => ({ data: [{ id }], error: null }));

    await runSquadNumberUpdate({ entries: SAMPLE_ENTRIES, supabase });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("runSquadNumberUpdate — unmatched id reports skipped, not updated (bug reproduction)", () => {
  it("reports skipped with an informative error when the id matches zero rows, even though Postgrest returns error: null for a no-op update", async () => {
    // Postgrest's `.update()` resolves `{ error: null }` whenever the query
    // itself executes successfully — regardless of whether the `where id = ?`
    // clause actually matched any row. A mistyped/nonexistent id therefore
    // looks identical, at the error field alone, to a real successful
    // update — only an empty `data` array (via the `.select("id")` chain)
    // distinguishes it.
    const { supabase, calls } = fakeSupabase(() => ({ data: [], error: null }));

    const summary = await runSquadNumberUpdate({
      entries: [{ id: 9999999, squadNumber: 7 }],
      supabase,
    });

    expect(summary.updated).toBe(0);
    expect(summary.skipped).toBe(1);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]).toContain("id=9999999");
    expect(summary.errors[0]).toContain("no player found");
    expect(calls).toEqual([{ id: 9999999, squadNumber: 7 }]);
  });

  it("treats a null data (in addition to an empty array) as zero rows matched", async () => {
    const { supabase } = fakeSupabase(() => ({ data: null, error: null }));

    const summary = await runSquadNumberUpdate({
      entries: [{ id: 4242, squadNumber: 3 }],
      supabase,
    });

    expect(summary.updated).toBe(0);
    expect(summary.skipped).toBe(1);
    expect(summary.errors[0]).toContain("id=4242");
    expect(summary.errors[0]).toContain("no player found");
  });
});

describe("runSquadNumberUpdate — empty input", () => {
  it("returns a zeroed summary and makes no calls for an empty entries list", async () => {
    const { supabase, calls } = fakeSupabase((id) => ({ data: [{ id }], error: null }));

    const summary = await runSquadNumberUpdate({ entries: [], supabase });

    expect(summary).toEqual({ updated: 0, skipped: 0, errors: [] });
    expect(calls).toHaveLength(0);
  });
});
