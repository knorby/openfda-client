/** Production openFDA API base URL. */
export const DEFAULT_BASE_URL = "https://api.fda.gov";

/** Default per-request timeout in milliseconds. */
export const DEFAULT_TIMEOUT_MS = 30_000;

/** Largest `limit` the API allows. */
export const MAX_LIMIT = 1000;

/**
 * Largest `skip` the API allows. Combined with `limit` this caps what can be
 * paged through the search API (~26,000 records); for bulk access use the
 * openFDA download files (https://open.fda.gov/data/downloads/).
 */
export const MAX_SKIP = 25_000;

/** Default page size used by {@link OpenFdaClient} pagination helpers. */
export const DEFAULT_PAGE_SIZE = 100;
