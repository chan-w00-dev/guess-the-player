// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import GuessSearchInput from "@/components/GuessSearchInput";
import type { PlayerSearchCandidate } from "@/lib/player-search/types";

const CANDIDATES: PlayerSearchCandidate[] = [
  {
    id: "player-1",
    originalName: "Son Heung-min",
    koreanName: "손흥민",
    club: "Tottenham",
    position: "FW",
    nationality: "South Korea",
    age: 33,
    squadNumber: 7,
  },
];

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("GuessSearchInput (REQ-SEARCH-001..004)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("debounces the search request — does not call fetch until ~250ms after the last keystroke", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(jsonResponse(CANDIDATES));
    render(<GuessSearchInput onSelect={() => {}} />);

    const input = screen.getByLabelText("Guess a player");
    fireEvent.change(input, { target: { value: "손" } });

    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(249);
    });
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/player/search?q="),
    );
  });

  it("resets the debounce timer on every keystroke — only fires once for a rapid sequence", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(jsonResponse(CANDIDATES));
    render(<GuessSearchInput onSelect={() => {}} />);

    const input = screen.getByLabelText("Guess a player");
    fireEvent.change(input, { target: { value: "소" } });
    await act(async () => {
      vi.advanceTimersByTime(150);
    });
    fireEvent.change(input, { target: { value: "손" } });
    await act(async () => {
      vi.advanceTimersByTime(150);
    });
    fireEvent.change(input, { target: { value: "손흥" } });

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent("손흥")));
  });

  it("renders a candidate dropdown after the debounced search resolves, and calls onSelect + clears on pick", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(jsonResponse(CANDIDATES));
    const onSelect = vi.fn();
    render(<GuessSearchInput onSelect={onSelect} />);

    const input = screen.getByLabelText("Guess a player") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "손흥" } });

    // `advanceTimersByTimeAsync` (unlike `advanceTimersByTime`) also flushes
    // the pending fetch/json microtasks in between — plain `waitFor` polls
    // via real timers, which never fires while fake timers are active.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(screen.getByText("손흥민")).toBeInTheDocument();

    fireEvent.click(screen.getByText("손흥민"));

    expect(onSelect).toHaveBeenCalledWith(CANDIDATES[0]);
    expect(input.value).toBe("");
    expect(screen.queryByText("손흥민")).not.toBeInTheDocument();
  });

  it("does not call fetch when the query is cleared back to empty", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(jsonResponse(CANDIDATES));
    render(<GuessSearchInput onSelect={() => {}} />);

    const input = screen.getByLabelText("Guess a player");
    fireEvent.change(input, { target: { value: "손" } });
    fireEvent.change(input, { target: { value: "" } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("respects the disabled prop", () => {
    render(<GuessSearchInput onSelect={() => {}} disabled />);

    expect(screen.getByLabelText("Guess a player")).toBeDisabled();
  });
});
