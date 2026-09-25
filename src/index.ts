// @knorby/openfda-client — TypeScript client for the openFDA API.
// Universal: Node, React Native, browsers, Bun, Deno. Zero runtime deps.
//
// Not affiliated with the FDA. openFDA data carries its own disclaimers —
// see README.md ("Data and medical disclaimers").

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
export type {
  Substance,
  SubstanceCode,
  SubstanceName,
  SubstanceNameOrg,
  SubstanceRef,
  SubstanceReference,
  SubstanceRelationship,
  UniiRecord,
} from "./types/other";
export type { QueryRecord } from "./utils/serialize";
// Query-parameter serializer, for advanced/callers building requests.
export { buildQueryString, mergeParams } from "./utils/serialize";
