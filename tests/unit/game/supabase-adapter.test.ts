import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const getSupabaseClientMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: (...args: unknown[]) => getSupabaseClientMock(...args),
}));

const {
  createPlayerLookupSupabaseClient,
  createPlayerSelectorSupabaseClient,
  toPlayerLookupSupabaseLike,
  toPlayerSelectorSupabaseLike,
} = await import("@/lib/game/supabase-adapter");

afterEach(() => {
  vi.clearAllMocks();
});

describe("toPlayerSelectorSupabaseLike — players table (real SupabaseClient adapter)", () => {
  it("delegates from('players').select(cols) to the wrapped real client", async () => {
    const selectMock = vi.fn(async () => ({
      data: [{ id: 1, name: "Son Heung-min", club: "Tottenham Hotspur", position: "FW" }],
      error: null,
    }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toPlayerSelectorSupabaseLike(fakeRealClient);
    const result = await adapted
      .from("players")
      .select("id,name,club,position,nationality,age,squad_number,photo_url");

    expect(fromMock).toHaveBeenCalledWith("players");
    expect(selectMock).toHaveBeenCalledWith(
      "id,name,club,position,nationality,age,squad_number,photo_url",
    );
    expect(result.data).toHaveLength(1);
  });

  it("propagates an error result from the wrapped real client's players lookup", async () => {
    const selectMock = vi.fn(async () => ({ data: null, error: { message: "connection reset" } }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toPlayerSelectorSupabaseLike(fakeRealClient);
    const result = await adapted.from("players").select("id");

    expect(result).toEqual({ data: null, error: { message: "connection reset" } });
  });
});

describe("toPlayerSelectorSupabaseLike — korean_name_mappings table (real SupabaseClient adapter)", () => {
  it("delegates from('korean_name_mappings').select(cols) to the wrapped real client", async () => {
    const selectMock = vi.fn(async () => ({
      data: [{ original_name: "Son Heung-min", korean_name: "손흥민" }],
      error: null,
    }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toPlayerSelectorSupabaseLike(fakeRealClient);
    const result = await adapted.from("korean_name_mappings").select("original_name,korean_name");

    expect(fromMock).toHaveBeenCalledWith("korean_name_mappings");
    expect(selectMock).toHaveBeenCalledWith("original_name,korean_name");
    expect(result.data).toHaveLength(1);
  });
});

describe("createPlayerSelectorSupabaseClient — anon-key factory (REQ-SYNC-003)", () => {
  it("wires to the anon client", async () => {
    const selectMock = vi.fn(async () => ({ data: [], error: null }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const fakeAnonClient = { from: fromMock } as unknown as SupabaseClient;
    getSupabaseClientMock.mockReturnValue(fakeAnonClient);

    const supabase = createPlayerSelectorSupabaseClient();
    await supabase.from("players").select("id");

    expect(getSupabaseClientMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith("players");
  });
});

describe("toPlayerLookupSupabaseLike — players table (real SupabaseClient adapter)", () => {
  it("delegates from('players').select(cols).eq(col, id).maybeSingle() to the wrapped real client", async () => {
    const maybeSingleMock = vi.fn(async () => ({
      data: { id: 42, name: "Bukayo Saka" },
      error: null,
    }));
    const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toPlayerLookupSupabaseLike(fakeRealClient);
    const result = await adapted.from("players").select("id,name").eq("id", "42").maybeSingle();

    expect(fromMock).toHaveBeenCalledWith("players");
    expect(selectMock).toHaveBeenCalledWith("id,name");
    expect(eqMock).toHaveBeenCalledWith("id", "42");
    expect(result.data).toEqual({ id: 42, name: "Bukayo Saka" });
  });

  it("propagates an error result from the wrapped real client's lookup", async () => {
    const maybeSingleMock = vi.fn(async () => ({
      data: null,
      error: { message: "connection reset" },
    }));
    const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toPlayerLookupSupabaseLike(fakeRealClient);
    const result = await adapted.from("players").select("id").eq("id", "999").maybeSingle();

    expect(result).toEqual({ data: null, error: { message: "connection reset" } });
  });
});

describe("createPlayerLookupSupabaseClient — anon-key factory", () => {
  it("wires to the anon client", async () => {
    const maybeSingleMock = vi.fn(async () => ({ data: null, error: null }));
    const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const fakeAnonClient = { from: fromMock } as unknown as SupabaseClient;
    getSupabaseClientMock.mockReturnValue(fakeAnonClient);

    const supabase = createPlayerLookupSupabaseClient();
    await supabase.from("players").select("id").eq("id", "1").maybeSingle();

    expect(getSupabaseClientMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith("players");
  });
});
