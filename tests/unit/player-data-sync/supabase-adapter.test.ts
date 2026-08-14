import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlayerRow } from "@/lib/player-data-sync/types";

const getSupabaseClientMock = vi.fn();
const getSupabaseServiceRoleClientMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: (...args: unknown[]) => getSupabaseClientMock(...args),
  getSupabaseServiceRoleClient: (...args: unknown[]) => getSupabaseServiceRoleClientMock(...args),
}));

const { createSyncSupabaseClient, toSupabaseLike } = await import(
  "@/lib/player-data-sync/supabase-adapter"
);

afterEach(() => {
  vi.clearAllMocks();
});

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

describe("createSyncSupabaseClient — sync-job-specific factory (RLS bypass)", () => {
  it("wires to the service_role client, not the anon client (RLS has no anon write policy)", async () => {
    const upsertMock = vi.fn(async () => ({ error: null }));
    const fromMock = vi.fn(() => ({ upsert: upsertMock }));
    const fakeServiceRoleClient = { from: fromMock } as unknown as SupabaseClient;
    getSupabaseServiceRoleClientMock.mockReturnValue(fakeServiceRoleClient);

    const supabase = createSyncSupabaseClient();
    const result = await supabase.from("players").upsert(sampleRow, { onConflict: "id" });

    expect(getSupabaseServiceRoleClientMock).toHaveBeenCalledTimes(1);
    expect(getSupabaseClientMock).not.toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith("players");
    expect(upsertMock).toHaveBeenCalledWith(sampleRow, { onConflict: "id" });
    expect(result).toEqual({ error: null });
  });

  it("propagates an error result from the underlying service_role client's upsert", async () => {
    const upsertMock = vi.fn(async () => ({ error: { message: "permission denied" } }));
    const fromMock = vi.fn(() => ({ upsert: upsertMock }));
    const fakeServiceRoleClient = { from: fromMock } as unknown as SupabaseClient;
    getSupabaseServiceRoleClientMock.mockReturnValue(fakeServiceRoleClient);

    const supabase = createSyncSupabaseClient();
    const result = await supabase.from("players").upsert(sampleRow, { onConflict: "id" });

    expect(result).toEqual({ error: { message: "permission denied" } });
  });
});
