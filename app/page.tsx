import GameBoard from "@/components/GameBoard";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center gap-8 p-8 sm:p-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Who Are Ya?(한글)</h1>
        <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
          Search for a Premier League player and compare attributes with each
          guess.
        </p>
      </div>
      <GameBoard />
    </main>
  );
}
