/**
 * Models for the openFDA `other/substance` (GSRS substance records) and
 * `other/unii` (UNII substance-name crosswalk) endpoints.
 *
 * GSRS records are deep and field presence varies record to record; the
 * typed surfaces here reflect the fields observed in this client's API
 * shape snapshots (`tests/shapes/other.*.json`). The deeply nested GSRS
 * sections (structure, moieties, modifications, …) are intentionally
 * **opaque** pass-throughs — see the individual field docs. The UNII
 * endpoint is the dependable substance-name ↔ UNII crosswalk; see the
 * README "Known API quirks" section for search caveats around
 * `other/substance` name fields.
 */

/**
 * A reference from one substance record to another substance. Shared by
 * relationship targets, modification agents, molecular fragments, and
 * structurally-diverse parent substances.
 */
export interface SubstanceRef {
  /** Linking identifier within the referencing record. */
  linking_id?: string;
  /** Substance name. */
  name?: string;
  /** Preferred substance name. */
  ref_pname?: string;
  /** UUID of the referenced substance record. */
  refuuid?: string;
  /** Substance class (e.g. `"chemical"`, `"protein"`, `"structurally diverse"`). */
  substance_class?: string;
  /** UNII code of the referenced substance. */
  unii?: string;
  /** UUID of the referenced substance. */
  uuid?: string;
}

/** An organization associated with a substance name. */
export interface SubstanceNameOrg {
  /** Organization name (e.g. `"United States Pharmacopeia"`). */
  name_org?: string;
  /** Organization UUID. */
  uuid?: string;
}

/** One name for a substance, with the organizations and contexts using it. */
export interface SubstanceName {
  /** The name itself (e.g. `"ATORVASTATIN CALCIUM"`). */
  name?: string;
  /** Name type (e.g. `"cn"` chemical name, `"in"` ingredient name). */
  type?: string;
  /** Whether this is the preferred name for the substance. */
  preferred?: boolean;
  /** Whether this is the display name. */
  display_name?: boolean;
  /** Standardized (INN-style) name. */
  stdName?: string;
  /** Languages the name is used in (e.g. `["EN"]`). */
  languages?: string[];
  /** Name domains (e.g. `["name_type:cn"]`). */
  domains?: string[];
  /** UUIDs of reference records supporting this name. */
  references?: string[];
  /** Record UUID. */
  uuid?: string;
  /** Organizations that use this name. */
  name_orgs?: SubstanceNameOrg[];
}

/** A code assigned to the substance (UNII, CAS, pharmacopeia codes, …). */
export interface SubstanceCode {
  /** The code value (e.g. `"E3986RS5NQ"`). */
  code?: string;
  /** Code system (e.g. `"UNII"`, `"CAS"`). */
  code_system?: string;
  /** Code type (e.g. `"PRIMARY"`). */
  type?: string;
  /** Source URL for the code. */
  url?: string;
  /** Record UUID. */
  uuid?: string;
  /** Free-text comments. */
  comments?: string;
  /** UUIDs of reference records supporting this code. */
  references?: string[];
}

/** A bibliographic reference cited by the substance record. */
export interface SubstanceReference {
  /** Citation text. */
  citation?: string;
  /** Document type. */
  doc_type?: string;
  /** Whether the document is in the public domain. */
  public_domain?: boolean;
  /** Classification tags. */
  tags?: string[];
  /** Document URL. */
  url?: string;
  /** Record UUID. */
  uuid?: string;
  /** Document date (epoch milliseconds in observed records). */
  document_date?: number;
}

/** A relationship between this substance and another substance. */
export interface SubstanceRelationship {
  /** Relationship type (e.g. `"active-moiety"`, `"salt"`). */
  type?: string;
  /** How the related substance participates (e.g. `"ACTIVE"`). */
  qualification?: string;
  /** Record UUID. */
  uuid?: string;
  /** UUIDs of reference records supporting this relationship. */
  references?: string[];
  /** Interaction type, for interaction relationships. */
  interaction_type?: string;
  /** Amount bounds associated with the relationship. */
  amount?: { uuid?: string; high?: number; low?: number; units?: string };
  /** The substance this relationship points at. */
  related_substance?: SubstanceRef;
}

/**
 * A GSRS substance record from the `other/substance` endpoint.
 *
 * Field presence varies by record and substance class; every field is
 * optional. Deep GSRS sections are opaque pass-throughs rather than fully
 * modeled — cast and inspect as needed.
 */
export interface Substance {
  /** UNII code for the substance (e.g. `"E3986RS5NQ"`). */
  unii?: string;
  /** Record UUID. */
  uuid?: string;
  /** Record version. */
  version?: string;
  /** Substance class (e.g. `"chemical"`, `"protein"`, `"mixture"`). */
  substance_class?: string;
  /** Definition level (e.g. `"base"`). */
  definition_level?: string;
  /** Definition type (e.g. `"UNII"`). */
  definition_type?: string;
  /** Names for the substance. */
  names?: SubstanceName[];
  /** Codes assigned to the substance. */
  codes?: SubstanceCode[];
  /** Bibliographic references cited by the record. */
  references?: SubstanceReference[];
  /** Relationships to other substances. */
  relationships?: SubstanceRelationship[];
  /**
   * GSRS structure section (formula, SMILES, molfile, stereochemistry, …).
   * Opaque pass-through — not modeled.
   */
  structure?: Record<string, unknown>;
  /**
   * GSRS moiety records. Opaque pass-through — not modeled.
   */
  moieties?: Record<string, unknown>[];
  /**
   * GSRS modifications section (agent and structural modifications).
   * Opaque pass-through — not modeled.
   */
  modifications?: Record<string, unknown>;
  /**
   * GSRS structurally-diverse section (materials, fractions, parts).
   * Opaque pass-through — not modeled.
   */
  structurally_diverse?: Record<string, unknown>;
  /**
   * GSRS property records (physical/chemical properties).
   * Opaque pass-through — not modeled.
   */
  properties?: Record<string, unknown>[];
}

/**
 * A UNII crosswalk record from the `other/unii` endpoint: the dependable
 * substance-name ↔ UNII mapping (see README "Known API quirks").
 */
export interface UniiRecord {
  /** Substance name (e.g. `"ATORVASTATIN"`). */
  substance_name?: string;
  /** UNII code (e.g. `"K4MIA10C8L"`). */
  unii?: string;
}
