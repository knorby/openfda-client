/**
 * Shared response-envelope and query-parameter types. Every openFDA endpoint
 * answers with the same `{ meta, results }` shape (see
 * https://open.fda.gov/apis/).
 */

/** `meta.results` — pagination summary accompanying record lists. */
export interface OpenFdaMetaResults {
  /** Records skipped by this query. */
  skip: number;
  /** Page size used by this query. */
  limit: number;
  /** Total records matching the query. */
  total: number;
}

/** `meta` — query metadata returned with every response. */
export interface OpenFdaMeta {
  /** openFDA's standing medical-care disclaimer. */
  disclaimer: string;
  /** Terms of service URL. */
  terms: string;
  /** Data license URL. */
  license: string;
  /** Dataset last-updated date (ISO `YYYY-MM-DD`). */
  last_updated: string;
  /** Pagination summary; present for record queries (absent for `count`). */
  results?: OpenFdaMetaResults;
}

/** A full openFDA response envelope for a record query. */
export interface OpenFdaResponse<T> {
  meta: OpenFdaMeta;
  results: T[];
}

/** A row of a `count` query result. */
export interface CountResult {
  /** The unique field value. */
  term: string;
  /** How many matching records carry this value. */
  count: number;
}

/** Parameters accepted by every openFDA record query. */
export interface SearchParams {
  /**
   * Search expression in openFDA's query syntax, e.g.
   * `openfda.brand_name:"lipitor" AND receivedate:[20240101 TO 20241231]`.
   * Omitted (or `*`) searches match every record. Build expressions with the
   * {@link query} helpers to avoid escaping mistakes.
   */
  search?: string;
  /** Sort expression, e.g. `receivedate:desc`. */
  sort?: string;
  /** Records to return (server max 1000). */
  limit?: number;
  /** Records to skip before returning (server max 25000). */
  skip?: number;
}

/** Parameters accepted by a `count` (facet) query. */
export interface CountParams {
  /** Optional search expression narrowing the counted population. */
  search?: string;
  /**
   * Field to count unique values of, suffixed with `.exact` for exact
   * matching (openFDA convention, e.g.
   * `patient.reaction.reactionmeddrapt.exact`).
   */
  count: string;
}
