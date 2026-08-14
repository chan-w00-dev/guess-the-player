/**
 * Korean name mapping resolution — SPEC-GAME-CORE-001 §F M5.
 *
 * Resolves a player's original-language name to its Korean media-convention
 * display name using the Supabase `korean_name_mappings` table as the
 * runtime source of truth (REQ-KOREAN-001). When no mapping row exists for
 * the given name — or the lookup itself errors — falls back to the
 * original-language name unchanged and never throws (REQ-KOREAN-003): a
 * missing mapping is an expected, non-error state (e.g. a newly-synced
 * player not yet covered by the seed dataset), not a failure that should
 * fail the round.
 *
 * This module never reads the bundled seed dataset file directly
 * (REQ-KOREAN-005 requires Supabase to be the sole runtime source after the
 * one-time seed has run) — see `scripts/seed-korean-names.ts` and
 * `lib/korean-name-mapping/seed.ts` for the seed-side write path.
 */

import type { MapperSupabaseLike } from "./types";

export interface ResolveKoreanNameOptions {
  supabase: MapperSupabaseLike;
}

/**
 * Resolves `originalName` to its Korean-mapped display name, or returns
 * `originalName` unchanged when no mapping exists or the lookup errors
 * (REQ-KOREAN-003 — a lookup failure must never fail the round).
 *
 * @MX:ANCHOR: [AUTO] resolveKoreanName is the shared display-name
 * resolution entry point every user-facing name display depends on (search
 * candidates, comparison rows, round reveal — expected fan_in >= 3 once
 * M6/M8/M9 land).
 * @MX:REASON: any behavior change here (e.g. loosening the never-throw
 * fallback contract) ripples through every module that displays a player's
 * name.
 */
export async function resolveKoreanName(
  originalName: string,
  { supabase }: ResolveKoreanNameOptions,
): Promise<string> {
  const { data, error } = await supabase
    .from("korean_name_mappings")
    .select("korean_name")
    .eq("original_name", originalName)
    .maybeSingle();

  if (error || !data) {
    return originalName;
  }

  return data.korean_name;
}
