// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ResultModal from "@/components/ResultModal";

const REVEAL = { id: "player-1", originalName: "Erling Haaland", koreanName: "엘링 홀란드" };

describe("ResultModal (REQ-GUESS-002/004)", () => {
  it("renders a win message with the Korean-mapped name and original name", () => {
    render(<ResultModal status="won" reveal={REVEAL} onPlayAgain={() => {}} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("You won!")).toBeInTheDocument();
    expect(screen.getByTestId("result-modal-korean-name")).toHaveTextContent("엘링 홀란드");
    expect(screen.getByText("Erling Haaland")).toBeInTheDocument();
  });

  it("renders a loss message on status lost", () => {
    render(<ResultModal status="lost" reveal={REVEAL} onPlayAgain={() => {}} />);

    expect(screen.getByText("You lost")).toBeInTheDocument();
  });

  it("calls onPlayAgain when the Play again button is clicked", () => {
    const onPlayAgain = vi.fn();
    render(<ResultModal status="won" reveal={REVEAL} onPlayAgain={onPlayAgain} />);

    fireEvent.click(screen.getByRole("button", { name: "Play again" }));

    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });
});
