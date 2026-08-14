/**
 * Barrel export for the `lib/football-api/` module — SPEC-GAME-CORE-001 §F M3.
 * Consumed exclusively by the M4 sync job (REQ-SYNC-001); no live gameplay
 * handler or `app/api/` route may import this module (plan.md §D/§G).
 */

export type { FootballDataProvider } from "./types";
export { mapPosition } from "./position-mapper";
export { computeAge } from "./age";
export {
  FootballDataOrgProvider,
  type FootballDataOrgProviderOptions,
} from "./football-data-org-provider";
export { MockFootballDataProvider } from "./mock-provider";
