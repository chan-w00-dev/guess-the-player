/**
 * Real football-data.org {@link FootballDataProvider} adapter —
 * SPEC-GAME-CORE-001 §F M3.
 *
 * Endpoint (verified against `docs.football-data.org`, 2026-08-14):
 * `GET https://api.football-data.org/v4/competitions/PL/teams?season=2026`
 * (competition code `PL` = Premier League; `season` targets the 2026/27
 * season per spec.md's confirmed scope).
 *
 * Authentication (user-confirmed via football-data.org's own onboarding
 * email, plan.md §F M3): the API key travels in an `X-Auth-Token` HTTP
 * header — NOT `Authorization: Bearer`, NOT a query parameter. The key is
 * read from `process.env.FOOTBALL_DATA_API_KEY` by default and MUST never
 * be hardcoded or logged (REQ-NFR-001).
 *
 * This adapter's own unit tests inject a `fetchImpl` — they never call the
 * real network and never depend on a real `.env.local` value.
 */

import type { Player } from "@/types/player";
import { computeAge } from "./age";
import { mapPosition } from "./position-mapper";
import type { FootballDataProvider } from "./types";

const COMPETITION_ENDPOINT = "https://api.football-data.org/v4/competitions/PL/teams";

/**
 * football-data.org's raw `Person`/`Player` shape (the subset this adapter
 * consumes). No `shirtNumber` field — confirmed live against the free-tier
 * API (spec.md HISTORY 0.4.0): the raw player object returns only
 * `id, name, position, dateOfBirth, nationality` on both the
 * competition-teams bulk endpoint and the per-team detail endpoint.
 */
interface RawFootballDataPlayer {
  id: number;
  name: string;
  position: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
}

interface RawFootballDataTeam {
  name: string;
  squad: RawFootballDataPlayer[];
}

interface RawFootballDataResponse {
  teams: RawFootballDataTeam[];
}

export interface FootballDataOrgProviderOptions {
  /**
   * Injectable fetch implementation. Defaults to the global `fetch`.
   * Tests MUST supply a mock here — this adapter never falls back to a
   * live network call inside its own test suite.
   */
  fetchImpl?: typeof fetch;
  /** API key; defaults to `process.env.FOOTBALL_DATA_API_KEY`. */
  apiKey?: string;
  /** Season year to query; defaults to 2026 (the PL 2026/27 season, spec.md scope). */
  season?: number;
  /**
   * Reference date used for age computation (see {@link computeAge}).
   * Defaults to `new Date()` at fetch time in production; tests inject a
   * fixed date so age assertions are deterministic.
   */
  referenceDate?: Date;
}

export class FootballDataOrgProvider implements FootballDataProvider {
  private readonly fetchImpl: typeof fetch;
  private readonly apiKey: string | undefined;
  private readonly season: number;
  private readonly referenceDate: Date | undefined;

  constructor(options: FootballDataOrgProviderOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.apiKey = options.apiKey ?? process.env.FOOTBALL_DATA_API_KEY;
    this.season = options.season ?? 2026;
    this.referenceDate = options.referenceDate;
  }

  async fetchPlayerPool(): Promise<Player[]> {
    if (!this.apiKey) {
      throw new Error(
        "FootballDataOrgProvider: FOOTBALL_DATA_API_KEY is not configured (no apiKey option and no process.env.FOOTBALL_DATA_API_KEY)",
      );
    }

    const url = `${COMPETITION_ENDPOINT}?season=${this.season}`;
    const response = await this.fetchImpl(url, {
      headers: { "X-Auth-Token": this.apiKey },
    });

    if (!response.ok) {
      throw new Error(
        `FootballDataOrgProvider: request failed with status ${response.status} ${response.statusText}`,
      );
    }

    const payload = (await response.json()) as RawFootballDataResponse;
    const referenceDate = this.referenceDate ?? new Date();

    const players: Player[] = [];
    for (const team of payload.teams ?? []) {
      for (const rawPlayer of team.squad ?? []) {
        const player = mapRawPlayer(rawPlayer, team.name, referenceDate);
        if (player) {
          players.push(player);
        }
      }
    }

    return players;
  }
}

/**
 * Maps one raw football-data.org player object onto the M1 {@link Player}
 * shape. Returns `null` when the raw position string does not classify
 * into any of the four canonical values (plan.md §B fallback) — the
 * caller skips that player from the pool for the current sync run.
 */
function mapRawPlayer(
  raw: RawFootballDataPlayer,
  club: string,
  referenceDate: Date,
): Player | null {
  const position = raw.position ? mapPosition(raw.position) : null;

  if (!position) {
    // plan.md §B rule 5 fallback: log the unmapped raw string + player id,
    // then skip — never write an undefined or guessed position.
    console.warn(
      `[football-api] unmapped position "${raw.position ?? "(missing)"}" for player id=${raw.id} ("${raw.name}") — skipping from pool`,
    );
    return null;
  }

  return {
    id: String(raw.id),
    name: raw.name,
    club,
    position,
    nationality: raw.nationality ?? null,
    age: raw.dateOfBirth ? computeAge(raw.dateOfBirth, referenceDate) : null,
    // squadNumber is never provided by football-data.org's free tier
    // (confirmed live, spec.md HISTORY 0.4.0, unchanged by the 0.5.0
    // reinstatement) — always a literal `null` here, never derived from a
    // raw provider field. Squad number is populated exclusively via the
    // manual entry process (REQ-SYNC-004, `lib/squad-number/`), not by this
    // provider or the M4 sync job that consumes it.
    squadNumber: null,
  };
}
