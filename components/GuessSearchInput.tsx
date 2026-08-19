"use client";

/**
 * Guess search / autocomplete input — SPEC-GAME-CORE-001 §F M10.
 *
 * Debounced against `GET /api/player/search?q=` as the user types (REQ-
 * SEARCH-001..003), renders a candidate dropdown (Korean + original-language
 * name, club), and resolves every guess to a selected candidate rather than
 * free text (REQ-SEARCH-004) via the `onSelect` callback. Clears itself after
 * a selection.
 */

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { PlayerSearchCandidate } from "@/lib/player-search/types";

/** Debounce window between the last keystroke and the search request. */
const DEBOUNCE_MS = 250;

export interface GuessSearchInputProps {
  onSelect: (candidate: PlayerSearchCandidate) => void;
  /** Disable while a round has ended or a guess submission is in flight. */
  disabled?: boolean;
}

export default function GuessSearchInput({ onSelect, disabled = false }: GuessSearchInputProps) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<PlayerSearchCandidate[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Discards a stale in-flight response if a newer query has since started.
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  async function runSearch(term: string) {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/player/search?q=${encodeURIComponent(term)}`);
      if (!response.ok) {
        return;
      }
      const data: PlayerSearchCandidate[] = await response.json();
      if (requestId !== requestIdRef.current) {
        return;
      }
      setCandidates(data);
      setIsOpen(true);
    } catch {
      // Network failure — leave prior candidates in place, no crash.
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setCandidates([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      void runSearch(trimmed);
    }, DEBOUNCE_MS);
  }

  function handleSelect(candidate: PlayerSearchCandidate) {
    onSelect(candidate);
    setQuery("");
    setCandidates([]);
    setIsOpen(false);
  }

  const showDropdown = isOpen && !disabled;

  return (
    <div className="relative w-full max-w-md">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        disabled={disabled}
        placeholder="Search a player (Korean or original name)..."
        aria-label="Guess a player"
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />

      {showDropdown && candidates.length > 0 && (
        <ul
          data-testid="search-candidates"
          className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {candidates.map((candidate) => (
            <li key={candidate.id}>
              <button
                type="button"
                onClick={() => handleSelect(candidate)}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <span className="font-medium">{candidate.koreanName}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {candidate.originalName}
                  {candidate.club ? ` · ${candidate.club}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showDropdown && !isLoading && candidates.length === 0 && query.trim().length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          No matches
        </div>
      )}
    </div>
  );
}
