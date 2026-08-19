# guess-the-player

A Wordle/Poeltl-style Premier League attribute-comparison guessing game, modeled
on ["Who Are Ya?"](https://playfootball.games/who-are-ya/premier-league/) —
with one key difference: every player is searchable and displayed using the
Korean media-convention name (e.g. "손흥민", "홀란드"), not only the
romanized/original-language name.

Each round, a target player is selected at random from the Premier League
2026/27 season pool. You search for and select a candidate player (no
free-text guessing), and each guess is compared against the target across
five attributes: **nationality, club, position, age, and squad number**.
Nationality/club/position show a correct/incorrect match; age/squad number
additionally show a higher/lower arrow when they don't match. You have up to
**8 guesses** per round — a correct guess wins immediately, and an 8th miss
ends the round and reveals the target.

No login, no daily limit — start a new round any time.

## Tech stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript (strict)
- [Tailwind CSS](https://tailwindcss.com/) v4
- [Supabase](https://supabase.com/) (Postgres) — runtime source of truth for
  player data and Korean name mappings
- [football-data.org](https://www.football-data.org/) — external player-data
  provider, accessed only by the periodic sync job (never by live gameplay)
- [Vitest](https://vitest.dev/) — unit/integration testing

## Getting started

### Prerequisites

- Node.js (LTS)
- A [Supabase](https://supabase.com/) project (Postgres database)
- A [football-data.org](https://www.football-data.org/) API key (free tier)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in real values:

```bash
cp .env.local.example .env.local
```

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Public/anon key — read-only, subject to Row Level Security |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role secret — bypasses RLS; used only by the player-data sync job. Never expose this client-side. |
| `FOOTBALL_DATA_API_KEY` | football-data.org API key — used only by the periodic sync job |
| `ROUND_TOKEN_SECRET` | Signs/encrypts the client-held round-state token (AES-256-GCM). Generate with `openssl rand -hex 32`. |

Run the Supabase migrations under `supabase/migrations/` against your project
before proceeding (via the Supabase SQL editor or CLI).

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data maintenance

The player pool is Premier League, 2026/27 season only. Three of the five
compared attributes (nationality, club, age) plus position and name come from
football-data.org via a periodic sync job; **Korean name** and **squad
number** are manually maintained, since football-data.org's free tier does
not provide either.

Only players with **both** a Korean name mapping and a registered squad
number are eligible to be selected as a round's target, so keeping these two
fields populated is an ongoing maintenance task.

### Sync player data from football-data.org

Run periodically (e.g. weekly) to refresh nationality, club, position, and
age for the current season pool:

```bash
npm run sync:players
```

### Seed Korean name mappings (one-time bootstrap)

Populates the initial Korean name mapping table from the bundled seed
dataset. Run once, on first deployment against an empty Supabase project:

```bash
npm run seed:korean-names
```

### Maintain squad numbers (id-keyed manual entry)

Squad numbers are never touched by the sync job (so a manual value is never
overwritten). Update one or more players by id:

```bash
npm run update:squad-number -- --id=<playerId> --number=<squadNumber>
```

### Combined CSV review workflow (recommended for ongoing maintenance)

The most convenient way to extend coverage of both manually-maintained
columns (Korean name + squad number) together, spreadsheet-style:

```bash
# 1. Export the current player pool to a CSV
npm run export:players-review
# -> data/player-review-export.csv
#    columns: id, name, nationality, club, age, koreanName, squadNumber

# 2. Edit the CSV in Excel / Google Sheets / Numbers — fill in
#    koreanName and/or squadNumber for rows you want to update.
#    Leave a cell blank to skip it (blank cells never overwrite an
#    existing stored value).

# 3. Import your edits back
npm run import:players-review
```

## Testing

```bash
npm test              # run the full test suite once
npm run test:watch    # watch mode
npm run test:coverage # run with coverage report
```

## Project structure

See `.moai/project/structure.md` and `.moai/project/tech.md` for the full
module layout and technical rationale. Key directories:

- `app/` — Next.js App Router pages and API routes (`app/api/`)
- `components/` — React UI components (`GameBoard`, `ComparisonTable`, etc.)
- `lib/` — domain logic (game engine, player search, Korean name mapping,
  player-data sync, squad-number maintenance, combined CSV review workflow)
- `types/` — shared TypeScript domain types
- `tests/` — unit and integration tests
- `supabase/migrations/` — Supabase (Postgres) schema migrations
- `.moai/specs/SPEC-GAME-CORE-001/` — the SPEC this game was built from
