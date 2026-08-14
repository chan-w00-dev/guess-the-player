import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const getSupabaseClientMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: (...args: unknown[]) => getSupabaseClientMock(...args),
}));

const { createSearchSupabaseClient, toPlayerSearchSupabaseLike } = await import(
  "@/lib/player-search/supabase-adapter"
);

afterEach(() => {
  vi.clearAllMocks();
});

describe("toPlayerSearchSupabaseLike — players table (real SupabaseClient adapter)", () => {
  it("delegates from('players').select(cols).ilike(col, pattern) to the wrapped real client", async () => {
    const ilikeMock = vi.fn(async () => ({
      data: [{ id: 1, name: "Son Heung-min", club: "Tottenham Hotspur", position: "FW" }],
      error: null,
    }));
    const selectMock = vi.fn(() => ({ ilike: ilikeMock, in: vi.fn() }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toPlayerSearchSupabaseLike(fakeRealClient);
    const result = await adapted.from("players").select("id,name,club,position").ilike("name", "%Son%");

    expect(fromMock).toHaveBeenCalledWith("players");
    expect(selectMock).toHaveBeenCalledWith("id,name,club,position");
    expect(ilikeMock).toHaveBeenCalledWith("name", "%Son%");
    expect(result.data).toHaveLength(1);
  });

  it("delegates from('players').select(cols).in(col, values) to the wrapped real client", async () => {
    const inMock = vi.fn(async () => ({
      data: [{ id: 1, name: "Son Heung-min", club: "Tottenham Hotspur", position: "FW" }],
      error: null,
    }));
    const selectMock = vi.fn(() => ({ ilike: vi.fn(), in: inMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toPlayerSearchSupabaseLike(fakeRealClient);
    const result = await adapted
      .from("players")
      .select("id,name,club,position")
      .in("name", ["Son Heung-min"]);

    expect(fromMock).toHaveBeenCalledWith("players");
    expect(inMock).toHaveBeenCalledWith("name", ["Son Heung-min"]);
    expect(result.data).toHaveLength(1);
  });

  it("propagates an error result from the wrapped real client's players lookup", async () => {
    const ilikeMock = vi.fn(async () => ({ data: null, error: { message: "connection reset" } }));
    const selectMock = vi.fn(() => ({ ilike: ilikeMock, in: vi.fn() }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toPlayerSearchSupabaseLike(fakeRealClient);
    const result = await adapted.from("players").select("id,name,club,position").ilike("name", "%x%");

    expect(result).toEqual({ data: null, error: { message: "connection reset" } });
  });
});

describe("toPlayerSearchSupabaseLike — korean_name_mappings table (real SupabaseClient adapter)", () => {
  it("delegates from('korean_name_mappings').select(cols).ilike(col, pattern) to the wrapped real client", async () => {
    const ilikeMock = vi.fn(async () => ({
      data: [{ original_name: "Son Heung-min", korean_name: "손흥민" }],
      error: null,
    }));
    const selectMock = vi.fn(() => ({ ilike: ilikeMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toPlayerSearchSupabaseLike(fakeRealClient);
    const result = await adapted
      .from("korean_name_mappings")
      .select("original_name,korean_name")
      .ilike("korean_name", "%손흥%");

    expect(fromMock).toHaveBeenCalledWith("korean_name_mappings");
    expect(selectMock).toHaveBeenCalledWith("original_name,korean_name");
    expect(ilikeMock).toHaveBeenCalledWith("korean_name", "%손흥%");
    expect(result.data).toHaveLength(1);
  });

  it("propagates an error result from the wrapped real client's mapping lookup", async () => {
    const ilikeMock = vi.fn(async () => ({ data: null, error: { message: "connection reset" } }));
    const selectMock = vi.fn(() => ({ ilike: ilikeMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toPlayerSearchSupabaseLike(fakeRealClient);
    const result = await adapted
      .from("korean_name_mappings")
      .select("original_name,korean_name")
      .ilike("korean_name", "%x%");

    expect(result).toEqual({ data: null, error: { message: "connection reset" } });
  });
});

describe("createSearchSupabaseClient — search-specific factory (anon key, RLS-scoped read)", () => {
  it("wires to the anon client (REQ-SYNC-003 — live gameplay reads are anon/RLS-scoped)", async () => {
    const ilikeMock = vi.fn(async () => ({ data: [], error: null }));
    const selectMock = vi.fn(() => ({ ilike: ilikeMock, in: vi.fn() }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const fakeAnonClient = { from: fromMock } as unknown as SupabaseClient;
    getSupabaseClientMock.mockReturnValue(fakeAnonClient);

    const supabase = createSearchSupabaseClient();
    await supabase.from("players").select("id,name,club,position").ilike("name", "%a%");

    expect(getSupabaseClientMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith("players");
  });
});
