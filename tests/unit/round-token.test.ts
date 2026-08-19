import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signRoundToken, verifyRoundToken } from "@/lib/game/round-token";
import { createInitialRoundState, type RoundState } from "@/types/comparison";
import type { Player } from "@/types/player";

/**
 * Encrypts an arbitrary (possibly shape-invalid) JSON payload using the
 * exact same scheme `signRoundToken` uses, so tests can exercise
 * `verifyRoundToken`'s payload-shape guard directly — a case
 * `signRoundToken` itself cannot produce, since it only ever accepts a
 * well-typed `RoundState`.
 */
function encryptArbitraryPayload(payload: unknown): string {
  const secret = process.env.ROUND_TOKEN_SECRET as string;
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    authTag.toString("base64url"),
  ].join(".");
}

const TARGET: Player = {
  id: "target-1",
  name: "Erling Haaland",
  club: "Manchester City",
  position: "FW",
  nationality: "Norway",
  age: 25,
  squadNumber: 9,
};

const ORIGINAL_SECRET = process.env.ROUND_TOKEN_SECRET;

beforeEach(() => {
  process.env.ROUND_TOKEN_SECRET = "test-secret-do-not-use-in-production";
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.ROUND_TOKEN_SECRET;
  } else {
    process.env.ROUND_TOKEN_SECRET = ORIGINAL_SECRET;
  }
});

describe("signRoundToken / verifyRoundToken — round-trip (D1)", () => {
  it("returns the original round state after sign then verify", () => {
    const round = createInitialRoundState(TARGET);
    const token = signRoundToken(round);

    const verified = verifyRoundToken(token);

    expect(verified).toEqual(round);
  });

  it("round-trips a round with attempts recorded and a non-active status", () => {
    const round: RoundState = {
      target: TARGET,
      attempts: [{ ...TARGET, id: "guess-1" }],
      attemptCount: 1,
      status: "won",
    };
    const token = signRoundToken(round);

    expect(verifyRoundToken(token)).toEqual(round);
  });
});

describe("signRoundToken — output shape", () => {
  it("produces a token that is not a plain base64 encoding of the round JSON", () => {
    const round = createInitialRoundState(TARGET);
    const token = signRoundToken(round);

    // Confidentiality: the target's name must not appear as a readable
    // substring of the raw token (it must be encrypted, not merely encoded).
    expect(token).not.toContain(TARGET.name);
    expect(token.split(".")).toHaveLength(3);
  });

  it("produces a different token on every call (fresh random IV)", () => {
    const round = createInitialRoundState(TARGET);
    const tokenA = signRoundToken(round);
    const tokenB = signRoundToken(round);

    expect(tokenA).not.toBe(tokenB);
  });
});

describe("verifyRoundToken — tampering detection", () => {
  it("returns null when the ciphertext segment is tampered with", () => {
    const round = createInitialRoundState(TARGET);
    const token = signRoundToken(round);
    const [iv, ciphertext, authTag] = token.split(".");

    // Flip a character in the ciphertext segment.
    const tamperedChar = ciphertext[0] === "A" ? "B" : "A";
    const tamperedCiphertext = tamperedChar + ciphertext.slice(1);
    const tamperedToken = [iv, tamperedCiphertext, authTag].join(".");

    expect(verifyRoundToken(tamperedToken)).toBeNull();
  });

  it("returns null when the auth-tag segment is tampered with", () => {
    const round = createInitialRoundState(TARGET);
    const token = signRoundToken(round);
    const [iv, ciphertext, authTag] = token.split(".");

    const tamperedChar = authTag[0] === "A" ? "B" : "A";
    const tamperedAuthTag = tamperedChar + authTag.slice(1);
    const tamperedToken = [iv, ciphertext, tamperedAuthTag].join(".");

    expect(verifyRoundToken(tamperedToken)).toBeNull();
  });

  it("returns null for a token with the wrong number of segments", () => {
    expect(verifyRoundToken("only-one-segment")).toBeNull();
    expect(verifyRoundToken("a.b")).toBeNull();
    expect(verifyRoundToken("a.b.c.d")).toBeNull();
  });

  it("returns null for a completely malformed/garbage token", () => {
    expect(verifyRoundToken("not-a-real-token-at-all")).toBeNull();
    expect(verifyRoundToken("")).toBeNull();
  });

  it("returns null when a token signed under a different secret is verified", () => {
    const round = createInitialRoundState(TARGET);
    const token = signRoundToken(round);

    process.env.ROUND_TOKEN_SECRET = "a-completely-different-secret";

    expect(verifyRoundToken(token)).toBeNull();
  });
});

