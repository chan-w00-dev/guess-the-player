"use client";

/**
 * Win/loss result modal — SPEC-GAME-CORE-001 §F M10. Shown once a round
 * ends (REQ-GUESS-002/004), displaying the target's Korean-mapped name (and
 * original name) plus a "Play again" action that starts the next round.
 */

export interface ResultModalReveal {
  id: string;
  originalName: string;
  koreanName: string;
}

export interface ResultModalProps {
  status: "won" | "lost";
  reveal: ResultModalReveal;
  onPlayAgain: () => void;
}

export default function ResultModal({ status, reveal, onPlayAgain }: ResultModalProps) {
  const isWon = status === "won";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-modal-title"
      data-testid="result-modal"
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-6 text-center shadow-xl dark:bg-zinc-900">
        <h2 id="result-modal-title" className="text-xl font-semibold">
          {isWon ? "You won!" : "You lost"}
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">The player was</p>
        <p className="mt-1 text-lg font-bold" data-testid="result-modal-korean-name">
          {reveal.koreanName}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{reveal.originalName}</p>
        <button
          type="button"
          onClick={onPlayAgain}
          className="mt-6 w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Play again
        </button>
      </div>
    </div>
  );
}
