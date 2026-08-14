import { describe, expect, it } from "vitest";
import type { Player } from "@/types/player";
import { compareGuess } from "@/lib/game/comparison-engine";
import {
  CATEGORICAL_ATTRIBUTES,
  COMPARISON_ATTRIBUTES,
  isNumericAttributeResult,
  type AttributeComparisonResult,
} from "@/types/comparison";

/** A fully-populated baseline target player used across scenarios. */
const target: Player = {
  id: "target-1",
  name: "Erling Haaland",
  club: "Manchester City",
  position: "FW",
  nationality: "Norway",
  age: 25,
  squadNumber: 9,
};

/** An exact clone of {@link target}, used for the all-match scenario. */
function exactGuess(): Player {
  return { ...target, id: "guess-exact" };
}

function findResult(
  comparison: { attributes: AttributeComparisonResult[] },
  attribute: string,
): AttributeComparisonResult {
  const result = comparison.attributes.find((entry) => entry.attribute === attribute);
  if (!result) {
    throw new Error(`no result found for attribute ${attribute}`);
  }
  return result;
}

describe("compareGuess — full result shape (REQ-COMPARE-001, 002)", () => {
  it("returns exactly 5 attribute outcomes covering every COMPARISON_ATTRIBUTES entry", () => {
    const comparison = compareGuess(exactGuess(), target);

    expect(comparison.attributes).toHaveLength(5);
    expect(new Set(comparison.attributes.map((entry) => entry.attribute))).toEqual(
      new Set(COMPARISON_ATTRIBUTES),
    );
  });
});

describe("compareGuess — categorical attributes (REQ-COMPARE-003)", () => {
  it("all-categorical-match: nationality/club/position all correct, no direction field", () => {
    const comparison = compareGuess(exactGuess(), target);

    for (const attribute of CATEGORICAL_ATTRIBUTES) {
      const result = findResult(comparison, attribute);
      expect(result.correct).toBe(true);
      expect(isNumericAttributeResult(result)).toBe(false);
      expect("direction" in result).toBe(false);
    }
  });

  it("all-categorical-mismatch: nationality/club/position all incorrect, no direction field", () => {
    const guess: Player = {
      id: "guess-mismatch",
      name: "Someone Else",
      club: "A Different Club",
      position: "GK",
      nationality: "Brazil",
      age: 25,
      squadNumber: 9,
    };
    const comparison = compareGuess(guess, target);

    for (const attribute of CATEGORICAL_ATTRIBUTES) {
      const result = findResult(comparison, attribute);
      expect(result.correct).toBe(false);
      expect("direction" in result).toBe(false);
      expect(result.unavailable).toBeFalsy();
    }
  });

  it.each(["FW", "MF", "DF", "GK"] as const)(
    "position match on %s reports correct with no direction (position enum exhaustiveness)",
    (position) => {
      const guess: Player = { ...target, id: "guess-pos", position };
      const positionTarget: Player = { ...target, position };

      const comparison = compareGuess(guess, positionTarget);
      const result = findResult(comparison, "position");

      expect(result.correct).toBe(true);
      expect("direction" in result).toBe(false);
    },
  );
});

describe("compareGuess — numeric attributes (REQ-COMPARE-004)", () => {
  it("numeric match: age and squadNumber equal reports correct, no direction", () => {
    const comparison = compareGuess(exactGuess(), target);

    const age = findResult(comparison, "age");
    const squadNumber = findResult(comparison, "squadNumber");

    expect(age.correct).toBe(true);
    expect("direction" in age).toBe(false);
    expect(squadNumber.correct).toBe(true);
    expect("direction" in squadNumber).toBe(false);
  });

  it("numeric mismatch higher: target's age is higher than the guessed player's age", () => {
    const guess: Player = { ...target, id: "guess-younger", age: 20 };
    const comparison = compareGuess(guess, target); // target.age = 25

    const age = findResult(comparison, "age");
    expect(age.correct).toBe(false);
    expect(isNumericAttributeResult(age)).toBe(true);
    if (isNumericAttributeResult(age)) {
      expect(age.direction).toBe("higher");
    }
  });

  it("numeric mismatch lower: target's age is lower than the guessed player's age", () => {
    const guess: Player = { ...target, id: "guess-older", age: 30 };
    const comparison = compareGuess(guess, target); // target.age = 25

    const age = findResult(comparison, "age");
    expect(age.correct).toBe(false);
    expect(isNumericAttributeResult(age)).toBe(true);
    if (isNumericAttributeResult(age)) {
      expect(age.direction).toBe("lower");
    }
  });

  it("numeric mismatch direction also applies to squadNumber independently of age", () => {
    const guess: Player = { ...target, id: "guess-squad", squadNumber: 20 };
    const comparison = compareGuess(guess, target); // target.squadNumber = 9

    const squadNumber = findResult(comparison, "squadNumber");
    expect(squadNumber.correct).toBe(false);
    expect(isNumericAttributeResult(squadNumber)).toBe(true);
    if (isNumericAttributeResult(squadNumber)) {
      expect(squadNumber.direction).toBe("lower");
    }
  });

  it("numeric mismatch direction for squadNumber: target's value higher than the guessed player's", () => {
    const guess: Player = { ...target, id: "guess-squad-lower", squadNumber: 2 };
    const comparison = compareGuess(guess, target); // target.squadNumber = 9

    const squadNumber = findResult(comparison, "squadNumber");
    expect(squadNumber.correct).toBe(false);
    if (isNumericAttributeResult(squadNumber)) {
      expect(squadNumber.direction).toBe("higher");
    }
  });
});

