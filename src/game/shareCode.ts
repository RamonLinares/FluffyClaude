// Short, human-typeable "travel codes" that encode which planet a player has
// reached. Because planet N is identical on every device (fixed WORLD_SEED),
// the code only needs to carry the planet index + a checksum to catch typos.

// Crockford-style base32 — no I, L, O, U to avoid confusion when typing.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function checksumChar(body: string): string {
  const w = [7, 11, 13, 17, 19, 23];
  let sum = 5;
  for (let i = 0; i < body.length; i++) {
    sum += ALPHABET.indexOf(body[i]) * w[i % w.length];
  }
  return ALPHABET[sum % 32];
}

/** Encode a planet index into a 5-character travel code (e.g. "7K2QF"). */
export function encodeTravelCode(planetIndex: number): string {
  let v = (planetIndex + 1) >>> 0; // shift so planet 0 isn't all-zeros
  let body = "";
  for (let i = 0; i < 4; i++) {
    body = ALPHABET[v & 31] + body;
    v = Math.floor(v / 32);
  }
  return body + checksumChar(body);
}

/** Pretty grouping for display, e.g. "7K2-QF". */
export function formatTravelCode(code: string): string {
  return code.length === 5 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

function sanitize(input: string): string {
  return input
    .toUpperCase()
    .replace(/[ILО]/g, (m) => (m === "I" || m === "L" ? "1" : "0"))
    .replace(/O/g, "0")
    .replace(/U/g, "V")
    .split("")
    .filter((c) => ALPHABET.includes(c))
    .join("");
}

/** Decode a travel code back to a planet index, or null if invalid. */
export function decodeTravelCode(input: string): number | null {
  const clean = sanitize(input);
  if (clean.length !== 5) return null;
  const body = clean.slice(0, 4);
  const check = clean[4];
  if (checksumChar(body) !== check) return null;
  let v = 0;
  for (let i = 0; i < 4; i++) v = v * 32 + ALPHABET.indexOf(body[i]);
  const index = v - 1;
  return index >= 0 ? index : null;
}
