import type { RecallEnforcementReport } from "./openfda";

/**
 * A food adverse-event / product-complaint report (`food/event` endpoint,
 * CFSAN adverse-event reporting system).
 *
 * These are **voluntary reports** about foods, including dietary
 * supplements: a reported association does not establish causation, and the
 * data are not verified by FDA.
 */
export interface FoodEvent {
  /** Consumer demographics (when provided). */
  consumer?: { age?: string; age_unit?: string; gender?: string };
  /** Date the report was created (`YYYYMMDD`). */
  date_created?: string;
  /** Outcomes of the event (e.g. `"Visited a Health Care Provider"`). */
  outcomes?: string[];
  /** Products involved in the event. */
  products?: FoodEventProduct[];
  /** Reactions/complaints the consumer experienced (free text). */
  reactions?: string[];
  /** Unique report number. */
  report_number?: string;
}

/** One product within a food-event report. */
export interface FoodEventProduct {
  /** CFSAN industry code (e.g. `"18"`). */
  industry_code?: string;
  /** Industry name (e.g. `"Vit Min/Herb as Misc"`). */
  industry_name?: string;
  /** Product name/brand as reported. */
  name_brand?: string;
  /** Product role in the event (e.g. `"SUSPECT"`). */
  role?: string;
}

/**
 * A food recall enforcement report (`food/enforcement` endpoint). Shares the
 * recall-report shape with drug and device enforcement records.
 */
export type FoodEnforcement = RecallEnforcementReport;
