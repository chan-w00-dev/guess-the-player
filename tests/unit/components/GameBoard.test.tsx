// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PlayerSearchCandidate } from "@/lib/player-search/types";

/**
 * GameBoard is tested with its two most complex children (GuessSearchInput's
 * own debounced search, ResultModal's rendering) stubbed out, keeping this
 * suite focused on GameBoard's own responsibility: round lifecycle state and
 * the `/api/player/random` + `/api/guess` wiring. `GuessSearchInput` and
 * `ResultModal` each have their own dedicated test file exercising their own
 * internals.
 */

const CANDIDATE: PlayerSearchCandidate = {
  id: "guess-1",
  originalName: "Bukayo Saka",
  koreanName: "부카요 사카",
  club: "Arsenal",
  position: "MF",
};

vi.mock("@/components/GuessSearchInput", () => ({
  default: ({
    onSelect,
    disabled,
  }: {
    onSelect: (candidate: PlayerSearchCandidate) => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      data-testid="mock-search-select"
      disabled={disabled}
      onClick={() => onSelect(CANDIDATE)}
    >
      select-candidate
    </button>
  ),
}));

vi.mock("@/components/ResultModal", () => ({
  default: ({
    status,
    reveal,
    onPlayAgain,
  }: {
    status: string;
    reveal: { koreanName: string };
    onPlayAgain: () => void;
  }) => (
    <div data-testid="mock-result-modal">
      <span data-testid="mock-result-status">{status}</span>
      <span data-testid="mock-result-name">{reveal.koreanName}</span>
      <button type="button" onClick={onPlayAgain}>
        play-again
      </button>
    </div>
  ),
}));

import GameBoard from "@/components/GameBoard";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("GameBoard (SPEC-GAME-CORE-001 §F M10 orchestrator)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("starts a round on mount and renders the playing state", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ roundToken: "tok-1", attemptsRemaining: 8 }));

    render(<GameBoard />);

    expect(screen.getByTestId("game-board-loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("attempt-counter")).toHaveTextContent("0 of 8 attempts used");
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/player/random");
  });

  it("renders the empty-pool state on a 503 empty-pool response instead of crashing", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "empty-pool", message: "none" }, 503));

    render(<GameBoard />);

    await waitFor(() => {
      expect(screen.getByTestId("game-board-empty-pool")).toBeInTheDocument();
    });
  });

  it("submits a guess on select, appends comparison history, and advances the attempt count", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ roundToken: "tok-1", attemptsRemaining: 8 }));
    render(<GameBoard />);
    await waitFor(() => screen.getByTestId("attempt-counter"));

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        roundToken: "tok-2",
        result: {
          comparison: { attributes: [{ attribute: "club", correct: false }] },
          attemptCount: 1,
          status: "active",
        },
      }),
    );

    fireEvent.click(screen.getByTestId("mock-search-select"));

    await waitFor(() => {
      expect(screen.getByTestId("attempt-counter")).toHaveTextContent("1 of 8 attempts used");
    });
    expect(screen.getByTestId("comparison-table")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/guess",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ roundToken: "tok-1", playerId: CANDIDATE.id }),
      }),
    );
  });

  it("shows the ResultModal on a winning guess, disables search, and starts a new round with excludeTargetId on play again", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ roundToken: "tok-1", attemptsRemaining: 8 }));
    render(<GameBoard />);
    await waitFor(() => screen.getByTestId("attempt-counter"));

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        roundToken: "tok-2",
        result: {
          comparison: { attributes: [{ attribute: "club", correct: true }] },
          attemptCount: 1,
          status: "won",
          reveal: { id: "target-1", originalName: "Erling Haaland", koreanName: "엘링 홀란드" },
        },
      }),
    );

    fireEvent.click(screen.getByTestId("mock-search-select"));

    await waitFor(() => {
      expect(screen.getByTestId("mock-result-modal")).toBeInTheDocument();
    });
    expect(screen.getByTestId("mock-result-status")).toHaveTextContent("won");
    expect(screen.getByTestId("mock-result-name")).toHaveTextContent("엘링 홀란드");
    expect(screen.getByTestId("mock-search-select")).toBeDisabled();

    fetchMock.mockResolvedValueOnce(jsonResponse({ roundToken: "tok-3", attemptsRemaining: 8 }));
    fireEvent.click(screen.getByText("play-again"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith("/api/player/random?excludeTargetId=target-1");
    });
    await waitFor(() => {
      expect(screen.queryByTestId("mock-result-modal")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("attempt-counter")).toHaveTextContent("0 of 8 attempts used");
  });

  it("surfaces an inline error on a rejected guess response without crashing (REQ-GUESS-007 client surface)", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ roundToken: "tok-1", attemptsRemaining: 8 }));
    render(<GameBoard />);
    await waitFor(() => screen.getByTestId("attempt-counter"));

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status: "rejected", reason: "round-already-ended" }, 409),
    );

    fireEvent.click(screen.getByTestId("mock-search-select"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("This round has already ended.");
    });
    // The board itself must still be rendered (no crash / blank screen).
    expect(screen.getByTestId("attempt-counter")).toBeInTheDocument();
  });
});
