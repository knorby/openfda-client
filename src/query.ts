/**
 * Minimal, dependency-free helpers for composing openFDA `search`
 * expressions.
 *
 * openFDA endpoints are backed by Elasticsearch, whose query-string syntax
 * uses `field:value` pairs joined by `AND`/`OR`/`NOT`, bracketed ranges
 * `[a TO b]`, and the `_exists_:field` predicate. Writing these strings by
 * hand is error-prone (literal terms need reserved characters escaped and
 * phrases quoted) — these helpers handle that for you. The returned strings are plain `search`-syntax
 * strings with literal spaces; {@link OpenFdaClient} URL-encodes them on
 * the way out.
 *
 * @example
 * ```ts
 * import { and, exact, field, range } from "@knorby/openfda-client";
 *
 * const search = and(
 *   exact("openfda.brand_name", "LIPITOR"),
 *   range("receivedate", { gte: "20240101", lte: "20241231" }),
 * );
 * // 'openfda.brand_name.exact:LIPITOR AND receivedate:[20240101 TO 20241231]'
 * await client.drug.event.search({ search });
 * ```
 */

/**
 * Renders a literal search term. Reserved query-string characters are escaped;
 * phrases, values containing colons, and Boolean keywords are quoted.
 */
export function term(value: string): string {
  const escaped = value.replace(/[+\-=!(){}[\]^"~*?:\\/&|<>]/g, "\\$&");
  return value === "" || /[\s:]|^(AND|OR|NOT)$/i.test(value)
    ? `"${escaped}"`
    : escaped;
}

/** Builds a `field:value` pair. */
export function field(name: string, value: string): string {
  return `${name}:${term(value)}`;
}

/** Builds an exact-match `field.exact:value` pair. */
export function exact(name: string, value: string): string {
  return `${name}.exact:${term(value)}`;
}

/**
 * Builds a range expression: `field:[gte TO lte]`. Open ends become `*`.
 * At least one bound is required.
 */
export function range(
  name: string,
  bounds: { gte?: string; lte?: string },
): string {
  const { gte, lte } = bounds;
  if (gte === undefined && lte === undefined) {
    throw new RangeError(
      `range(\`${name}\`): provide at least one of \`gte\` or \`lte\``,
    );
  }
  return `${name}:[${gte ?? "*"} TO ${lte ?? "*"}]`;
}

/** Builds an existence predicate: `_exists_:field`. */
export function exists(name: string): string {
  return `_exists_:${name}`;
}

/** Joins clauses with `AND`. Parenthesizes single clauses that contain `OR`. */
export function and(...clauses: string[]): string {
  if (clauses.length === 0) {
    throw new RangeError("and(): at least one clause is required");
  }
  if (clauses.length === 1) return clauses[0] as string;
  return clauses.map(groupIfCompound).join(" AND ");
}

/** Joins clauses with `OR`. Parenthesizes single clauses that contain `AND`. */
export function or(...clauses: string[]): string {
  if (clauses.length === 0) {
    throw new RangeError("or(): at least one clause is required");
  }
  if (clauses.length === 1) return clauses[0] as string;
  return clauses.map(groupIfCompound).join(" OR ");
}

/**
 * Negates a clause: `NOT <clause>`. Parenthesizes compound clauses so
 * `not(or(a, b))` renders `NOT (a OR b)` — without grouping, Elasticsearch
 * would parse `NOT a OR b` as `(NOT a) OR b`.
 */
export function not(clause: string): string {
  return `NOT ${groupIfCompound(clause)}`;
}

/**
 * Parenthesizes a clause that embeds a different binary operator, so
 * `and(or(a, b), c)` renders `(a OR b) AND c` with explicit precedence.
 */
function groupIfCompound(clause: string): string {
  return /\s(AND|OR)\s/.test(clause) ? `(${clause})` : clause;
}
