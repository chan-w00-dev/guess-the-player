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
  it("delegates from(table).update(values).eq(col, val) to the wrapped real client, unchanged", async () => {
    const eqMock = vi.fn(async () => ({ error: null }));
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ update: updateMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toSquadNumberSupabaseLike(fakeRealClient);
    const result = await adapted.from("players").update({ squad_number: 9 }).eq("id", 1001);

    expect(fromMock).toHaveBeenCalledWith("players");
    expect(updateMock).toHaveBeenCalledWith({ squad_number: 9 });
    expect(eqMock).toHaveBeenCalledWith("id", 1001);
    expect(result).toEqual({ error: null });
  });

  it("propagates an error result from the wrapped real client's update", async () => {
    const eqMock = vi.fn(async () => ({ error: { message: "no matching row" } }));
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ update: updateMock }));
    const fakeRealClient = { from: fromMock } as unknown as SupabaseClient;

    const adapted = toSquadNumberSupabaseLike(fakeRealClient);
    const result = await adapted.from("players").update({ squad_number: 9 }).eq("id", 9999);

    expect(result).toEqual({ error: { message: "no matching row" } });
  });
});

describe("createSquadNumberSupabaseClient — service_role factory (RLS bypass)", () => {
  it("wires to the service_role client, not the anon client (RLS has no anon write policy)", async () => {
    const eqMock = vi.fn(async () => ({ error: null }));
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ update: updateMock }));
    const fakeServiceRoleClient = { from: fromMock } as unknown as SupabaseClient;
    getSupabaseServiceRoleClientMock.mockReturnValue(fakeServiceRoleClient);

    const supabase = createSquadNumberSupabaseClient();
    const result = await supabase.from("players").update({ squad_number: 9 }).eq("id", 1001);

    expect(getSupabaseServiceRoleClientMock).toHaveBeenCalledTimes(1);
    expect(getSupabaseClientMock).not.toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith("players");
    expect(updateMock).toHaveBeenCalledWith({ squad_number: 9 });
    expect(eqMock).toHaveBeenCalledWith("id", 1001);
    expect(result).toEqual({ error: null });
  });
});
