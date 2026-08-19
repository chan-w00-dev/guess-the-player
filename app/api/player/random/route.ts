/**
 * `GET /api/player/random` — starts a new round (REQ-SELECT-001..005,
 * REQ-REPLAY-001..003). SPEC-GAME-CORE-001 §F M9.
 *
 * **GET, not POST (Constraint Deviation, D3.1):** this route performs no
 * server-side write of any kind — round state lives entirely in the signed
 * token returned to the client (`lib/game/round-token.ts`), there is no
 * session or database row this call mutates. That makes it a read of "a
 * random eligible player", which is GET-shaped despite being
 * non-idempotent (the pick is random); a POST would incorrectly imply a
 * server-side resource is being created.
 *
 * `excludeTargetId` (REQ-REPLAY-003 duplicate avoidance against the
 * immediately-preceding round's target) is accepted as a `?excludeTargetId=`
 * query string parameter, matching the GET-not-POST decision above.
 *
 * Supabase-anon-key-only (REQ-SYNC-001/003): never imports the football data
 * provider client module.
 */

import { NextResponse } from "next/server";
import { selectTargetPlayer } from "@/lib/game/player-selector";
import { signRoundToken } from "@/lib/game/round-token";
import { createPlayerSelectorSupabaseClient } from "@/lib/game/supabase-adapter";
import { createInitialRoundState, MAX_ATTEMPTS } from "@/types/comparison";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const excludeTargetId = url.searchParams.get("excludeTargetId") ?? null;

  const result = await selectTargetPlayer({
    supabase: createPlayerSelectorSupabaseClient(),
    excludePlayerId: excludeTargetId,
  });

  if (result.status === "empty-pool") {
    // REQ-SELECT-004: no round starts on an empty pool. Generic message —
    // no internal detail (e.g. which underlying query failed) is leaked.
    return NextResponse.json(
      { status: "empty-pool", message: "No eligible player is currently available." },
      { status: 503 },
    );
  }

  const round = createInitialRoundState(result.player);
  const roundToken = signRoundToken(round);

  // REQ-GUESS-005 spirit: never include the target player, its name, or any
  // target-identifying field in this response — only the opaque token and
  // the attempt budget.
  return NextResponse.json({ roundToken, attemptsRemaining: MAX_ATTEMPTS });
}
