import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toSupabaseLike } from "@/lib/player-data-sync/supabase-adapter";
import type { PlayerRow } from "@/lib/player-data-sync/types";

const sampleRow: PlayerRow = {
  id: 1,
  name: "Test Player",
  club: "Test FC",
  position: "FW",
  nationality: "Testland",
  age: 20,
  squad_number: 9,
  photo_url: null,
  season: "2026/27",
  synced_at: "2026-08-14T00:00:00.000Z",
};

describe("toSupabaseLike — real SupabaseClient adapter", () => {
  it("delegates from(table).upsert(values, options) to the wrapped real client, unchanged", async () => {
    const upsertMock = vi.fn(async () => ({ error: null }));
    const fromMock = vi.fn(() => ({ upsert: upsertMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toSupabaseLike(fakeRealClient);
    const result = await adapted.from("players").upsert(sampleRow, { onConflict: "id" });

    expect(fromMock).toHaveBeenCalledWith("players");
    expect(upsertMock).toHaveBeenCalledWith(sampleRow, { onConflict: "id" });
    expect(result).toEqual({ error: null });
  });

  it("propagates an error result from the wrapped real client's upsert", async () => {
    const upsertMock = vi.fn(async () => ({ error: { message: "duplicate key" } }));
    const fromMock = vi.fn(() => ({ upsert: upsertMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toSupabaseLike(fakeRealClient);
    const result = await adapted.from("players").upsert(sampleRow, { onConflict: "id" });

    expect(result).toEqual({ error: { message: "duplicate key" } });
  });
});
