import { DEFAULT_PAGE_SIZE, MAX_LIMIT, MAX_SKIP } from "./constants";
import type { EndpointPath } from "./endpoints";
import { type OpenFdaClientConfig, OpenFdaRequester } from "./http";
import type {
  CountParams,
  CountResult,
  OpenFdaMeta,
  OpenFdaResponse,
  SearchParams,
} from "./types/common";
import type { CosmeticEvent } from "./types/cosmetic";
import type {
  DrugEnforcement,
  DrugEvent,
  DrugLabel,
  DrugNdc,
  DrugOrangeBook,
  DrugShortage,
  DrugsFda,
} from "./types/drug";
import type { FoodEnforcement, FoodEvent } from "./types/food";

export type {
  FetchLike,
  OpenFdaClientConfig,
} from "./http";

/**
 * The client-facing contract for one endpoint: `search` (records), `count`
 * (facets), and `searchAll` (lazy auto-pagination). Created by
 * {@link createEndpoint}; instances hang off the {@link OpenFdaClient}
 * namespaces (e.g. `client.drug.label`).
 */
export interface EndpointClient<T> {
  /** Runs a record query. */
  search(params?: SearchParams): Promise<OpenFdaResponse<T>>;
  /** Runs a facet (`count`) query over unique values of one field. */
  count(params: CountParams): Promise<OpenFdaResponse<CountResult>>;
  /**
   * Lazily yields every matching record across pages.
   *
   * Stops when: a page comes back short (end of results), the reported
   * `meta.results.total` is reached, or the next `skip` would exceed the
   * API's 25,000-record paging ceiling. For larger result sets use the
   * official download files (https://open.fda.gov/data/downloads/).
   *
   * @param pageSize Page size, clamped to the API max of 1000.
   *   @default 100
   */
  searchAll(
    params?: Omit<SearchParams, "skip" | "limit">,
    pageSize?: number,
  ): AsyncGenerator<T>;
}

/**
 * Builds the {@link EndpointClient} trio for one endpoint path (without the
 * `.json` suffix), e.g. `"drug/label"`.
 */
export function createEndpoint<T>(
  requester: OpenFdaRequester,
  path: string,
): EndpointClient<T> {
  const endpointPath = `${path}.json`;
  return {
    search: (params = {}) =>
      requester.get<OpenFdaResponse<T>>(endpointPath, params),
    count: (params: CountParams) =>
      requester.get<OpenFdaResponse<CountResult>>(endpointPath, params),
    searchAll: (params = {}, pageSize) =>
      paginate<T>(requester, endpointPath, params, pageSize),
  };
}

/**
 * Async generator that walks every page of a record query.
 *
 * Stops on a short page, on reaching `meta.results.total`, or before
 * requesting `skip` beyond {@link MAX_SKIP} (the API's hard paging ceiling —
 * openFDA directs bulk consumers to the download files instead).
 */
async function* paginate<T>(
  requester: OpenFdaRequester,
  endpointPath: string,
  params: Omit<SearchParams, "skip" | "limit">,
  pageSize?: number,
): AsyncGenerator<T> {
  if (pageSize !== undefined && (!Number.isInteger(pageSize) || pageSize < 1)) {
    throw new RangeError(
      `pageSize must be a positive integer, got ${pageSize}`,
    );
  }
  const limit = Math.min(pageSize ?? DEFAULT_PAGE_SIZE, MAX_LIMIT);
  let skip = 0;
  for (;;) {
    const page = await requester.get<OpenFdaResponse<T>>(endpointPath, {
      ...params,
      limit,
      skip,
    });
    const results = page.results ?? [];
    for (const record of results) {
      yield record;
    }
    // Short page ⇒ server has no more.
    if (results.length < limit) return;
    skip += results.length;
    const total = page.meta.results?.total;
    if (typeof total === "number" && skip >= total) return;
    if (skip > MAX_SKIP) return;
  }
}

/**
 * Maps endpoint paths to their result models. Typed entries get real
 * response interfaces; untyped paths fall back to
 * `Record<string, unknown>` (see `types/drug.ts`, `types/food.ts`,
 * `types/cosmetic.ts`). Add new entries here as models are authored — the
 * generic `client.search()` escape hatch keeps untyped endpoints usable in
 * the meantime.
 */
