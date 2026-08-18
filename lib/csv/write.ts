/**
 * RFC4180-lite CSV writer — SPEC-GAME-CORE-001 §F M12.
 *
 * Counterpart to {@link parseCsv} (`lib/csv/parse.ts`) — see that module's
 * doc comment for the scope rationale (no new npm dependency, quoted-field
 * handling only, not a full RFC4180 implementation).
 */

/** A field is quoted on write only when it contains a comma, a double-quote, or a newline. */
function needsQuoting(field: string): boolean {
  return field.includes(",") || field.includes('"') || field.includes("\n") || field.includes("\r");
}

function quoteField(field: string): string {
  if (!needsQuoting(field)) {
    return field;
  }
  return `"${field.replace(/"/g, '""')}"`;
}

/**
 * Writes `rows` (a matrix of string cells) to CSV text, quoting a field
 * only when {@link needsQuoting} requires it and doubling any internal
 * double-quote. Rows are joined with `\n`; no trailing newline is appended
 * — see {@link parseCsv}'s doc comment for why this makes the two functions
 * round-trip.
 */
export function writeCsv(rows: string[][]): string {
  return rows.map((row) => row.map(quoteField).join(",")).join("\n");
}
