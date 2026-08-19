/**
 * Stateless, signed-and-encrypted round-state token — SPEC-GAME-CORE-001 §F
 * M9.
 *
 * This SPEC has no auth/session/score-persistence mechanism (spec.md §D,
 * plan.md §D), so round state (the target player, the guesses made so far,
 * the attempt count, and the round's status) cannot be kept server-side
 * across requests via a session. Instead, the M9 API routes carry the
 * entire {@link RoundState} to and from the client inside an opaque token
 * this module produces and consumes — the client echoes the token back on
 * every guess submission, and the server never needs to remember anything
 * between requests.
 *
 * **Confidentiality decision (Constraint Deviation, D1):** a token that is
 * merely *signed* (HMAC over a base64-encoded plaintext payload) is
 * trivially decodable by anyone who inspects it in devtools — base64 is an
 * encoding, not encryption. Since the payload is the full {@link RoundState},
 * including the target `Player` object (name, club, nationality, age,
 * squadNumber), a sign-only token would let any technically-inclined user
 * read the answer directly out of the token string, which defeats
 * REQ-GUESS-005's no-identity-leak invariant just as thoroughly as leaking
 * it in a JSON response body would. This module therefore uses
 * **AES-256-GCM** (Node's built-in `crypto.createCipheriv`/`createDecipheriv`,
 * still stdlib, no new dependency) instead of a bare HMAC: GCM is an
 * authenticated-encryption mode, so its built-in authentication tag already
 * provides the same tamper-detection an outer HMAC would add — layering a
 * second, separate HMAC on top would be redundant. This substitutes for the
 * literal `createHmac`-only suggestion in the milestone brief; the
 * `sign`/`verify` naming and never-throw-on-verify contract are unchanged.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { RoundState, RoundStatus } from "@/types/comparison";

const ALGORITHM = "aes-256-gcm";
/** Recommended IV length for AES-GCM (96 bits). */
const IV_LENGTH = 12;

const VALID_ROUND_STATUSES: readonly RoundStatus[] = ["active", "won", "lost"];

/**
 * Reads `ROUND_TOKEN_SECRET` and normalizes it into a 32-byte AES-256 key
 * via SHA-256 (so the env var may be any non-empty string, not only an
 * exact-length hex value — the `.env.local.example` comment recommends
 * `openssl rand -hex 32`, but this derivation works for any secret shape).
 * Throws a descriptive, secret-free error when unset — mirrors
 * `lib/supabase/client.ts`'s per-function error-message style.
 */
function getRoundTokenKey(fnName: string): Buffer {
  const secret = process.env.ROUND_TOKEN_SECRET;
  if (!secret) {
    throw new Error(`${fnName}: ROUND_TOKEN_SECRET is not set. See .env.local.example.`);
  }
  return createHash("sha256").update(secret).digest();
}

/**
 * Defensive runtime shape guard applied to a decrypted-and-parsed payload
 * before it is trusted as a {@link RoundState} — protects against a
 * malformed-but-successfully-decrypted payload (e.g. a token signed by a
 * different, incompatible version of this module) reaching a caller as if
 * it were a valid round.
 */
function isRoundStateShape(value: unknown): value is RoundState {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;

  if (!candidate.target || typeof candidate.target !== "object") {
    return false;
  }
  const target = candidate.target as Record<string, unknown>;
  if (typeof target.id !== "string" || typeof target.name !== "string") {
    return false;
  }

  if (!Array.isArray(candidate.attempts)) {
    return false;
  }
  if (typeof candidate.attemptCount !== "number") {
    return false;
  }
  if (
    typeof candidate.status !== "string" ||
    !VALID_ROUND_STATUSES.includes(candidate.status as RoundStatus)
  ) {
    return false;
  }

  return true;
}

/**
 * Signs and encrypts `round` into an opaque token string — three
 * base64url segments (`iv.ciphertext.authTag`) joined by `.`. Throws when
 * `ROUND_TOKEN_SECRET` is unset (see {@link getRoundTokenKey}).
 */
export function signRoundToken(round: RoundState): string {
  const key = getRoundTokenKey("signRoundToken");
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(round), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    authTag.toString("base64url"),
  ].join(".");
}

/**
 * Verifies and decrypts `token` back into a {@link RoundState}. Returns
 * `null` — never throws — on any malformed, tampered, or otherwise
 * unparseable token (wrong segment count, invalid base64url, a failed
 * AES-GCM authentication tag check, invalid JSON, or a payload that does
 * not match the expected round-state shape).
 *
 * A missing/empty `ROUND_TOKEN_SECRET` is a distinct, deployment-
 * configuration error class — it throws (via {@link getRoundTokenKey}),
 * consistent with {@link signRoundToken} and `lib/supabase/client.ts`'s
 * convention, rather than degrading to `null` alongside a merely-malformed
 * token.
 */
export function verifyRoundToken(token: string): RoundState | null {
  const key = getRoundTokenKey("verifyRoundToken");

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [ivPart, ciphertextPart, authTagPart] = parts;

  try {
    const iv = Buffer.from(ivPart, "base64url");
    const ciphertext = Buffer.from(ciphertextPart, "base64url");
    const authTag = Buffer.from(authTagPart, "base64url");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    const parsed: unknown = JSON.parse(plaintext.toString("utf8"));
    if (!isRoundStateShape(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