export interface EndpointResultMap {
  "cosmetic/event": CosmeticEvent;
  "drug/drugsfda": DrugsFda;
  "drug/enforcement": DrugEnforcement;
  "drug/event": DrugEvent;
  "drug/label": DrugLabel;
  "drug/ndc": DrugNdc;
  "drug/orangebook": DrugOrangeBook;
  "drug/shortages": DrugShortage;
  "food/enforcement": FoodEnforcement;
  "food/event": FoodEvent;
}

/**
 * Resolves the result model for a path: real model when registered, generic
 * record otherwise. Callers can override with an explicit type argument:
 * `client.search<MyType>("device/udi", …)`.
 */
export type ResultFor<P extends string> = P extends keyof EndpointResultMap
  ? EndpointResultMap[P]
  : Record<string, unknown>;

/**
 * A fully-typed, zero-dependency TypeScript client for the openFDA API
 * (https://open.fda.gov/apis/).
 *
 * Works in any runtime that provides the standard Web `fetch` (Node 18+,
 * React Native, browsers, Bun, Deno). Every openFDA endpoint is reachable
 * two ways:
 *
 * - **Typed namespaces** (`client.drug.label`, `client.food.event`, …), one
 *   member per live endpoint, each exposing `search`, `count`, and
 *   `searchAll`.
 * - **Generic paths** — `client.search("device/udi", …)` accepts any
 *   `"noun/endpoint"` string, so brand-new FDA endpoints work immediately
 *   without a client release.
 *
 * @example
 * ```ts
 * import { OpenFdaClient } from "@knorby/openfda-client";
 *
 * const client = new OpenFdaClient({
 *   // apiKey: process.env.OPENFDA_API_KEY, // 120,000 req/day vs 1,000
 * });
 *
 * const labels = await client.drug.label.search({
 *   search: 'openfda.brand_name:"lipitor"',
 *   limit: 5,
 * });
 * ```
 *
 * @disclaimer This library is not affiliated with, endorsed by, or sponsored
 * by the FDA or the U.S. Government. openFDA's own warning applies to
 * everything this client returns: "Do not rely on openFDA to make decisions
 * regarding medical care. While we make every effort to ensure that data is
 * accurate, you should assume all results are unvalidated."
 */
export class OpenFdaClient {
  private readonly requester: OpenFdaRequester;

  /** `client.animalandveterinary` — adverse-event reports for animal drugs. */
  readonly animalandveterinary: {
    event: EndpointClient<Record<string, unknown>>;
  };
  /** `client.cosmetic` — adverse-event reports for cosmetics. */
  readonly cosmetic: { event: EndpointClient<CosmeticEvent> };
  /** `client.device` — device clearances, approvals, events, recalls, UDI. */
  readonly device: {
    "510k": EndpointClient<Record<string, unknown>>;
    classification: EndpointClient<Record<string, unknown>>;
    covid19serology: EndpointClient<Record<string, unknown>>;
    enforcement: EndpointClient<Record<string, unknown>>;
    event: EndpointClient<Record<string, unknown>>;
    pma: EndpointClient<Record<string, unknown>>;
    recall: EndpointClient<Record<string, unknown>>;
    registrationlisting: EndpointClient<Record<string, unknown>>;
    udi: EndpointClient<Record<string, unknown>>;
  };
  /** `client.drug` — the highest-value openFDA namespace. */
  readonly drug: {
    drugsfda: EndpointClient<DrugsFda>;
    enforcement: EndpointClient<DrugEnforcement>;
    event: EndpointClient<DrugEvent>;
    label: EndpointClient<DrugLabel>;
    ndc: EndpointClient<DrugNdc>;
    orangebook: EndpointClient<DrugOrangeBook>;
    shortages: EndpointClient<DrugShortage>;
  };
  /** `client.food` — food events and recall enforcement reports. */
  readonly food: {
    enforcement: EndpointClient<FoodEnforcement>;
    event: EndpointClient<FoodEvent>;
  };
  /** `client.other` — NSDE, UNII, substance, historical documents. */
  readonly other: {
    historicaldocument: EndpointClient<Record<string, unknown>>;
    nsde: EndpointClient<Record<string, unknown>>;
    substance: EndpointClient<Record<string, unknown>>;
    unii: EndpointClient<Record<string, unknown>>;
  };
  /** `client.research` — COVID-19 miRNA/proteomics research data. */
  readonly research: {
    covidmirnaandproteomics: EndpointClient<Record<string, unknown>>;
  };
  /** `client.tobacco` — problem reports and research datasets. */
  readonly tobacco: {
    problem: EndpointClient<Record<string, unknown>>;
    researchdigitalads: EndpointClient<Record<string, unknown>>;
    researchpreventionads: EndpointClient<Record<string, unknown>>;
    researchsmokefree: EndpointClient<Record<string, unknown>>;
  };
  /** `client.transparency` — Complete Response Letters (CRL). */
  readonly transparency: { crl: EndpointClient<Record<string, unknown>> };

