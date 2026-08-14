---
engine: postgres
orm: none (raw @supabase/supabase-js client)
last_synced_at: 2026-08-14
manifest_hash: _TBD_
---

# Database Schema

Supabase (Postgres) project. Runtime source of truth for the Premier League 2026/27 season
player pool (SPEC-GAME-CORE-001 §F M4) and, in a future milestone (M5), the Korean name
mapping table. See `.moai/project/db/migrations.md` for the applied/pending migration list.

---

## Tables

<!-- For NoSQL databases, replace this section with ## Collections -->

| Table | Description |
|-------|-------------|
| players | Premier League 2026/27 season player pool + the 5 compared attributes (nationality, club, position, age, squad number), synced by the periodic M4 sync job (`lib/player-data-sync/`) from football-data.org. Sole runtime source for player selection (M7), player search (M6), and the comparison engine (M2) — REQ-SYNC-003. |

---

## Relationships

<!-- Cardinality notation: 1:1, 1:N, N:M -->

| From | To | Cardinality | FK Column | Notes |
|------|----|-------------|-----------|-------|
| _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

<!--
Example:
| users | posts    | 1:N | posts.user_id    | A user owns many posts |
| posts | comments | 1:N | comments.post_id | A post has many comments |
| users | roles    | N:M | user_roles table | Via junction table |
-->

No cross-table relationships yet — `players` is currently the only table (M4). A future M5
Korean-name-mapping table is expected to reference `players.id`.

---

## Indexes

<!-- List standalone and composite indexes -->

| Table | Columns | Type | Purpose |
|-------|---------|------|---------|
| players | season | INDEX | Supports a future multi-season filter/history query without a table scan (single-season scope for this SPEC — spec.md §D). |

---

## Constraints

<!-- UNIQUE, CHECK, EXCLUSION, NOT NULL (non-obvious cases) -->

| Table | Constraint | Type | Definition |
|-------|-----------|------|-----------|
| players | players_pkey | PRIMARY KEY | `id` (football-data.org's numeric person id) — also the sync job's upsert conflict target |
| players | players_position_check | CHECK | `position IN ('FW', 'MF', 'DF', 'GK')` — the canonical 4-value position taxonomy (REQ-COMPARE-005); defense-in-depth, the M4 sync job already guarantees this before writing |
| players | (column-level) | NOT NULL | `name`, `position`, `season` are required on every row; all other attribute columns (`club`, `nationality`, `age`, `squad_number`, `photo_url`) are nullable to model incomplete synced data (REQ-COMPARE-007) |
