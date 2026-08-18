import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const getSupabaseClientMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: (...args: unknown[]) => getSupabaseClientMock(...args),
}));

const { createPlayerReviewExportSupabaseClient, toPlayerReviewExportSupabaseLike } = await import(
  "@/lib/player-review/supabase-adapter"
);

afterEach(() => {
  vi.clearAllMocks();
});

describe("toPlayerReviewExportSupabaseLike — players table (real SupabaseClient adapter)", () => {
  it("delegates from('players').select(cols) to the wrapped real client", async () => {
    const selectMock = vi.fn(async () => ({
      data: [{ id: 1, name: "Son Heung-min", nationality: "South Korea", club: "Tottenham", age: 33, squad_number: 7 }],
      error: null,
    }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toPlayerReviewExportSupabaseLike(fakeRealClient);
    const result = await adapted.from("players").select("id,name,nationality,club,age,squad_number");

    expect(fromMock).toHaveBeenCalledWith("players");
    expect(selectMock).toHaveBeenCalledWith("id,name,nationality,club,age,squad_number");
    expect(result.data).toHaveLength(1);
  });

  it("propagates an error result from the wrapped real client's players lookup", async () => {
    const selectMock = vi.fn(async () => ({ data: null, error: { message: "connection reset" } }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toPlayerReviewExportSupabaseLike(fakeRealClient);
    const result = await adapted.from("players").select("id,name,nationality,club,age,squad_number");

    expect(result).toEqual({ data: null, error: { message: "connection reset" } });
  });
});

describe("toPlayerReviewExportSupabaseLike — korean_name_mappings table (real SupabaseClient adapter)", () => {
  it("delegates from('korean_name_mappings').select(cols) to the wrapped real client", async () => {
    const selectMock = vi.fn(async () => ({
      data: [{ original_name: "Son Heung-min", korean_name: "손흥민" }],
      error: null,
    }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toPlayerReviewExportSupabaseLike(fakeRealClient);
    const result = await adapted.from("korean_name_mappings").select("original_name,korean_name");

    expect(fromMock).toHaveBeenCalledWith("korean_name_mappings");
    expect(selectMock).toHaveBeenCalledWith("original_name,korean_name");
    expect(result.data).toHaveLength(1);
  });

  it("propagates an error result from the wrapped real client's mapping lookup", async () => {
    const selectMock = vi.fn(async () => ({ data: null, error: { message: "connection reset" } }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toPlayerReviewExportSupabaseLike(fakeRealClient);
    const result = await adapted.from("korean_name_mappings").select("original_name,korean_name");

    expect(result).toEqual({ data: null, error: { message: "connection reset" } });
  });
});

describe("createPlayerReviewExportSupabaseClient — export-specific factory (anon key, read-only)", () => {
  it("wires to the anon client (REQ-REVIEW-001 — export is read-only via the anon key)", async () => {
    const selectMock = vi.fn(async () => ({ data: [], error: null }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const fakeAnonClient = { from: fromMock } as unknown as SupabaseClient;
    getSupabaseClientMock.mockReturnValue(fakeAnonClient);

    const supabase = createPlayerReviewExportSupabaseClient();
    await supabase.from("players").select("id,name,nationality,club,age,squad_number");

    expect(getSupabaseClientMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith("players");
  });
});