  constructor(config: OpenFdaClientConfig = {}) {
    this.requester = new OpenFdaRequester(config);
    this.animalandveterinary = {
      event: createEndpoint(this.requester, "animalandveterinary/event"),
    };
    this.cosmetic = { event: createEndpoint(this.requester, "cosmetic/event") };
    this.device = {
      "510k": createEndpoint(this.requester, "device/510k"),
      classification: createEndpoint(this.requester, "device/classification"),
      covid19serology: createEndpoint(this.requester, "device/covid19serology"),
      enforcement: createEndpoint(this.requester, "device/enforcement"),
      event: createEndpoint(this.requester, "device/event"),
      pma: createEndpoint(this.requester, "device/pma"),
      recall: createEndpoint(this.requester, "device/recall"),
      registrationlisting: createEndpoint(
        this.requester,
        "device/registrationlisting",
      ),
      udi: createEndpoint(this.requester, "device/udi"),
    };
    this.drug = {
      drugsfda: createEndpoint(this.requester, "drug/drugsfda"),
      enforcement: createEndpoint(this.requester, "drug/enforcement"),
      event: createEndpoint(this.requester, "drug/event"),
      label: createEndpoint(this.requester, "drug/label"),
      ndc: createEndpoint(this.requester, "drug/ndc"),
      orangebook: createEndpoint(this.requester, "drug/orangebook"),
      shortages: createEndpoint(this.requester, "drug/shortages"),
    };
    this.food = {
      enforcement: createEndpoint(this.requester, "food/enforcement"),
      event: createEndpoint(this.requester, "food/event"),
    };
    this.other = {
      historicaldocument: createEndpoint(
        this.requester,
        "other/historicaldocument",
      ),
      nsde: createEndpoint(this.requester, "other/nsde"),
      substance: createEndpoint(this.requester, "other/substance"),
      unii: createEndpoint(this.requester, "other/unii"),
    };
    this.research = {
      covidmirnaandproteomics: createEndpoint(
        this.requester,
        "research/covidmirnaandproteomics",
      ),
    };
    this.tobacco = {
      problem: createEndpoint(this.requester, "tobacco/problem"),
      researchdigitalads: createEndpoint(
        this.requester,
        "tobacco/researchdigitalads",
      ),
      researchpreventionads: createEndpoint(
        this.requester,
        "tobacco/researchpreventionads",
      ),
      researchsmokefree: createEndpoint(
        this.requester,
        "tobacco/researchsmokefree",
      ),
    };
    this.transparency = {
      crl: createEndpoint(this.requester, "transparency/crl"),
    };
  }

  /**
   * Runs a record query against any `"noun/endpoint"` path — the escape
   * hatch that keeps this client forward-compatible with new FDA endpoints.
   * Registered paths autocomplete and resolve to their typed models (see
   * {@link EndpointResultMap}); unknown paths resolve to
   * `Record<string, unknown>`, overridable with an explicit type argument.
   *
   * @param path e.g. `"drug/label"` or `"device/udi"`.
   */
  search<P extends EndpointPath | (string & {})>(
    path: P,
    params?: SearchParams,
  ): Promise<OpenFdaResponse<ResultFor<P>>> {
    return this.requester.get<OpenFdaResponse<ResultFor<P>>>(
      `${path}.json`,
      params,
    );
  }

  /**
   * Runs a facet (`count`) query against any `"noun/endpoint"` path.
   * Returns unique values of `params.count` with their frequencies.
   *
   * @param path e.g. `"drug/event"`.
   */
  count(
    path: string,
    params: CountParams,
  ): Promise<OpenFdaResponse<CountResult>> {
    return this.requester.get<OpenFdaResponse<CountResult>>(
      `${path}.json`,
      params,
    );
  }
}

/** Re-exported for advanced use (custom pagination over raw meta). */
export type { OpenFdaMeta };
