// @knorby/openfda-client — TypeScript client for the openFDA API.
// Universal: Node, React Native, browsers, Bun, Deno. Zero runtime deps.
//
// DISCLAIMER: This library is not affiliated with, endorsed by, or sponsored
// by the FDA or the U.S. Government. openFDA's own warning applies to all
// data retrieved through this client: "Do not rely on openFDA to make
// decisions regarding medical care. While we make every effort to ensure
// that data is accurate, you should assume all results are unvalidated."
// Data provided by the U.S. Food and Drug Administration
// (https://open.fda.gov).

export type {
  EndpointClient,
  EndpointResultMap,
  ResultFor,
} from "./client";
export { createEndpoint, OpenFdaClient } from "./client";
// Constants for direct reference.
export {
  DEFAULT_BASE_URL,
  DEFAULT_PAGE_SIZE,
  DEFAULT_TIMEOUT_MS,
  MAX_LIMIT,
  MAX_SKIP,
} from "./constants";
export type { EndpointFor, EndpointPath, Noun } from "./endpoints";
// Endpoint registry.
export { ALL_PATHS, ENDPOINTS } from "./endpoints";

export {
  OpenFdaApiError,
  OpenFdaError,
  OpenFdaNetworkError,
  OpenFdaNotFoundError,
  OpenFdaTimeoutError,
} from "./errors";
export type { FetchLike, OpenFdaClientConfig, OpenFdaRequester } from "./http";
// Search-syntax helpers.
export {
  and,
  exact,
  exists,
  field,
  not,
  or,
  range,
  term,
} from "./query";
// Shared & harmonized types.
export type {
  CountParams,
  CountResult,
  OpenFdaMeta,
  OpenFdaMetaResults,
  OpenFdaResponse,
  SearchParams,
} from "./types/common";
export type { CosmeticEvent, CosmeticEventProduct } from "./types/cosmetic";
export type {
  ActiveIngredient,
  ApplicationProduct,
  DrugEnforcement,
  DrugEvent,
  DrugEventDrug,
  DrugEventPatient,
  DrugEventPrimarySource,
  DrugEventReaction,
  DrugLabel,
  DrugNdc,
  DrugOrangeBook,
  DrugShortage,
  DrugsFda,
  DrugsFdaSubmission,
  DrugsFdaSubmissionDetail,
  NdcPackage,
  OrangeBookProduct,
} from "./types/drug";
export type {
  FoodEnforcement,
  FoodEvent,
  FoodEventProduct,
} from "./types/food";
export type {
  OpenFdaHarmonized,
  RecallEnforcementReport,
} from "./types/openfda";
export type { QueryRecord } from "./utils/serialize";
// Query-parameter serializer, for advanced/callers building requests.
export { buildQueryString, mergeParams } from "./utils/serialize";
