/**
 * The harmonized `openfda` sub-record that openFDA attaches to records
 * across endpoints (drug label/ndc/drugsfda/shortages, and per-drug within
 * adverse-event reports). Every field is an optional string array — openFDA
 * harmonizes values and omits empty ones.
 *
 * See https://open.fda.gov/data/harmonized-fields/.
 */
export interface OpenFdaHarmonized {
  /** NDA/ANDA/BLA application number(s) the record is associated with. */
  application_number?: string[];
  /** Proprietary (brand) name(s). */
  brand_name?: string[];
  /** Non-proprietary (generic) name(s). */
  generic_name?: string[];
  /** Manufacturer / labeler name(s). */
  manufacturer_name?: string[];
  /** 5-digit product NDC(s) (e.g. `"0069-0015"`). */
  product_ndc?: string[];
  /** Product type(s) (e.g. `"HUMAN PRESCRIPTION DRUG"`). */
  product_type?: string[];
  /** Route(s) of administration (e.g. `"INTRAVENOUS"`). */
  route?: string[];
  /** Ingredient substance name(s). */
  substance_name?: string[];
  /** RxNorm concept identifier(s). */
  rxcui?: string[];
  /** Structured Product Label ID(s). */
  spl_id?: string[];
  /** Structured Product Label set ID(s). */
  spl_set_id?: string[];
  /** Complete package NDC(s) (e.g. `"0069-0015-66"`). */
  package_ndc?: string[];
  /** Universal Product Code(s). */
  upc?: string[];
  /** FDA Unique Ingredient Identifier(s). */
  unii?: string[];
  /** Pharm class — Efficacy (EPC) terms. */
  pharm_class_epc?: string[];
  /** Pharm class — Mechanism of Action (MoA) terms. */
  pharm_class_moa?: string[];
  /** Pharm class — Physiological Effect (PE) terms. */
  pharm_class_pe?: string[];
  /** Pharm class — Chemical/Structure (CS) terms. */
  pharm_class_cs?: string[];
  /** Whether the labeler is the original packager (`"1"` = true). */
  is_original_packager?: string[];
  /** NDA/ANDA number(s) with any supplemental-number suffixes. */
  application_number_with_suffix?: string[];
  /**
   * NDC(s) in the labeler-code + product-code form without the package code
   * segment's trailing check-derived pieces (harmonization artifact).
   */
  product_ndc11?: string[];
  /**
   * Whether this is the original package (NDC eleventh-digit flag), encoded
   * as `"0"`/`"1"` strings in some datasets.
   */
  original_packager_product_ndc11?: string[];
}

/**
 * A recall enforcement report — the shared record shape of the
 * `drug/enforcement`, `device/enforcement`, and `food/enforcement`
 * endpoints.
 */
export interface RecallEnforcementReport {
  /** Recalling firm's street address. */
  address_1?: string;
  /** Recalling firm's address, second line. */
  address_2?: string;
  /** Date the responsible FDA center classified the recall (`YYYYMMDD`). */
  center_classification_date?: string;
  /** Recalling firm's city. */
  city?: string;
  /**
   * FDA recall classification: `"Class I"` (most serious), `"Class II"`,
   * or `"Class III"`.
   */
  classification?: string;
  /** The product identifier used in the recall (lot, model, UPC, …). */
  code_info?: string;
  /** Recalling firm's country. */
  country?: string;
  /** Geographic distribution pattern (e.g. `"Nationwide"`). */
  distribution_pattern?: string;
  /** Unique event ID for the recall. */
  event_id?: string;
  /** How the firm first notified (e.g. `"Letter"`). */
  initial_firm_notification?: string;
  /** Additional code information. */
  more_code_info?: string;
  /** Recalling firm's postal code. */
  postal_code?: string;
  /** Human-readable product description. */
  product_description?: string;
  /** Quantity of product involved. */
  product_quantity?: string;
  /** Regulated product type (e.g. `"Drugs"`, `"Food"`). */
  product_type?: string;
  /** Why the product was recalled. */
  reason_for_recall?: string;
  /** Date the firm initiated the recall (`YYYYMMDD`). */
  recall_initiation_date?: string;
  /** Firm-assigned recall number. */
  recall_number?: string;
  /** The firm conducting the recall. */
  recalling_firm?: string;
  /** Date the report was finalized (`YYYYMMDD`). */
  report_date?: string;
  /** Recalling firm's state. */
  state?: string;
  /** Recall status (e.g. `"Ongoing"`, `"Completed"`, `"Terminated"`). */
  status?: string;
  /** Date the recall was terminated (`YYYYMMDD`). */
  termination_date?: string;
  /** Whether the recall was `"Voluntary: Firm Initiated"` or mandated. */
  voluntary_mandated?: string;
}
