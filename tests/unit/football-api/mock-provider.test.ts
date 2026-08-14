import { describe, expect, it } from "vitest";
import { MockFootballDataProvider } from "@/lib/football-api/mock-provider";

describe("MockFootballDataProvider — deterministic fixed dataset", () => {
  it("returns a non-empty fixed player pool", async () => {
    const provider = new MockFootballDataProvider();
    const pool = await provider.fetchPlayerPool();

    expect(pool.length).toBeGreaterThan(0);
  });

  it("returns structurally identical data across repeated calls", async () => {
    const provider = new MockFootballDataProvider();

    const first = await provider.fetchPlayerPool();
    const second = await provider.fetchPlayerPool();

    expect(second).toEqual(first);
  });

  it("returns a defensive copy — mutating one call's result does not affect a later call", async () => {
    const provider = new MockFootballDataProvider();

    const first = await provider.fetchPlayerPool();
    const originalName = first[0].name;
    first[0].name = "Mutated Name";
    first.push({
      id: "injected",
      name: "Injected Player",
      club: "Nowhere FC",
      position: "MF",
      nationality: null,
      age: null,
      squadNumber: null,
    });

    const second = await provider.fetchPlayerPool();

    expect(second[0].name).toBe(originalName);
    expect(second.find((player) => player.id === "injected")).toBeUndefined();
  });

  it("spans all four canonical Position values across the fixed pool", async () => {
    const provider = new MockFootballDataProvider();
    const pool = await provider.fetchPlayerPool();

    const positions = new Set(pool.map((player) => player.position));
    expect(positions).toEqual(new Set(["FW", "MF", "DF", "GK"]));
  });

  it("every fixture player has fully-populated (non-null) attributes", async () => {
    const provider = new MockFootballDataProvider();
    const pool = await provider.fetchPlayerPool();

    for (const player of pool) {
      expect(player.club).not.toBeNull();
      expect(player.nationality).not.toBeNull();
      expect(player.age).not.toBeNull();
      expect(player.squadNumber).not.toBeNull();
    }
  });
});
