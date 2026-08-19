/**
 * Nationality -> Unicode flag lookup — SPEC-GAME-CORE-001 §F M13.
 *
 * Implements REQ-COMPARE-010: a static, 69-entry mapping from nationality
 * string (as stored in `players.nationality`) to a ground-truthed ISO 3166-1
 * alpha-2 code, with four special-case tokens for the four UK home nations —
 * England / Scotland / Wales map to their own Unicode regional-subdivision
 * flag (a Unicode tag-sequence flag, not a plain 2-letter regional-indicator
 * flag), and Northern Ireland falls back to the plain United Kingdom flag
 * (recorded, user-confirmed exception — Northern Ireland has no official
 * Unicode subdivision flag; it must NOT render the England flag and must NOT
 * render a text country code).
 *
 * Flag rendering is computed programmatically from the two documented
 * Unicode algorithms rather than hardcoded per-nationality, except the three
 * home-nation tag sequences (England/Scotland/Wales), which cannot be
 * derived from the plain regional-indicator algorithm and are built from the
 * same tag-character formula instead of being typed as literal glyphs.
 *
 * @MX:ANCHOR: [AUTO] getNationalityFlag is the sole entry point
 * `components/ComparisonTable.tsx`'s nationality-attribute cell rendering
 * depends on to resolve a guessed player's nationality to a flag (expected
 * fan_in >= 3 once other display surfaces reuse it).
 * @MX:REASON: every nationality flag rendered anywhere in the UI must
 * resolve through this function's fallback contract (REQ-COMPARE-012) —
 * never throw, and the England/Scotland/Wales/Northern-Ireland special
 * cases must never silently regress to the wrong flag.
 */

/** Nationality string (exact `players.nationality` column value) -> ISO 3166-1 alpha-2 code, or one of the 4 special GB-* tokens for the UK home nations. */
const NATIONALITY_TO_ISO: Record<string, string> = {
  Albania: "AL",
  Algeria: "DZ",
  Argentina: "AR",
  Australia: "AU",
  Austria: "AT",
  Belgium: "BE",
  "Bosnia-Herzegovina": "BA",
  Brazil: "BR",
  Bulgaria: "BG",
  "Burkina Faso": "BF",
  Cameroon: "CM",
  Canada: "CA",
  Chile: "CL",
  Colombia: "CO",
  "Congo DR": "CD",
  Croatia: "HR",
  "Czech Republic": "CZ",
  Denmark: "DK",
  Ecuador: "EC",
  Egypt: "EG",
  England: "GB-ENG",
  France: "FR",
  Gambia: "GM",
  Georgia: "GE",
  Germany: "DE",
  Ghana: "GH",
  Greece: "GR",
  "Guinea-Bissau": "GW",
  Haiti: "HT",
  Hungary: "HU",
  Iceland: "IS",
  Indonesia: "ID",
  Iraq: "IQ",
  Ireland: "IE",
  Israel: "IL",
  Italy: "IT",
  "Ivory Coast": "CI",
  Jamaica: "JM",
  Japan: "JP",
  Luxembourg: "LU",
  Mali: "ML",
  Morocco: "MA",
  Mozambique: "MZ",
  Netherlands: "NL",
  "New Zealand": "NZ",
  Nigeria: "NG",
  "Northern Ireland": "GB",
  Norway: "NO",
  Paraguay: "PY",
  Poland: "PL",
  Portugal: "PT",
  Scotland: "GB-SCT",
  Senegal: "SN",
  Serbia: "RS",
  "Sierra Leone": "SL",
  Slovakia: "SK",
  Slovenia: "SI",
  "South Korea": "KR",
  Spain: "ES",
  Suriname: "SR",
  Sweden: "SE",
  Switzerland: "CH",
  "Trinidad & Tobago": "TT",
  Turkey: "TR",
  USA: "US",
  Ukraine: "UA",
  Uruguay: "UY",
  Uzbekistan: "UZ",
  Wales: "GB-WLS",
};

const REGIONAL_INDICATOR_BASE = 0x1f1e6;
const ASCII_A = "A".charCodeAt(0);

/**
 * Computes a plain 2-letter ISO-code flag emoji from its two Unicode
 * Regional Indicator Symbols — never a hardcoded per-code literal.
 */
function regionalIndicatorFlag(iso2: string): string {
  return [...iso2.toUpperCase()]
    .map((letter) => String.fromCodePoint(REGIONAL_INDICATOR_BASE + (letter.charCodeAt(0) - ASCII_A)))
    .join("");
}

const BLACK_FLAG = "\u{1F3F4}";
const TAG_CANCEL = "\u{E007F}";
const TAG_BASE = 0xe0000;

/**
 * Computes a Unicode subdivision (tag-sequence) flag: U+1F3F4 (black flag)
 * followed by one Unicode tag character per lowercase ASCII letter of
 * `subdivisionCode` (tag char = U+E0000 + ASCII code point), terminated by
 * the cancel tag U+E007F. Used for the England/Scotland/Wales special cases,
 * which have no plain 2-letter ISO code to derive a regional-indicator flag
 * from.
 */
function tagSequenceFlag(subdivisionCode: string): string {
  const tags = [...subdivisionCode.toLowerCase()]
    .map((char) => String.fromCodePoint(TAG_BASE + char.charCodeAt(0)))
    .join("");
  return `${BLACK_FLAG}${tags}${TAG_CANCEL}`;
}

const ENGLAND_FLAG = tagSequenceFlag("gbeng");
const SCOTLAND_FLAG = tagSequenceFlag("gbsct");
const WALES_FLAG = tagSequenceFlag("gbwls");

/**
 * Resolves a nationality string to its Unicode flag. Returns `null` — never
 * throws — for `null` input or any nationality string absent from the
 * static mapping (REQ-COMPARE-012 fallback).
 */
export function getNationalityFlag(nationality: string | null): string | null {
  if (nationality === null) {
    return null;
  }

  const code = NATIONALITY_TO_ISO[nationality];
  if (!code) {
    return null;
  }

  switch (code) {
    case "GB-ENG":
      return ENGLAND_FLAG;
    case "GB-SCT":
      return SCOTLAND_FLAG;
    case "GB-WLS":
      return WALES_FLAG;
    default:
      // Includes the plain "GB" code (Northern Ireland's recorded fallback
      // exception) — computed identically to any other 2-letter ISO code.
      return regionalIndicatorFlag(code);
  }
}
