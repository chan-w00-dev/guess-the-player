// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ComparisonTable, { type ComparisonTableEntry } from "@/components/ComparisonTable";
import type { PlayerSearchCandidate } from "@/lib/player-search/types";

function candidate(overrides: Partial<PlayerSearchCandidate> = {}): PlayerSearchCandidate {
  return {
    id: "guess-1",
    originalName: "Bukayo Saka",
    koreanName: "부카요 사카",
    club: "Arsenal",
    position: "MF",
    ...overrides,
  };
}

describe("ComparisonTable (REQ-COMPARE-001..007)", () => {
  it("renders an empty-state message with no guesses yet", () => {
    render(<ComparisonTable entries={[]} />);

    expect(screen.getByTestId("comparison-table-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("comparison-table")).not.toBeInTheDocument();
  });

  it("renders one row per entry and one column per comparison attribute", () => {
    const entries: ComparisonTableEntry[] = [
      {
        candidate: candidate(),
        comparison: {
          attributes: [
            { attribute: "nationality", correct: true },
            { attribute: "club", correct: false },
            { attribute: "position", correct: true },
            { attribute: "age", correct: false, direction: "higher" },
            { attribute: "squadNumber", correct: false, direction: "lower" },
          ],
        },
      },
    ];

    render(<ComparisonTable entries={entries} />);

    expect(screen.getByTestId("comparison-table")).toBeInTheDocument();
    expect(screen.getByText("부카요 사카")).toBeInTheDocument();
  });

  describe("categorical attributes (nationality/club/position) — REQ-COMPARE-003: never a direction", () => {
    it("renders a correct indicator with no arrow for a correct categorical match", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate(),
          comparison: { attributes: [{ attribute: "club", correct: true }] },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      const cell = screen.getByTestId("cell-0-club");
      expect(cell).toHaveTextContent("✓");
      expect(cell.textContent).not.toMatch(/[↑↓]/);
    });

    it("renders an incorrect indicator with no arrow for an incorrect categorical match", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate(),
          comparison: { attributes: [{ attribute: "position", correct: false }] },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      const cell = screen.getByTestId("cell-0-position");
      expect(cell).toHaveTextContent("✗");
      expect(cell.textContent).not.toMatch(/[↑↓]/);
    });
  });

  describe("numeric attributes (age/squadNumber) — REQ-COMPARE-004: directional arrow only on mismatch", () => {
    it("renders an upward arrow when direction is higher", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate(),
          comparison: { attributes: [{ attribute: "age", correct: false, direction: "higher" }] },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      expect(screen.getByTestId("cell-0-age")).toHaveTextContent("✗ ↑");
    });

    it("renders a downward arrow when direction is lower", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate(),
          comparison: {
            attributes: [{ attribute: "squadNumber", correct: false, direction: "lower" }],
          },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      expect(screen.getByTestId("cell-0-squadNumber")).toHaveTextContent("✗ ↓");
    });

    it("renders no arrow for a correct numeric match, even though direction is also absent there", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate(),
          comparison: { attributes: [{ attribute: "age", correct: true }] },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      const cell = screen.getByTestId("cell-0-age");
      expect(cell).toHaveTextContent("✓");
      expect(cell.textContent).not.toMatch(/[↑↓]/);
    });
  });

  describe("unavailable attributes (REQ-COMPARE-007) — never a false correct/incorrect indicator", () => {
    it("renders a neutral placeholder for an unavailable categorical attribute, not a correct/incorrect color", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate(),
          comparison: {
            attributes: [{ attribute: "nationality", correct: false, unavailable: true }],
          },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      const cell = screen.getByTestId("cell-0-nationality");
      expect(cell).toHaveTextContent("—");
      expect(cell.className).not.toMatch(/green|red/);
    });

    it("renders a neutral placeholder for an unavailable numeric attribute even when correct=true, never a false-correct green cell", () => {
      // Regression guard for the exact hazard named in the SPEC: an
      // `unavailable` numeric attribute must never render as if it were a
      // correct/incorrect match, and must never show a directional arrow.
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate(),
          comparison: {
            attributes: [{ attribute: "squadNumber", correct: true, unavailable: true }],
          },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      const cell = screen.getByTestId("cell-0-squadNumber");
      expect(cell).toHaveTextContent("—");
      expect(cell.className).not.toMatch(/green|red/);
      expect(cell.textContent).not.toMatch(/[↑↓✓✗]/);
    });
  });

  it("renders a neutral placeholder when no result row exists for an attribute at all", () => {
    const entries: ComparisonTableEntry[] = [{ candidate: candidate(), comparison: { attributes: [] } }];
    render(<ComparisonTable entries={entries} />);

    const cell = screen.getByTestId("cell-0-age");
    expect(cell).toHaveTextContent("—");
  });
});
