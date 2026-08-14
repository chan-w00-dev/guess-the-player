import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const getSupabaseClientMock = vi.fn();
const getSupabaseServiceRoleClientMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: (...args: unknown[]) => getSupabaseClientMock(...args),
  getSupabaseServiceRoleClient: (...args: unknown[]) => getSupabaseServiceRoleClientMock(...args),
}));

const { createSquadNumberSupabaseClient, toSquadNumberSupabaseLike } = await import(
  "@/lib/squad-number/supabase-adapter"
);

afterEach(() => {
  vi.clearAllMocks();
});

describe("toSquadNumberSupabaseLike — real SupabaseClient adapter (write-only, id-keyed)", () => {
  it("delegates from(table).update(values).eq(col, val).select(...) to the wrapped real client, unchanged", async () => {
    const selectMock = vi.fn(async () => ({ data: [{ id: 1001 }], error: null }));
    const eqMock = vi.fn(() => ({ select: selectMock }));
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ update: updateMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toSquadNumberSupabaseLike(fakeRealClient);
    const result = await adapted
      .from("players")
      .update({ squad_number: 9 })
      .eq("id", 1001)
      .select("id");

    expect(fromMock).toHaveBeenCalledWith("players");
    expect(updateMock).toHaveBeenCalledWith({ squad_number: 9 });
    expect(eqMock).toHaveBeenCalledWith("id", 1001);
    expect(selectMock).toHaveBeenCalledWith("id");
    expect(result).toEqual({ data: [{ id: 1001 }], error: null });
  });

  it("propagates an error result from the wrapped real client's update", async () => {
    const selectMock = vi.fn(async () => ({ data: null, error: { message: "no matching row" } }));
    const eqMock = vi.fn(() => ({ select: selectMock }));
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ update: updateMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toSquadNumberSupabaseLike(fakeRealClient);
    const result = await adapted
      .from("players")
      .update({ squad_number: 9 })
      .eq("id", 9999)
      .select("id");

    expect(result).toEqual({ data: null, error: { message: "no matching row" } });
  });

  it("propagates an empty data array (zero rows matched) from the wrapped real client's update", async () => {
    const selectMock = vi.fn(async () => ({ data: [], error: null }));
    const eqMock = vi.fn(() => ({ select: selectMock }));
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ update: updateMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toSquadNumberSupabaseLike(fakeRealClient);
    const result = await adapted
      .from("players")
      .update({ squad_number: 9 })
      .eq("id", 4242)
      .select("id");

    expect(result).toEqual({ data: [], error: null });
  });
});

describe("createSquadNumberSupabaseClient — service_role factory (RLS bypass)", () => {
  it("wires to the service_role client, not the anon client (RLS has no anon write policy)", async () => {
    const selectMock = vi.fn(async () => ({ data: [{ id: 1001 }], error: null }));
    const eqMock = vi.fn(() => ({ select: selectMock }));
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ update: updateMock }));
    const fakeServiceRoleClient = { from: fromMock } as unknown as SupabaseClient;
    getSupabaseServiceRoleClientMock.mockReturnValue(fakeServiceRoleClient);

    const supabase = createSquadNumberSupabaseClient();
    const result = await supabase
      .from("players")
      .update({ squad_number: 9 })
      .eq("id", 1001)
      .select("id");

    expect(getSupabaseServiceRoleClientMock).toHaveBeenCalledTimes(1);
    expect(getSupabaseClientMock).not.toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith("players");
    expect(updateMock).toHaveBeenCalledWith({ squad_number: 9 });
    expect(eqMock).toHaveBeenCalledWith("id", 1001);
    expect(selectMock).toHaveBeenCalledWith("id");
    expect(result).toEqual({ data: [{ id: 1001 }], error: null });
  });
});
