/**
 * Vitest global setup — SPEC-GAME-CORE-001 §F M10.
 *
 * Extends `expect` with jest-dom's DOM matchers (toBeInTheDocument,
 * toBeDisabled, etc.) for the `.tsx` component test suite. Loaded via
 * `test.setupFiles` in `vitest.config.ts`; has no effect on the existing
 * `.ts` node-environment suite beyond the negligible cost of the import.
 */
import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * React Testing Library's auto-cleanup relies on detecting a Jest-style
 * global `afterEach`. This project runs Vitest without `test.globals: true`
 * (explicit imports everywhere, per the existing `.ts` suite's convention),
 * so auto-cleanup never registers and rendered trees leak across tests
 * within the same file, causing spurious "multiple elements found" errors.
 * Registering `cleanup()` explicitly here restores per-test DOM teardown.
 */
afterEach(() => {
  cleanup();
});
