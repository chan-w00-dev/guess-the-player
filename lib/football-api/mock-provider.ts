/**
 * Deterministic mock/stub {@link FootballDataProvider} adapter —
 * SPEC-GAME-CORE-001 §F M3.
 *
 * Returns the same small, fixed in-memory player set on every call, with
 * zero network access. Used by this SPEC's own tests (M2's successors and
 * every later milestone — M4 sync job, M6 search, M7 selection, M8 guess
 * service) that need provider-shaped data without depending on football-
 * data.org or any live network call.
 */

import type { Player } from "@/types/player";
import type { FootballDataProvider } from "./types";

/**
 * Fixed player fixture set — spans all four {@link Position} values and
 * carries fully-populated attributes (no nulls), so consumers exercising
 * the happy path never need to special-case incomplete data from this
 * adapter. REQ-COMPARE-007 (incomplete data) is exercised via
 * hand-constructed {@link Player} fixtures at the call site instead, not
 * via this fixed set.
 */
const MOCK_PLAYERS: readonly Player[] = [
  {
    id: "mock-1",
    name: "Erling Haaland",
    club: "Manchester City",
    position: "FW",
    nationality: "Norway",
    age: 25,
  },
  {
    id: "mock-2",
    name: "Son Heung-min",
    club: "Tottenham Hotspur",
    position: "FW",
    nationality: "South Korea",
    age: 33,
  },
  {
    id: "mock-3",
    name: "Kevin De Bruyne",
    club: "Manchester City",
    position: "MF",
    nationality: "Belgium",
    age: 34,
  },
  {
    id: "mock-4",
    name: "Virgil van Dijk",
    club: "Liverpool",
    position: "DF",
    nationality: "Netherlands",
    age: 34,
  },
  {
    id: "mock-5",
    name: "Alisson Becker",
    club: "Liverpool",
    position: "GK",
    nationality: "Brazil",
    age: 33,
  },
];

export class MockFootballDataProvider implements FootballDataProvider {
  /**
   * Returns a fresh defensive-copied array of the fixed player set on every
   * call — callers mutating one call's result MUST NOT affect any other
   * call's result.
   */
  async fetchPlayerPool(): Promise<Player[]> {
    return MOCK_PLAYERS.map((player) => ({ ...player }));
  }
}
