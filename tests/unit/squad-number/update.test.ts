import { describe, expect, it, vi } from "vitest";
import { runSquadNumberUpdate } from "@/lib/squad-number/update";
import type { SquadNumberEntry, SquadNumberSupabaseLike } from "@/lib/squad-number/types";

/**
 * Builds a fake `SquadNumberSupabaseLike` whose `update(...).eq(...)`
 * records every call and resolves/rejects per the provided per-call
 * behavior — zero real network or DB access (AC-GAME-CORE-030).
 */
function fakeSupabase(
  behavior: (id: number, squadNumber: number) => { error: { message: string } | null },
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
              return Promise.resolve(behavior(value, values.squad_number));
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
    const { supabase, calls } = fakeSupabase(() => ({ error: null }));

    const summary = await runSquadNumberUpdate({ entries: SAMPLE_ENTRIES, supabase });

    expect(summary).toEqual({ updated: 3, skipped: 0, errors: [] });
    expect(calls).toEqual([
      { id: 1001, squadNumber: 9 },
      { id: 1002, squadNumber: 7 },
      { id: 1003, squadNumber: 17 },
    ]);
  });

  it("issues a targeted update filtered by id — never a name-keyed lookup", async () => {
    const { supabase, calls } = fakeSupabase(() => ({ error: null }));

    await runSquadNumberUpdate({ entries: [{ id: 42, squadNumber: 10 }], supabase });

    expect(calls).toEqual([{ id: 42, squadNumber: 10 }]);
  });
});

describe("runSquadNumberUpdate — partial failure resilience", () => {
  it("continues past a single entry's update error and reports it in errors, without throwing", async () => {
    const { supabase, calls } = fakeSupabase((id) =>
      id === 1002 ? { error: { message: "no matching row" } } : { error: null },
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
                if (value === 1001) {
                  return Promise.reject(new Error("network timeout"));
                }
                void values;
                return Promise.resolve({ error: null });
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
                return Promise.reject("plain string rejection");
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
    const { supabase } = fakeSupabase(() => ({ error: { message: "db unavailable" } }));

    const summary = await runSquadNumberUpdate({ entries: SAMPLE_ENTRIES, supabase });

    expect(summary.updated).toBe(0);
    expect(summary.skipped).toBe(3);
    expect(summary.errors).toHaveLength(3);
  });
});

describe("runSquadNumberUpdate — no live network, no live DB", () => {
  it("never touches the real global fetch (supabase is fully injected)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { supabase } = fakeSupabase(() => ({ error: null }));

    await runSquadNumberUpdate({ entries: SAMPLE_ENTRIES, supabase });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("runSquadNumberUpdate — empty input", () => {
  it("returns a zeroed summary and makes no calls for an empty entries list", async () => {
    const { supabase, calls } = fakeSupabase(() => ({ error: null }));

    const summary = await runSquadNumberUpdate({ entries: [], supabase });

    expect(summary).toEqual({ updated: 0, skipped: 0, errors: [] });
    expect(calls).toHaveLength(0);
  });
});
