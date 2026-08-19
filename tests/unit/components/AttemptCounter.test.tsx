// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AttemptCounter from "@/components/AttemptCounter";
import { MAX_ATTEMPTS } from "@/types/comparison";

describe("AttemptCounter (REQ-GUESS-007)", () => {
  it("renders the current attempt count against the imported MAX_ATTEMPTS constant", () => {
    render(<AttemptCounter attemptCount={3} />);

    expect(screen.getByTestId("attempt-counter")).toHaveTextContent(
      `3 of ${MAX_ATTEMPTS} attempts used`,
    );
  });

  it("renders 0 of MAX_ATTEMPTS at the start of a round", () => {
    render(<AttemptCounter attemptCount={0} />);

    expect(screen.getByTestId("attempt-counter")).toHaveTextContent(
      `0 of ${MAX_ATTEMPTS} attempts used`,
    );
  });

  it("never hardcodes 8 — reflects MAX_ATTEMPTS literally", () => {
    expect(MAX_ATTEMPTS).toBe(8);
    render(<AttemptCounter attemptCount={8} />);
    expect(screen.getByTestId("attempt-counter")).toHaveTextContent("8 of 8 attempts used");
  });
});
