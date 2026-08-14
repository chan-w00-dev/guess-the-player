import { afterEach, describe, expect, it, vi } from "vitest";
import { createSupabaseClient, getSupabaseClient } from "@/lib/supabase/client";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("createSupabaseClient — env-driven factory", () => {
  it("throws a descriptive error when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "test-anon-key");

    expect(() => createSupabaseClient()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("throws a descriptive error when SUPABASE_ANON_KEY is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "");

    expect(() => createSupabaseClient()).toThrow(/SUPABASE_ANON_KEY/);
  });

  it("never prints or includes the actual key value in the thrown error message", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "super-secret-value-should-not-leak");

    try {
      createSupabaseClient();
      throw new Error("expected createSupabaseClient to throw");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain("super-secret-value-should-not-leak");
    }
  });

  it("constructs a client without throwing when both env vars are present", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "test-anon-key");

    const client = createSupabaseClient();

    expect(client).toBeDefined();
    expect(typeof client.from).toBe("function");
  });

  it("returns a fresh client instance on each call", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "test-anon-key");

    const first = createSupabaseClient();
    const second = createSupabaseClient();

    expect(first).not.toBe(second);
  });
});

describe("getSupabaseClient — process-wide singleton", () => {
  it("returns the same instance across repeated calls", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "test-anon-key");
    // Fresh module instance so the singleton cache starts empty for this test.
    const { getSupabaseClient: freshGetSupabaseClient } = await import("@/lib/supabase/client");

    const first = freshGetSupabaseClient();
    const second = freshGetSupabaseClient();

    expect(first).toBe(second);
  });

  it("is exported and callable", () => {
    expect(typeof getSupabaseClient).toBe("function");
  });
});
