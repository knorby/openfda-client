/**
 * A single query parameter value (after arrays are expanded).
 */
type Scalar = string | number | boolean;

/**
 * A record of query parameters; values may be scalars or arrays of scalars.
 * Exported as a convenience for callers building params programmatically;
 * the serializer also accepts plain objects.
 */
export type QueryRecord = Record<string, Scalar | Scalar[] | undefined | null>;

/**
 * Builds a URL-encoded query string from a parameter record.
 *
 * - `undefined`/`null` (and empty arrays) are omitted.
 * - Array values are joined with a literal `,`.
 * - Each key and value is encoded with `encodeURIComponent`, so spaces
 *   become `%20` and quotes become `%22` — matching the encoding openFDA's
 *   own documentation shows for fielded `search` values.
 *
 * @returns The query string without the leading `?` (empty string if no
 *   params).
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    const encoded = encodeValue(value);
    if (encoded === undefined) continue;
    parts.push(`${encodeURIComponent(key)}=${encoded}`);
  }
  return parts.join("&");
}

function encodeValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) {
    if (value.length === 0) return undefined;
    return value.map((v) => encodeURIComponent(String(v))).join(",");
  }
  return encodeURIComponent(String(value));
}

/**
 * Merges a base params object with extra params (extra wins). Returns a plain
 * record safe to pass to {@link buildQueryString}. Used to fold in the API
 * key.
 *
 * The accumulator uses a null prototype so a caller-supplied `"__proto__"`
 * key (e.g. from `JSON.parse`) becomes a regular own property instead of
 * triggering the `Object.prototype.__proto__` setter and being dropped.
 */
export function mergeParams(
  base: object | undefined,
  extra: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = Object.create(null);
  if (base) Object.assign(out, base);
  Object.assign(out, extra);
  return out;
}
