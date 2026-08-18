/**
 * RFC4180-lite CSV parser — SPEC-GAME-CORE-001 §F M12.
 *
 * Deliberately small and dependency-free: no new npm package is introduced
 * for this milestone (plan.md §F M12) since a plain field-delimited format
 * with quoted-field support is all `lib/player-review/` needs. Not a full
 * RFC4180 implementation — it covers exactly what a player/club/nationality
 * name could require: a field containing a comma, a double-quote, or a
 * newline must be wrapped in double quotes on write, with any internal
 * double-quote doubled (`""`); this parser reverses that transform.
 */

/**
 * Parses `input` into a matrix of string cells, one inner array per row.
 *
 * Row terminators are `\n` or `\r\n` (a lone `\r` is also treated as a row
 * terminator so a stray CR never leaks into a cell value outside quotes). A
 * trailing newline at end-of-input does not produce a phantom empty row —
 * this makes `parseCsv(writeCsv(rows))` round-trip to `rows` even though
 * {@link writeCsv} never appends a final trailing newline. An empty input
 * string returns an empty matrix (zero rows), not a single row with one
 * empty field.
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = input.length;

  const pushField = (): void => {
    row.push(field);
    field = "";
  };
  const pushRow = (): void => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < len) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === ",") {
      pushField();
      i += 1;
      continue;
    }

    if (char === "\r") {
      if (input[i + 1] === "\n") {
        i += 1;
      }
      pushRow();
      i += 1;
      continue;
    }

    if (char === "\n") {
      pushRow();
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  // Flush the final field/row only when there's unterminated content — a
  // trailing newline already flushed everything via pushRow() above, so
  // this branch is skipped for the common "file ends with a newline" case.
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows;
}
