# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-08-19

### Added

- **Core guess-comparison game loop** (SPEC-GAME-CORE-001): a Wordle/Poeltl-style
  attribute-comparison guessing game for Premier League 2026/27 season players.
  Each round selects a random target player (with duplicate-avoidance against
  the previous round) and the user submits up to 8 guesses, each compared
  against the target across 5 attributes: nationality, club, position, age,
  and squad number. Categorical attributes (nationality/club/position) return
  a correct/incorrect match; numeric attributes (age/squad number) additionally
  return a higher/lower directional indicator on mismatch. A correct guess
  ends the round immediately as a win; an 8th incorrect guess ends the round
  as a loss and reveals the target's identity.
- **Korean-language player-name search and mapping**: every player is
  searchable and displayed using the Korean media-convention name (e.g.
  "손흥민", "홀란드"), resolved via a Supabase-backed Korean name mapping
  table, with a graceful fallback to the original-language name when no
  mapping exists. Search/autocomplete accepts both Korean-language and
  original-language/romanized queries, and only a selected candidate player
  can be submitted as a guess (no free-text guessing).
- **Unlimited, account-free replay**: no login, no daily play limit, no score
  persistence — start a new round immediately after any round ends.
- **Premier League 2026/27 player-data sync** from football-data.org: a
  periodic sync job (`npm run sync:players`) fetches nationality, club,
  position, and age into a Supabase `players` table, which is the sole
  runtime source of truth for live gameplay (the external provider is never
  called from a live gameplay request handler, keeping gameplay concurrency
  independent of the provider's free-tier rate limit).
- **Manually-maintained squad numbers**: since football-data.org's free tier
  does not supply shirt/squad-number data, squad numbers are populated via an
  id-keyed manual entry mechanism (`npm run update:squad-number`) that the
  periodic sync job never overwrites.
- **Combined CSV review export/import workflow**: `npm run export:players-review`
  produces a single spreadsheet-friendly CSV (`id, name, nationality, club,
  age, koreanName, squadNumber`) covering both manually-maintained columns
  together, and `npm run import:players-review` upserts non-blank Korean-name
  and squad-number cells back by id — blank cells never overwrite an existing
  stored value.
- **Player-pool eligibility filter**: only players with both a Korean name
  mapping and a registered squad number are eligible as a round's target
  player, guaranteeing every round is fully playable.
- **Next.js API routes** (`app/api/`): `GET /api/player/random` (start a
  round), `GET /api/player/search` (autocomplete), and `POST /api/guess`
  (submit a guess), backed by a signed/encrypted (AES-256-GCM) round-state
  token so no server-side session storage is required and the target
  player's identity is never leaked to the client ahead of a win/loss.
- **Game UI**: `GameBoard`, `GuessSearchInput`, `ComparisonTable`,
  `AttemptCounter`, and `ResultModal` React components wired to the API
  routes above, replacing the initial scaffold.
- **Retryable-error handling**: a Supabase outage during player selection or
  guess submission surfaces a retryable error state to the user without ever
  exposing the target player's identity.
- 385 tests (Vitest) covering all 36 acceptance criteria in
  `.moai/specs/SPEC-GAME-CORE-001/acceptance.md`, at 99%+ repository-wide
  statement/branch/function/line coverage.

[0.1.0]: https://github.com/chan-w00-dev/guess-the-player/releases/tag/v0.1.0
