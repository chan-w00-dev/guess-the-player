/**
 * `GET /api/player/search?q=` — autocomplete (REQ-SEARCH-001..003).
 * SPEC-GAME-CORE-001 §F M9.
 *
 * Returns the candidate array as-is — it is the searchable pool, not
 * target-identifying (safe to expose in full, unlike the round-random and
 * guess routes). Supabase-anon-key-only (REQ-SYNC-001/003): never imports
 * the football data provider client module.
 */

import { NextResponse } from "next/server";
import { createSearchSupabaseClient } from "@/lib/player-search/supabase-adapter";
import { searchPlayers } from "@/lib/player-search/search";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");

  // REQ-SEARCH-005 spirit: an empty/missing query is not an error — it
  // simply has no candidates yet.
  if (!q || q.trim().length === 0) {
    return NextResponse.json([]);
  }

  const candidates = await searchPlayers(q, { supabase: createSearchSupabaseClient() });
  return NextResponse.json(candidates);
}
