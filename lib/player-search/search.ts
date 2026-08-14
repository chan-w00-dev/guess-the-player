/**
 * Player search / autocomplete — SPEC-GAME-CORE-001 §F M6.
 *
 * Implements REQ-SEARCH-001..006: given a query string, returns matching
 * candidate players from the current Premier League 2026/27 player pool by
 * BOTH a Korean-language partial match against `korean_name_mappings.korean_name`
 * (REQ-SEARCH-002) and an original-language/romanized partial match against
 * `players.name` (REQ-SEARCH-003, regression-preserving), merged and
 * de-duplicated by player id (plan.md §D constraint 2). Every candidate
 * carries a Korean display name resolved with the same never-throw fallback
 * contract as {@link resolveKoreanName} (REQ-KOREAN-002/003) — reused
 * directly for candidates that matched only via the original-language path,
 * since a Korean-path match already carries its Korean name from that same
 * mapping-table query (no needless re-query).
 *
 * Read-only, Supabase-only (REQ-SYNC-001, REQ-SYNC-003): this module never
 * calls the external football data provider directly — it reads exclusively
 * via the injected Supabase client. Never throws and never returns
 * `null`/`undefined`: an unmatched query, or a lookup error on either
 * underlying table, degrades to an empty (or partial) result instead of
 * failing (REQ-SEARCH-005).
 */

import { resolveKoreanName } from "@/lib/korean-name-mapping/mapper";
import type { MapperSupabaseLike, MapperTableClient } from "@/lib/korean-name-mapping/types";
import { isPosition } from "@/types/player";
import type { PlayerSearchCandidate, PlayerSearchRow, PlayerSearchSupabaseLike } from "./types";

export interface SearchPlayersOptions {
  supabase: PlayerSearchSupabaseLike;
}

/**
 * Escapes literal `%`, `_`, and `\` characters in `raw` so a user-typed
 * wildcard character is treated as a literal character rather than a SQL
 * `ilike` wildcard once wrapped into a pattern. The query string crosses a
 * trust boundary into a SQL pattern (plan.md §D constraint 4) — escaping the
 * backslash itself (not only `%`/`_`) is required for correctness: an
 * unescaped user backslash immediately before an escaped wildcard would
 * otherwise pair with the escaping backslash this function inserts and
 * silently un-escape it.
 */
function escapeLikePattern(raw: string): string {
  return raw.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function toIlikePattern(query: string): string {
  return `%${escapeLikePattern(query)}%`;
}

/**
 * Bridges this module's narrow `korean_name_mappings` surface onto
 * {@link resolveKoreanName}'s expected `MapperSupabaseLike` surface, so the
 * same injected client serves both this module's own `ilike` query and the
 * reused single-row lookup. Safe because, in production, the real Supabase
 * client's query builder supports both `.ilike()` and `.eq().maybeSingle()`
 * on the same table handle; test fakes provide both explicitly.
 */
function toMapperSupabaseLike(supabase: PlayerSearchSupabaseLike): MapperSupabaseLike {
  return {
    from(table: "korean_name_mappings") {
      return supabase.from(table) as unknown as MapperTableClient;
    },
  };
}

/**
 * Builds a {@link PlayerSearchCandidate} from a raw players-table row, or
 * `null` when the row's synced `position` fails the canonical FW/MF/DF/GK
 * guard (defensive — the `players` table's CHECK constraint already
 * enforces this at write time; this guard exists so a candidate is never
 * shaped from unvalidated data).
 */
function toCandidate(row: PlayerSearchRow, koreanName: string): PlayerSearchCandidate | null {
  if (!isPosition(row.position)) {
    return null;
  }
  return {
    id: String(row.id),
    originalName: row.name,
    koreanName,
    club: row.club,
    position: row.position,
  };
}

/**
 * Returns matching candidate players for `query` (REQ-SEARCH-001). Never
 * throws and never returns `null`/`undefined` — an unmatched query, or a
 * lookup error on either underlying table, degrades to an empty (or
 * partial) result (REQ-SEARCH-005).
 *
 * @MX:ANCHOR: [AUTO] searchPlayers is the sole entry point the guess
 * submission flow (M8) and the search/autocomplete UI (M10) will depend on
 * to resolve a user query to selectable candidates (expected fan_in >= 3
 * once M8/M9/M10 land).
 * @MX:REASON: every candidate the guess submission flow accepts must
 * originate from this function's result set (REQ-SEARCH-004) — changing its
 * merge/de-dup or fallback behavior ripples into guess validation.
 */
export async function searchPlayers(
  query: string,
  { supabase }: SearchPlayersOptions,
): Promise<PlayerSearchCandidate[]> {
  const pattern = toIlikePattern(query);
  const candidates: PlayerSearchCandidate[] = [];
  const seenIds = new Set<string>();

  // Korean-language partial match (REQ-SEARCH-002): korean_name_mappings →
  // original_name → the corresponding players row.
  const { data: mappingRows, error: mappingError } = await supabase
    .from("korean_name_mappings")
    .select("original_name,korean_name")
    .ilike("korean_name", pattern);

  if (!mappingError && mappingRows && mappingRows.length > 0) {
    const koreanNameByOriginal = new Map(
      mappingRows.map((row) => [row.original_name, row.korean_name]),
    );
    const originalNames = [...koreanNameByOriginal.keys()];

    const { data: matchedPlayers, error: playersError } = await supabase
      .from("players")
      .select("id,name,club,position")
      .in("name", originalNames);

    if (!playersError && matchedPlayers) {
      for (const row of matchedPlayers) {
        const koreanName = koreanNameByOriginal.get(row.name);
        if (!koreanName) {
          continue;
        }
        const candidate = toCandidate(row, koreanName);
        if (candidate && !seenIds.has(candidate.id)) {
          seenIds.add(candidate.id);
          candidates.push(candidate);
        }
      }
    }
  }

  // Original-language / romanized partial match (REQ-SEARCH-003,
  // regression-preserving).
  const { data: originalRows, error: originalError } = await supabase
    .from("players")
    .select("id,name,club,position")
    .ilike("name", pattern);

  if (!originalError && originalRows) {
    const mapperSupabase = toMapperSupabaseLike(supabase);
    const resolved = await Promise.all(
      originalRows.map(async (row) => {
        const id = String(row.id);
        if (seenIds.has(id)) {
          // Already resolved via the Korean-match path above — its Korean
          // name is already known; do not needlessly re-query.
          return null;
        }
        const koreanName = await resolveKoreanName(row.name, { supabase: mapperSupabase });
        return toCandidate(row, koreanName);
      }),
    );

    for (const candidate of resolved) {
      if (candidate && !seenIds.has(candidate.id)) {
        seenIds.add(candidate.id);
        candidates.push(candidate);
      }
    }
  }

  return candidates;
}