describe("verifyRoundToken — payload shape validation (successfully decrypted, but malformed)", () => {
  it("returns null when the decrypted payload is not an object", () => {
    expect(verifyRoundToken(encryptArbitraryPayload("just a string"))).toBeNull();
    expect(verifyRoundToken(encryptArbitraryPayload(null))).toBeNull();
  });

  it("returns null when target is missing or not an object", () => {
    expect(
      verifyRoundToken(
        encryptArbitraryPayload({ attempts: [], attemptCount: 0, status: "active" }),
      ),
    ).toBeNull();
    expect(
      verifyRoundToken(
        encryptArbitraryPayload({
          target: "not-an-object",
          attempts: [],
          attemptCount: 0,
          status: "active",
        }),
      ),
    ).toBeNull();
  });

  it("returns null when target.id or target.name is not a string", () => {
    expect(
      verifyRoundToken(
        encryptArbitraryPayload({
          target: { id: 123, name: "Erling Haaland" },
          attempts: [],
          attemptCount: 0,
          status: "active",
        }),
      ),
    ).toBeNull();
    expect(
      verifyRoundToken(
        encryptArbitraryPayload({
          target: { id: "target-1" },
          attempts: [],
          attemptCount: 0,
          status: "active",
        }),
      ),
    ).toBeNull();
  });

  it("returns null when attempts is not an array", () => {
    expect(
      verifyRoundToken(
        encryptArbitraryPayload({
          target: { id: "target-1", name: "Erling Haaland" },
          attempts: "not-an-array",
          attemptCount: 0,
          status: "active",
        }),
      ),
    ).toBeNull();
  });

  it("returns null when attemptCount is not a number", () => {
    expect(
      verifyRoundToken(
        encryptArbitraryPayload({
          target: { id: "target-1", name: "Erling Haaland" },
          attempts: [],
          attemptCount: "zero",
          status: "active",
        }),
      ),
    ).toBeNull();
  });

  it("returns null when status is missing or not one of active/won/lost", () => {
    expect(
      verifyRoundToken(
        encryptArbitraryPayload({
          target: { id: "target-1", name: "Erling Haaland" },
          attempts: [],
          attemptCount: 0,
        }),
      ),
    ).toBeNull();
    expect(
      verifyRoundToken(
        encryptArbitraryPayload({
          target: { id: "target-1", name: "Erling Haaland" },
          attempts: [],
          attemptCount: 0,
          status: "draw",
        }),
      ),
    ).toBeNull();
  });
});

describe("ROUND_TOKEN_SECRET — missing/empty throws a descriptive error", () => {
  it("signRoundToken throws when ROUND_TOKEN_SECRET is unset", () => {
    delete process.env.ROUND_TOKEN_SECRET;
    const round = createInitialRoundState(TARGET);

    expect(() => signRoundToken(round)).toThrowError(/ROUND_TOKEN_SECRET is not set/);
  });

  it("signRoundToken throws when ROUND_TOKEN_SECRET is an empty string", () => {
    process.env.ROUND_TOKEN_SECRET = "";
    const round = createInitialRoundState(TARGET);

    expect(() => signRoundToken(round)).toThrowError(/ROUND_TOKEN_SECRET is not set/);
  });

  it("verifyRoundToken throws when ROUND_TOKEN_SECRET is unset", () => {
    const round = createInitialRoundState(TARGET);
    const token = signRoundToken(round);

    delete process.env.ROUND_TOKEN_SECRET;

    expect(() => verifyRoundToken(token)).toThrowError(/ROUND_TOKEN_SECRET is not set/);
  });

  it("thrown error never includes the secret value itself", () => {
    process.env.ROUND_TOKEN_SECRET = "";
    const round = createInitialRoundState(TARGET);

    try {
      signRoundToken(round);
      expect.fail("expected signRoundToken to throw");
    } catch (err) {
      expect((err as Error).message).not.toContain("test-secret-do-not-use-in-production");
    }
  });
});
