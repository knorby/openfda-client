/**
 * Registry of live openFDA search-API endpoints, seeded by probing
 * `https://api.fda.gov/download.json` candidates on 2026-09-23 (see
 * `scripts/discover-endpoints.mjs`, which also re-verifies this registry).
 *
 * Note two paths that differ from the docs page slugs: the Orange Book's
 * "Drugs@FDA"-adjacent shortage dataset lives at `drug/shortages` and the
 * premarket approval dataset lives at `device/pma`. The `research`,
 * `transparency`, `tobacco/research*`, and `other/unii` datasets are fully
 * queryable search endpoints, not download-only data.
 */
export const ENDPOINTS = {
  animalandveterinary: ["event"],
  cosmetic: ["event"],
  device: [
    "510k",
    "classification",
    "covid19serology",
    "enforcement",
    "event",
    "pma",
    "recall",
    "registrationlisting",
    "udi",
  ],
  drug: [
    "drugsfda",
    "enforcement",
    "event",
    "label",
    "ndc",
    "orangebook",
    "shortages",
  ],
  food: ["enforcement", "event"],
  other: ["historicaldocument", "nsde", "substance", "unii"],
  research: ["covidmirnaandproteomics"],
  tobacco: [
    "problem",
    "researchdigitalads",
    "researchpreventionads",
    "researchsmokefree",
  ],
  transparency: ["crl"],
} as const;

/** An openFDA data noun (top-level API category). */
export type Noun = keyof typeof ENDPOINTS;

/** Endpoints available for a given noun. */
export type EndpointFor<N extends Noun> = (typeof ENDPOINTS)[N][number];

/**
 * A valid `"noun/endpoint"` pair, e.g. `"drug/label"`. Only real
 * noun-endpoint combinations are allowed (unlike a naive template-literal
 * union, which would admit `"cosmetic/510k"`).
 */
export type EndpointPath = {
  [N in Noun]: `${N}/${EndpointFor<N>}`;
}[Noun];

/** Every registered `"noun/endpoint"` path. Derived at runtime. */
export const ALL_PATHS: readonly EndpointPath[] = Object.entries(
  ENDPOINTS,
).flatMap(([noun, endpoints]) =>
  (endpoints as readonly string[]).map((endpoint) => `${noun}/${endpoint}`),
) as readonly EndpointPath[];
