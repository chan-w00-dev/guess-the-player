/**
 * `POST /api/guess` — guess submission (REQ-GUESS-001..007, REQ-SEARCH-004,
 * REQ-NFR-005). SPEC-GAME-CORE-001 §F M9.
 *
 * Body: `{ roundToken: string, playerId: string }`. `roundToken` carries the
 * entire server-side round state (see `lib/game/round-token.ts`'s
 * confidentiality note); `playerId` MUST be an id resolvable via the
 * `/api/player/search` pool (REQ-SEARCH-004) — this route never accepts a
 * free-text guess.
 *
 * Response-body leak discipline (REQ-GUESS-005): only `outcome.result` (the
 * M8 `GuessResult`) is ever serialized on a successful submission — the raw
 * `outcome.round` (which carries the full target `Player`) is re-signed
 * into a fresh opaque token via `signRoundToken`, never serialized directly.
 *
 * Supabase-anon-key-only (REQ-SYNC-001/003): never imports the football data
 * provider client module.
 */

import { NextResponse } from "next/server";
import { getPlayerById } from "@/lib/game/player-lookup";
import { createPlayerLookupSupabaseClient } from "@/lib/game/supabase-adapter";
import { resolveKoreanName } from "@/lib/korean-name-mapping/mapper";
import { createMapperSupabaseClient } from "@/lib/korean-name-mapping/supabase-adapter";
import { submitGuess, type ResolveIdentityResult } from "@/lib/game/guess-service";
import { signRoundToken, verifyRoundToken } from "@/lib/game/round-token";

interface GuessRequestBody {
  roundToken: string;
  playerId: string;
}

function parseRequestBody(body: unknown): GuessRequestBody | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const candidate = body as Record<string, unknown>;
  if (typeof candidate.roundToken !== "string" || typeof candidate.playerId !== "string") {
    return null;
  }
  return { roundToken: candidate.roundToken, playerId: candidate.playerId };
}

export async function POST(request: Request): Promise<NextResponse> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ status: "invalid-request" }, { status: 400 });
  }

  const parsedBody = parseRequestBody(rawBody);
  if (!parsedBody) {
    return NextResponse.json({ status: "invalid-request" }, { status: 400 });
  }

  const round = verifyRoundToken(parsedBody.roundToken);
  if (!round) {
    // Invalid, tampered, or otherwise unverifiable token — no further
    // detail (per round-token.ts's never-throw/no-detail contract).
    return NextResponse.json({ status: "invalid-round" }, { status: 400 });
  }

  const guess = await getPlayerById({
    supabase: createPlayerLookupSupabaseClient(),
    id: parsedBody.playerId,
  });
  if (!guess) {
    // REQ-SEARCH-004: only an id resolvable in the current pool is
    // accepted — this rejects both a nonexistent id and any attempt to
    // bypass search-based resolution with an arbitrary string.
    return NextResponse.json({ status: "invalid-player" }, { status: 400 });
  }

  // Defensive try/catch around the M5 collaborator (REQ-NFR-005): today
  // `resolveKoreanName` already never throws/rejects (see the M8
  // completion-report residual-risk note this wrapper documents below), but
  // this route wraps it anyway so a future change to that contract cannot
  // silently turn into an unhandled rejection here.
  const resolveIdentity = async (originalName: string): Promise<ResolveIdentityResult> => {
    try {
      const koreanName = await resolveKoreanName(originalName, {
        supabase: createMapperSupabaseClient(),
      });
      return { status: "ok", koreanName };
    } catch {
      return { status: "error" };
    }
  };

  const outcome = await submitGuess({ round, guess, resolveIdentity });

  if (outcome.status === "ok") {
    // Serialize the freshly-signed token from the UPDATED round + only the
    // client-facing `result` — never the raw `outcome.round` object (see
    // the module doc comment above).
    const roundToken = signRoundToken(outcome.round);
    return NextResponse.json({ roundToken, result: outcome.result });
  }

  if (outcome.status === "rejected") {
    return NextResponse.json({ status: "rejected", reason: outcome.reason }, { status: 409 });
  }

  // outcome.status === "retryable-error" (REQ-NFR-005).
  return NextResponse.json({ status: "retryable-error" }, { status: 503 });
}