describe("compareGuess — duplicate-guess idempotency (REQ-COMPARE-006)", () => {
  it("re-comparing the same guess against the same target produces an identical result every time", () => {
    const guess: Player = { ...target, id: "guess-dup", age: 20, club: "Different Club" };

    const first = compareGuess(guess, target);
    const second = compareGuess(guess, target);
    const third = compareGuess(guess, target);

    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });

  it("is a pure function with no shared mutable state across independent calls", () => {
    const guessA: Player = { ...target, id: "guess-a", age: 20 };
    const guessB: Player = { ...target, id: "guess-b", age: 30 };

    const resultA1 = compareGuess(guessA, target);
    compareGuess(guessB, target); // interleaved call must not affect guessA's result
    const resultA2 = compareGuess(guessA, target);

    expect(resultA2).toEqual(resultA1);
  });
});

describe("compareGuess — incomplete synced data (REQ-COMPARE-007)", () => {
  it("marks a categorical attribute unavailable when the guessed player's value is null", () => {
    const guess: Player = { ...target, id: "guess-null-club", club: null };
    const comparison = compareGuess(guess, target);

    const club = findResult(comparison, "club");
    expect(club.unavailable).toBe(true);
    expect(club.correct).toBe(false);
  });

  it("marks a categorical attribute unavailable when the target player's value is null", () => {
    const nullTarget: Player = { ...target, nationality: null };
    const comparison = compareGuess(exactGuess(), nullTarget);

    const nationality = findResult(comparison, "nationality");
    expect(nationality.unavailable).toBe(true);
    expect(nationality.correct).toBe(false);
  });

  it("marks a numeric attribute unavailable when the guessed player's value is null, with no direction", () => {
    const guess: Player = { ...target, id: "guess-null-age", age: null };
    const comparison = compareGuess(guess, target);

    const age = findResult(comparison, "age");
    expect(age.unavailable).toBe(true);
    expect(age.correct).toBe(false);
    expect("direction" in age).toBe(false);
  });

  it("marks a numeric attribute unavailable when the target player's value is null, with no direction", () => {
    const nullTarget: Player = { ...target, age: null };
    const comparison = compareGuess(exactGuess(), nullTarget);

    const age = findResult(comparison, "age");
    expect(age.unavailable).toBe(true);
    expect(age.correct).toBe(false);
    expect("direction" in age).toBe(false);
  });

  it("marks squadNumber unavailable when the guessed player's value is null, with no direction", () => {
    const guess: Player = { ...target, id: "guess-null-squad", squadNumber: null };
    const comparison = compareGuess(guess, target);

    const squadNumber = findResult(comparison, "squadNumber");
    expect(squadNumber.unavailable).toBe(true);
    expect(squadNumber.correct).toBe(false);
    expect("direction" in squadNumber).toBe(false);
  });

  it("marks squadNumber unavailable when the target player's value is null, with no direction", () => {
    const nullTarget: Player = { ...target, squadNumber: null };
    const comparison = compareGuess(exactGuess(), nullTarget);

    const squadNumber = findResult(comparison, "squadNumber");
    expect(squadNumber.unavailable).toBe(true);
    expect(squadNumber.correct).toBe(false);
    expect("direction" in squadNumber).toBe(false);
  });

  it("does not fail the guess submission — other attributes still compare normally when one is unavailable", () => {
    const guess: Player = { ...target, id: "guess-partial-null", age: null, club: "Wrong Club" };
    const comparison = compareGuess(guess, target);

    expect(comparison.attributes).toHaveLength(5);

    const age = findResult(comparison, "age");
    expect(age.unavailable).toBe(true);

    const club = findResult(comparison, "club");
    expect(club.unavailable).toBeFalsy();
    expect(club.correct).toBe(false);

    const nationality = findResult(comparison, "nationality");
    expect(nationality.unavailable).toBeFalsy();
    expect(nationality.correct).toBe(true);
  });

  it("position is never marked unavailable (non-nullable per types/player.ts)", () => {
    const comparison = compareGuess(exactGuess(), target);
    const position = findResult(comparison, "position");
    expect(position.unavailable).toBeFalsy();
  });
});
