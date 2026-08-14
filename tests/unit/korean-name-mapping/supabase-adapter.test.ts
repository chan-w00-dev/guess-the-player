import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { KoreanMappingRow } from "@/lib/korean-name-mapping/types";

const getSupabaseClientMock = vi.fn();
const getSupabaseServiceRoleClientMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: (...args: unknown[]) => getSupabaseClientMock(...args),
  getSupabaseServiceRoleClient: (...args: unknown[]) => getSupabaseServiceRoleClientMock(...args),
}));

const {
  createMapperSupabaseClient,
  createSeedSupabaseClient,
  toMapperSupabaseLike,
  toSeedSupabaseLike,
} = await import("@/lib/korean-name-mapping/supabase-adapter");

afterEach(() => {
  vi.clearAllMocks();
});

const sampleRow: KoreanMappingRow = {
  original_name: "Son Heung-min",
  korean_name: "손흥민",
};

describe("toMapperSupabaseLike — real SupabaseClient adapter (read-only)", () => {
  it("delegates from(table).select(cols).eq(col, val).maybeSingle() to the wrapped real client", async () => {
    const maybeSingleMock = vi.fn(async () => ({ data: { korean_name: "손흥민" }, error: null }));
    const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toMapperSupabaseLike(fakeRealClient);
    const result = await adapted
      .from("korean_name_mappings")
      .select("korean_name")
      .eq("original_name", "Son Heung-min")
      .maybeSingle();

    expect(fromMock).toHaveBeenCalledWith("korean_name_mappings");
    expect(selectMock).toHaveBeenCalledWith("korean_name");
    expect(eqMock).toHaveBeenCalledWith("original_name", "Son Heung-min");
    expect(result).toEqual({ data: { korean_name: "손흥민" }, error: null });
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

    const adapted = toMapperSupabaseLike(fakeRealClient);
    const result = await adapted
      .from("korean_name_mappings")
      .select("korean_name")
      .eq("original_name", "Unknown Player")
      .maybeSingle();

    expect(result).toEqual({ data: null, error: { message: "connection reset" } });
  });
});

describe("toSeedSupabaseLike — real SupabaseClient adapter (write-only)", () => {
  it("delegates from(table).upsert(values, options) to the wrapped real client, unchanged", async () => {
    const upsertMock = vi.fn(async () => ({ error: null }));
    const fromMock = vi.fn(() => ({ upsert: upsertMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toSeedSupabaseLike(fakeRealClient);
    const result = await adapted
      .from("korean_name_mappings")
      .upsert(sampleRow, { onConflict: "original_name" });

    expect(fromMock).toHaveBeenCalledWith("korean_name_mappings");
    expect(upsertMock).toHaveBeenCalledWith(sampleRow, { onConflict: "original_name" });
    expect(result).toEqual({ error: null });
  });

  it("propagates an error result from the wrapped real client's upsert", async () => {
    const upsertMock = vi.fn(async () => ({ error: { message: "duplicate key" } }));
    const fromMock = vi.fn(() => ({ upsert: upsertMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toSeedSupabaseLike(fakeRealClient);
    const result = await adapted
      .from("korean_name_mappings")
      .upsert(sampleRow, { onConflict: "original_name" });

    expect(result).toEqual({ error: { message: "duplicate key" } });
  });
});

describe("createMapperSupabaseClient — mapper-specific factory (anon key, RLS-scoped read)", () => {
  it("wires to the anon client, not the service_role client (REQ-KOREAN-001)", async () => {
    const maybeSingleMock = vi.fn(async () => ({ data: { korean_name: "손흥민" }, error: null }));
    const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    const fakeAnonClient = { from: fromMock } as unknown as SupabaseClient;
    getSupabaseClientMock.mockReturnValue(fakeAnonClient);

    const supabase = createMapperSupabaseClient();
    await supabase
      .from("korean_name_mappings")
      .select("korean_name")
      .eq("original_name", "Son Heung-min")
      .maybeSingle();

    expect(getSupabaseClientMock).toHaveBeenCalledTimes(1);
    expect(getSupabaseServiceRoleClientMock).not.toHaveBeenCalled();
  });
});

describe("createSeedSupabaseClient — seed-script-specific factory (service_role, RLS bypass)", () => {
  it("wires to the service_role client, not the anon client (RLS has no anon write policy)", async () => {
    const upsertMock = vi.fn(async () => ({ error: null }));
    const fromMock = vi.fn(() => ({ upsert: upsertMock }));
    const fakeServiceRoleClient = { from: fromMock } as unknown as SupabaseClient;
    getSupabaseServiceRoleClientMock.mockReturnValue(fakeServiceRoleClient);

    const supabase = createSeedSupabaseClient();
    const result = await supabase
      .from("korean_name_mappings")
      .upsert(sampleRow, { onConflict: "original_name" });

    expect(getSupabaseServiceRoleClientMock).toHaveBeenCalledTimes(1);
    expect(getSupabaseClientMock).not.toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith("korean_name_mappings");
    expect(upsertMock).toHaveBeenCalledWith(sampleRow, { onConflict: "original_name" });
    expect(result).toEqual({ error: null });
  });
});
