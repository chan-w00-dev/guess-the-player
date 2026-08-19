// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ComparisonTable, { type ComparisonTableEntry } from "@/components/ComparisonTable";
import type { PlayerSearchCandidate } from "@/lib/player-search/types";

afterEach(() => {
  cleanup();
});

function candidate(overrides: Partial<PlayerSearchCandidate> = {}): PlayerSearchCandidate {
  return {
    id: "guess-1",
    originalName: "Bukayo Saka",
    koreanName: "부카요 사카",
    club: "Arsenal FC",
    position: "MF",
    nationality: "England",
    age: 23,
    squadNumber: 7,
    ...overrides,
  };
}

describe("ComparisonTable (REQ-COMPARE-001..012)", () => {
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

  describe("nationality cell (REQ-COMPARE-008/010) — renders the guessed player's actual flag regardless of correctness", () => {
    it("renders the flag with a green background on a correct guess", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate({ nationality: "South Korea" }),
          comparison: { attributes: [{ attribute: "nationality", correct: true }] },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      const cell = screen.getByTestId("cell-0-nationality");
      expect(cell).toHaveTextContent("🇰🇷");
      expect(cell.className).toMatch(/green/);
    });

    it("renders the SAME flag with a red background on an incorrect guess — content is the guessed value regardless of correctness, only the background differs", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate({ nationality: "South Korea" }),
          comparison: { attributes: [{ attribute: "nationality", correct: false }] },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      const cell = screen.getByTestId("cell-0-nationality");
      expect(cell).toHaveTextContent("🇰🇷");
      expect(cell.className).toMatch(/red/);
    });

    it("falls back to the raw nationality text when the nationality has no mapped flag (REQ-COMPARE-012)", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate({ nationality: "Atlantis" }),
          comparison: { attributes: [{ attribute: "nationality", correct: false }] },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      expect(screen.getByTestId("cell-0-nationality")).toHaveTextContent("Atlantis");
    });
  });

  describe("club cell (REQ-COMPARE-008/011) — renders the guessed player's actual emblem regardless of correctness", () => {
    it("renders an <img> emblem with a green background on a correct guess", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate({ club: "Arsenal FC" }),
          comparison: { attributes: [{ attribute: "club", correct: true }] },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      const cell = screen.getByTestId("cell-0-club");
      const img = cell.querySelector("img");
      expect(img).not.toBeNull();
      expect(img).toHaveAttribute("src", "https://crests.football-data.org/57.png");
      expect(cell.className).toMatch(/green/);
    });

    it("renders the SAME emblem with a red background on an incorrect guess", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate({ club: "Arsenal FC" }),
          comparison: { attributes: [{ attribute: "club", correct: false }] },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      const cell = screen.getByTestId("cell-0-club");
      const img = cell.querySelector("img");
      expect(img).not.toBeNull();
      expect(img).toHaveAttribute("src", "https://crests.football-data.org/57.png");
      expect(cell.className).toMatch(/red/);
    });

    it("falls back to the raw club name text when the club has no crest mapping (REQ-COMPARE-012)", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate({ club: "FC Barcelona" }),
          comparison: { attributes: [{ attribute: "club", correct: false }] },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      const cell = screen.getByTestId("cell-0-club");
      expect(cell).toHaveTextContent("FC Barcelona");
      expect(cell.querySelector("img")).toBeNull();
    });
  });

  describe("position cell (REQ-COMPARE-008) — the FW/MF/DF/GK text value, no lookup", () => {
    it("renders the guessed player's position text", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate({ position: "FW" }),
          comparison: { attributes: [{ attribute: "position", correct: false }] },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      expect(screen.getByTestId("cell-0-position")).toHaveTextContent("FW");
    });
  });

  describe("age cell (REQ-COMPARE-009) — the guessed player's actual number plus the existing directional arrow", () => {
    it("renders the guessed player's age with no arrow on a correct match", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate({ age: 30 }),
          comparison: { attributes: [{ attribute: "age", correct: true }] },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      const cell = screen.getByTestId("cell-0-age");
      expect(cell).toHaveTextContent("30");
      expect(cell.textContent).not.toMatch(/[↑↓]/);
    });

    it("renders the guessed player's age with an upward arrow when direction is higher", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate({ age: 25 }),
          comparison: { attributes: [{ attribute: "age", correct: false, direction: "higher" }] },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      expect(screen.getByTestId("cell-0-age")).toHaveTextContent("25 ↑");
    });

    it("renders the guessed player's age with a downward arrow when direction is lower", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate({ age: 28 }),
          comparison: { attributes: [{ attribute: "age", correct: false, direction: "lower" }] },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      expect(screen.getByTestId("cell-0-age")).toHaveTextContent("28 ↓");
    });
  });

  describe("squadNumber cell (REQ-COMPARE-009) — formatted as #N plus the existing directional arrow", () => {
    it("renders #N with no arrow on a correct match", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate({ squadNumber: 7 }),
          comparison: { attributes: [{ attribute: "squadNumber", correct: true }] },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      const cell = screen.getByTestId("cell-0-squadNumber");
      expect(cell).toHaveTextContent("#7");
      expect(cell.textContent).not.toMatch(/[↑↓]/);
    });

    it("renders #N with an upward arrow when direction is higher", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate({ squadNumber: 9 }),
          comparison: { attributes: [{ attribute: "squadNumber", correct: false, direction: "higher" }] },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      expect(screen.getByTestId("cell-0-squadNumber")).toHaveTextContent("#9 ↑");
    });

    it("renders #N with a downward arrow when direction is lower", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate({ squadNumber: 11 }),
          comparison: { attributes: [{ attribute: "squadNumber", correct: false, direction: "lower" }] },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      expect(screen.getByTestId("cell-0-squadNumber")).toHaveTextContent("#11 ↓");
    });

    it("renders the neutral placeholder — never '#null' — when the guessed player's squadNumber is null but the attribute is not marked unavailable", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate({ squadNumber: null }),
          comparison: { attributes: [{ attribute: "squadNumber", correct: false }] },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      const cell = screen.getByTestId("cell-0-squadNumber");
      expect(cell).toHaveTextContent("—");
      expect(cell.textContent).not.toMatch(/#null/);
    });
  });

  describe("unavailable attributes (REQ-COMPARE-007, D1/D2 plan-audit fix) — checked FIRST, never a false flag/crest/value", () => {
    it("renders a neutral placeholder for an unavailable nationality, never a flag", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate({ nationality: "South Korea" }),
          comparison: {
            attributes: [{ attribute: "nationality", correct: false, unavailable: true }],
          },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      const cell = screen.getByTestId("cell-0-nationality");
      expect(cell).toHaveTextContent("—");
      expect(cell.textContent).not.toContain("🇰🇷");
      expect(cell.className).not.toMatch(/green|red/);
    });

    it("renders a neutral placeholder for an unavailable club, never an emblem image", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate({ club: "Arsenal FC" }),
          comparison: { attributes: [{ attribute: "club", correct: false, unavailable: true }] },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      const cell = screen.getByTestId("cell-0-club");
      expect(cell).toHaveTextContent("—");
      expect(cell.querySelector("img")).toBeNull();
      expect(cell.className).not.toMatch(/green|red/);
    });

    it("renders a neutral placeholder for an unavailable numeric attribute even when correct=true, never a false-correct green cell, never a value, never an arrow", () => {
      // Regression guard for the exact hazard named in the SPEC: an
      // `unavailable` numeric attribute must never render as if it were a
      // correct/incorrect match, and must never show a directional arrow.
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate({ squadNumber: 7 }),
          comparison: {
            attributes: [{ attribute: "squadNumber", correct: true, unavailable: true }],
          },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      const cell = screen.getByTestId("cell-0-squadNumber");
      expect(cell).toHaveTextContent("—");
      expect(cell.className).not.toMatch(/green|red/);
      expect(cell.textContent).not.toMatch(/[↑↓✓✗#]/);
    });

    it("renders a neutral placeholder for an unavailable age, never a value", () => {
      const entries: ComparisonTableEntry[] = [
        {
          candidate: candidate({ age: 30 }),
          comparison: { attributes: [{ attribute: "age", correct: false, unavailable: true }] },
        },
      ];
      render(<ComparisonTable entries={entries} />);

      const cell = screen.getByTestId("cell-0-age");
      expect(cell).toHaveTextContent("—");
      expect(cell.className).not.toMatch(/green|red/);
    });
  });

  it("renders a neutral placeholder when no result row exists for an attribute at all", () => {
    const entries: ComparisonTableEntry[] = [{ candidate: candidate(), comparison: { attributes: [] } }];
    render(<ComparisonTable entries={entries} />);

    const cell = screen.getByTestId("cell-0-age");
    expect(cell).toHaveTextContent("—");
  });

  describe("club-emblem rendering makes no new runtime API call (REQ-COMPARE-011, D3 audit finding)", () => {
    it("renders the crest purely from the static club-crests lookup — no fetch/XHR is invoked while rendering", () => {
      const fetchSpy = vi.fn();
      const originalFetch = globalThis.fetch;
      globalThis.fetch = fetchSpy as unknown as typeof fetch;

      try {
        const entries: ComparisonTableEntry[] = [
          {
            candidate: candidate({ club: "Chelsea FC" }),
            comparison: { attributes: [{ attribute: "club", correct: true }] },
          },
        ];
        render(<ComparisonTable entries={entries} />);

        const cell = screen.getByTestId("cell-0-club");
        expect(cell.querySelector("img")).toHaveAttribute(
          "src",
          "https://crests.football-data.org/61.png",
        );
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
