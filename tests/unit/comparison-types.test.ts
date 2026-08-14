import { describe, expect, it } from "vitest";
import type { Player } from "@/types/player";
import {
  CATEGORICAL_ATTRIBUTES,
  COMPARISON_ATTRIBUTES,
  MAX_ATTEMPTS,
  NUMERIC_ATTRIBUTES,
  createInitialRoundState,
  isCategoricalAttribute,
  isNumericAttribute,
  isNumericAttributeResult,
  type AttributeComparisonResult,
  type ComparisonResult,
  type GuessResult,
  type KoreanMapping,
} from "@/types/comparison";

const targetPlayer: Player = {
  id: "target-1",
  name: "Erling Haaland",
  club: "Manchester City",
  position: "FW",
  nationality: "Norway",
  age: 25,
  squadNumber: 9,
};

describe("Comparison attribute constants (REQ-COMPARE-001)", () => {
  it("COMPARISON_ATTRIBUTES contains exactly the 5 required attributes", () => {
    expect(COMPARISON_ATTRIBUTES).toHaveLength(5);
    expect(new Set(COMPARISON_ATTRIBUTES)).toEqual(
      new Set(["nationality", "club", "position", "age", "squadNumber"]),
    );
  });

  it("CATEGORICAL_ATTRIBUTES and NUMERIC_ATTRIBUTES partition COMPARISON_ATTRIBUTES exactly", () => {
    expect(CATEGORICAL_ATTRIBUTES).toHaveLength(3);
    expect(NUMERIC_ATTRIBUTES).toHaveLength(2);

    const union = new Set([...CATEGORICAL_ATTRIBUTES, ...NUMERIC_ATTRIBUTES]);
    expect(union).toEqual(new Set(COMPARISON_ATTRIBUTES));

    const intersection = CATEGORICAL_ATTRIBUTES.filter((attribute) =>
      (NUMERIC_ATTRIBUTES as readonly string[]).includes(attribute),
    );
    expect(intersection).toHaveLength(0);
  });

  it.each(CATEGORICAL_ATTRIBUTES)(
    "isCategoricalAttribute(%s) is true and isNumericAttribute(%s) is false",
    (attribute) => {
      expect(isCategoricalAttribute(attribute)).toBe(true);
      expect(isNumericAttribute(attribute)).toBe(false);
    },
  );

  it.each(NUMERIC_ATTRIBUTES)(
    "isNumericAttribute(%s) is true and isCategoricalAttribute(%s) is false",
    (attribute) => {
      expect(isNumericAttribute(attribute)).toBe(true);
      expect(isCategoricalAttribute(attribute)).toBe(false);
    },
  );
});

describe("AttributeComparisonResult discriminated union (REQ-COMPARE-003/004)", () => {
  it("isNumericAttributeResult is false for a categorical result (no direction field)", () => {
    const result: AttributeComparisonResult = { attribute: "club", correct: false };
    expect(isNumericAttributeResult(result)).toBe(false);
  });

  it("isNumericAttributeResult is true for a numeric result and preserves an optional direction", () => {
    const result: AttributeComparisonResult = {
      attribute: "age",
      correct: false,
      direction: "higher",
    };
    expect(isNumericAttributeResult(result)).toBe(true);
    if (isNumericAttributeResult(result)) {
      expect(result.direction).toBe("higher");
    }
  });

  it("a full ComparisonResult carries exactly 5 attribute outcomes", () => {
    const comparison: ComparisonResult = {
      attributes: COMPARISON_ATTRIBUTES.map(
        (attribute): AttributeComparisonResult => ({ attribute, correct: true }),
      ),
    };
    expect(comparison.attributes).toHaveLength(5);
  });

  it("supports marking an attribute unavailable for incomplete synced data (REQ-COMPARE-007)", () => {
    const result: AttributeComparisonResult = {
      attribute: "squadNumber",
      correct: false,
      unavailable: true,
    };
    expect(result.unavailable).toBe(true);
  });
});

describe("RoundState + createInitialRoundState", () => {
  it("MAX_ATTEMPTS is exactly 8 (REQ-GUESS-007)", () => {
    expect(MAX_ATTEMPTS).toBe(8);
  });

  it("createInitialRoundState starts an active round with zero attempts", () => {
    const round = createInitialRoundState(targetPlayer);

    expect(round.target).toBe(targetPlayer);
    expect(round.attempts).toEqual([]);
    expect(round.attemptCount).toBe(0);
    expect(round.status).toBe("active");
  });

  it("createInitialRoundState returns a fresh attempts array per call (no shared mutable state)", () => {
    const roundA = createInitialRoundState(targetPlayer);
    const roundB = createInitialRoundState(targetPlayer);

    roundA.attempts.push(targetPlayer);

    expect(roundB.attempts).toHaveLength(0);
  });
});

describe("GuessResult + KoreanMapping shapes", () => {
  it("a GuessResult while active has no reveal field (REQ-GUESS-005)", () => {
    const result: GuessResult = {
      comparison: { attributes: [] },
      attemptCount: 1,
      status: "active",
    };
    expect(result.reveal).toBeUndefined();
  });

  it("a GuessResult on win/loss carries the Korean-mapped reveal (REQ-GUESS-002/004)", () => {
    const result: GuessResult = {
      comparison: { attributes: [] },
      attemptCount: 3,
      status: "won",
      reveal: { originalName: "Son Heung-min", koreanName: "손흥민" },
    };
    expect(result.reveal?.koreanName).toBe("손흥민");
  });

  it("KoreanMapping shape maps an original-language name to a Korean display name", () => {
    const mapping: KoreanMapping = {
      originalName: "Erling Haaland",
      koreanName: "엘링 홀란드",
    };
    expect(mapping.koreanName).toBe("엘링 홀란드");
  });
});
