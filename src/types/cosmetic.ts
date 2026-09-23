/**
 * A cosmetic adverse-event report (`cosmetic/event` endpoint, FDA CFSAN).
 *
 * These are **voluntary reports**; a reported association does not establish
 * causation, and FDA does not verify the data.
 *
 * @disclaimer Do not rely on openFDA to make decisions regarding medical care.
 */
export interface CosmeticEvent {
  /** Date of the adverse event (`YYYYMMDD`). */
  event_date?: string;
  /** Date FDA first received the report (`YYYYMMDD`). */
  initial_received_date?: string;
  /** Date of the most recent update (`YYYYMMDD`). */
  latest_received_date?: string;
  /** Legacy internal report identifier. */
  legacy_report_id?: string;
  /** MedDRA dictionary version used for coded terms. */
  meddra_version?: string;
  /** Outcomes of the event (e.g. `"Other Serious Outcome"`). */
  outcomes?: string[];
  /** Patient details. */
  patient?: { age?: string; age_unit?: string; gender?: string };
  /** Cosmetic products involved in the event. */
  products?: CosmeticEventProduct[];
  /** Reactions the patient experienced (free text). */
  reactions?: string[];
  /** Unique report number. */
  report_number?: string;
  /** Report type (e.g. `"Initial"`, `"Follow-up"`). */
  report_type?: string;
  /** Internal report-format version. */
  report_version?: string;
}

/** One product within a cosmetic-event report. */
export interface CosmeticEventProduct {
  /** Product name as reported. */
  product_name?: string;
  /** Product role in the event (e.g. `"SUSPECT"`, `"CONCOMITANT"`). */
  role?: string;
}
