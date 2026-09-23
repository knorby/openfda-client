import type { OpenFdaHarmonized, RecallEnforcementReport } from "./openfda";

/**
 * A drug adverse-event report (`drug/event` endpoint, FAERS extracts).
 *
 * These are **voluntary reports**: a reported association does not establish
 * causation, reports can be incomplete/inaccurate, and the data should not
 * be used to estimate incidence. openFDA's standing warning applies.
 *
 * @disclaimer Do not rely on openFDA to make decisions regarding medical care.
 */
export interface DrugEvent {
  /** Reporter's internal company number. */
  companynumb?: string;
  /** `"1"` if the reporter judged the event expedited-worthy. */
  fulfillexpeditecriteria?: string;
  /** The patient and their drug/reaction records. */
  patient?: DrugEventPatient;
  /** Country where the event occurred. */
  occurredcountry?: string;
  /** Duplicate-report cross-reference. */
  reportduplicate?: { duplicatenumb?: string; duplicatesource?: string };
  /** Date FDA received the report (`YYYYMMDD`). */
  receiptdate?: string;
  /** Receipt-date format (`"YYYYMMDD"`). */
  receiptdateformat?: string;
  /** Date the report was first received by any party (`YYYYMMDD`). */
  receivedate?: string;
  /** Receive-date format (`"YYYYMMDD"`). */
  receivedateformat?: string;
  /** The report's unique FAERS safety-report identifier. */
  safetyreportid?: string;
  /** Information about the primary source of the report. */
  primarysource?: DrugEventPrimarySource;
  /** `"1"` if the report is serious (any seriousness criterion met). */
  serious?: string;
  /** `"1"` if the event resulted in death. */
  seriousnessdeath?: string;
  /** `"1"` if the event caused a congenital anomaly. */
  seriousnesscongenitalanomali?: string;
  /** `"1"` if the event caused hospitalization. */
  seriousnesshospitalization?: string;
  /** `"1"` if the event was life threatening. */
  seriousnesslifethreatening?: string;
  /** `"1"` if the event caused disability. */
  seriousnessdisabling?: string;
  /** `"1"` if another medically important condition occurred. */
  seriousnessother?: string;
  /** Organization that sent the report to FDA (e.g. `"FDA-PHARMACEUTICAL"`). */
  sender?: { senderorganization?: string };
  /** Date the report was transmitted (`YYYYMMDD`). */
  transmissiondate?: string;
  /** Transmission-date format (`"YYYYMMDD"`). */
  transmissiondateformat?: string;
}

/** Patient-level details of an adverse-event report. */
export interface DrugEventPatient {
  /** Drugs associated with the event (suspect, concomitant, interacting). */
  drug?: DrugEventDrug[];
  /** Patient age at onset (in `patientonsetageunit` units). */
  patientonsetage?: string;
  /** Age unit code (`"800"` = years, `"801"` = months, `"802"` = days). */
  patientonsetageunit?: string;
  /** Patient sex (`"1"` male, `"2"` female, `"0"` unknown). */
  patientsex?: string;
  /** Patient weight (kg). */
  patientweight?: string;
  /** Reactions (preferred MedDRA terms) the patient experienced. */
  reaction?: DrugEventReaction[];
  /** Free-text narrative summary of the event. */
  summary?: string;
}

/** One drug record within an adverse-event report. */
export interface DrugEventDrug {
  /** Action taken with the drug (`"1"` withdrawn … `"5"` unknown). */
  actiondrug?: string;
  /** Duration of drug exposure (text, e.g. `"5 days"`). */
  actexpdur?: string;
  /** Whether the drug was additionally monitored. */
  drugadditional?: string;
  /** Drug's authorization (approval) number. */
  drugauthorizationnumb?: string;
  /**
   * Drug's role: `"1"` suspect, `"2"` concomitant, `"3"` interacting.
   */
  drugcharacterization?: string;
  /** Cumulative dose number. */
  drugcumulativedosagenumb?: string;
  /** Dosage text (e.g. `"1 TABLET, DAILY"`). */
  drugdosagetext?: string;
  /** Date the drug course ended (`YYYYMMDD`). */
  drugenddate?: string;
  /** End-date format. */
  drugenddateformat?: string;
  /** Fixed unit of the cumulative dose. */
  drugdoseunit?: string;
  /** Expiration date of the drug lot (`YYYYMMDD`). */
  drugexpirationdate?: string;
  /** Batch/lot number. */
  druglotnumb?: string;
  /** Medicinal product name as reported (may be a brand or ingredient). */
  medicinalproduct?: string;
  /** Route of administration (e.g. `"ORAL"`). */
  drugadministrationroute?: string;
  /** Date the drug course started (`YYYYMMDD`). */
  drugstartdate?: string;
  /** Start-date format. */
  drugstartdateformat?: string;
  /** Batch/recall number, alternate field. */
  drugbatchnumb?: string;
  /** Drug form (e.g. `"TABLET"`). */
  drugdosageform?: string;
  /** Indication for use (verbatim). */
  drugindication?: string;
  /** Additional structured drug information. */
  drugstructuredosagenumb?: string;
  /** Whether the drug was drug-interaction flagged. */
  druginteractaction?: string[];
  /** Harmonized FDA identifiers for this drug, when matched. */
  openfda?: OpenFdaHarmonized;
}

/** One reaction record within an adverse-event report. */
export interface DrugEventReaction {
  /** Reaction as a preferred MedDRA term (e.g. `"HEADACHE"`). */
  reactionmeddrapt?: string;
  /** Outcome code (`"1"` recovered … `"5"` unknown, `"6"` died). */
  reactionoutcome?: string;
}

/** Reporter details of an adverse-event report. */
export interface DrugEventPrimarySource {
  /** Reporter qualification: `"1"` physician … `"5"` consumer, `"2"` pharmacist. */
  qualification?: string;
  /** Country of the reporter. */
  reportercountry?: string;
  /** Whether the report was literature-derived (`"1"` = yes). */
  literaturereference?: string;
  /** Whether the reporter is a consumer (`"1"` = yes). */
  consumer?: string;
  /** Whether the report is confidential (`"1"` = yes). */
  confidentiality?: string;
  /** Date the source first reported the event (`YYYYMMDD`). */
  reportdate?: string;
  /** Report-date format. */
  reportdateformat?: string;
}

/**
 * Structured product labeling for an FDA-approved drug
 * (`drug/label` endpoint). Most content sections are string arrays of
 * paragraphs; openFDA omits empty sections entirely.
 *
 * @disclaimer Label text is presented as-is from the SPL — always consult
 * the current official labeling for clinical use.
 */
export interface DrugLabel {
  /** Active ingredients (free text). */
  active_ingredient?: string[];
  /** Warnings about pediatric use. */
  pediatric_use?: string[];
  /** Drug-interaction guidance. */
  drug_interactions?: string[];
  /** Contraindications. */
  contraindications?: string[];
  /** When the drug should not be used. */
  do_not_use?: string[];
  /** How the drug is supplied. */
  how_supplied?: string[];
  /** Label image file names (see downloads for the images themselves). */
  images?: string[];
  /** Inactive ingredients (free text). */
  inactive_ingredient?: string[];
  /** Approved indications. */
  indications_and_usage?: string[];
  /** Instructions to ask a doctor/pharmacist. */
  ask_doctor?: string[];
  /** Instructions to ask a doctor or pharmacist before use. */
  ask_doctor_or_pharmacist?: string[];
  /** Information for the patient/caregiver. */
  information_for_patients?: string[];
  /** Guidance about allergic reactions. */
  allergic_reactions?: string[];
  /** Laboratory-test monitoring guidance. */
  laboratory_tests?: string[];
  /** Mechanism of action. */
  mechanism_of_action?: string[];
  /** Routine dosage and administration. */
  dosage_and_administration?: string[];
  /** Geriatric-use guidance. */
  geriatric_use?: string[];
  /** Pregnancy/nursing guidance (legacy sections). */
  pregnancy_or_breast_feeding?: string[];
  /** Warning to keep out of reach of children. */
  keep_out_of_reach_of_children?: string[];
  /** Overdosage guidance. */
  overdosage?: string[];
  /** Labeler's stated purpose (OTC products). */
  purpose?: string[];
  /** When to stop use (OTC). */
  stop_use?: string[];
  /** Packaging/storage instructions. */
  storage_and_handling?: string[];
  /** Abuse/misuse warnings. */
  abuse?: string[];
  /** Boxed warnings. */
  boxed_warning?: string[];
  /** Clinical pharmacology. */
  clinical_pharmacology?: string[];
  /** Clinical-study summaries. */
  clinical_studies?: string[];
  /** Concomitant-disease warnings. */
  warnings_and_cautions?: string[];
  /** Pharmacokinetics. */
  pharmacokinetics?: string[];
  /** Pregnancy category/section text. */
  pregnancy?: string[];
  /** Product's principal display panel text. */
  package_label_principal_display_panel?: string[];
  /** Nonclinical toxicology. */
  carcinogenesis_mutagenesis_impairment_of_fertility?: string[];
  /** Patient-counseling information. */
  patient_counseling_information?: string[];
  /** Precautions (legacy text). */
  precautions?: string[];
  /** Contact questions section. */
  questions?: string[];
  /** References. */
  references?: string[];
  /** SPL product data elements. */
  spl_product_data_elements?: string[];
  /** Pharmacodynamics. */
  pharmacodynamics?: string[];
  /** Nursing-mothers section (legacy). */
  nursing_mothers?: string[];
  /** Teratogenic-effects section (legacy). */
  teratogenic_effects?: string[];
  /** Warning statements to include on the product. */
  warnings?: string[];
  /** User safety warnings. */
  user_safety_warnings?: string[];
  /** Adverse-reactions section. */
  adverse_reactions?: string[];
  /** SPL set identifier (same across versions of a label). */
  set_id?: string;
  /** Label effective date (`YYYYMMDD`). */
  effective_time?: string;
  /** Unique label-record identifier. */
  id?: string;
  /** Label version number. */
  version?: string;
  /** Harmonized FDA identifiers for this drug. */
  openfda?: OpenFdaHarmonized;
}

/** One active ingredient of an NDC-directory or Drugs@FDA product. */
export interface ActiveIngredient {
  /** Ingredient name. */
  name?: string;
  /** Strength (e.g. `"10 MG"`). */
  strength?: string;
}

/** One package of an NDC-directory product. */
export interface NdcPackage {
  /** Package description (e.g. `"1 BOTTLE in 1 CARTON (0069-0015-66)"`). */
  description?: string;
  /** Package-level NDC (with check digit). */
  package_ndc?: string;
  /** Sample flag. */
  sample?: boolean;
  /** Date marketing of the package began (`YYYYMMDD`). */
  marketing_start_date?: string;
  /** Date marketing of the package ended (`YYYYMMDD`). */
  marketing_end_date?: string;
}

/**
 * An entry in the NDC directory (`drug/ndc` endpoint) — one product-level
 * NDC listing.
 */
export interface DrugNdc {
  /** Active ingredients with strengths. */
  active_ingredients?: ActiveIngredient[];
  /** Associated application number (NDA/ANDA/BLA), when applicable. */
  application_number?: string;
  /** Proprietary (brand) name. */
  brand_name?: string;
  /** Brand-name base portion. */
  brand_name_base?: string;
  /** Brand-name suffix (e.g. `"CT"` for controlled-release tablets). */
  brand_name_suffix?: string;
  /** Dosage form (e.g. `"TABLET, COATED"`). */
  dosage_form?: string;
  /** `"true"` if marketed as a finished drug product. */
  finished?: boolean;
  /** Non-proprietary (generic) name(s). */
  generic_name?: string;
  /** Firm that labeled the product. */
  labeler_name?: string;
  /** Date the listing expires (`YYYYMMDD`). */
  listing_expiration_date?: string;
  /** Marketing category (e.g. `"ANDA"`, `"OTC MONOGRAPH FINAL"`). */
  marketing_category?: string;
  /** Date marketing of the product began (`YYYYMMDD`). */
  marketing_start_date?: string;
  /** Date marketing of the product ended (`YYYYMMDD`). */
  marketing_end_date?: string;
  /** Packages marketed for this product. */
  packaging?: NdcPackage[];
  /** Product identifier (`"{product_ndc}_{labeler-style id}"`). */
  product_id?: string;
  /** Product-level NDC (labeler code + product code). */
  product_ndc?: string;
  /** Product type (e.g. `"HUMAN OTC DRUG"`). */
  product_type?: string;
  /** Route(s) of administration. */
  route?: string[];
  /** SPL identifier, when available. */
  spl_id?: string;
  /** Harmonized FDA identifiers for this product. */
  openfda?: OpenFdaHarmonized;
}

/** One marketed product under a Drugs@FDA or Orange Book application. */
export interface ApplicationProduct {
  /** Active ingredients with strengths. */
  active_ingredients?: ActiveIngredient[];
  /** Proprietary (brand) name of the product. */
  brand_name?: string;
  /** Dosage form. */
  dosage_form?: string;
  /** Route(s) of administration. */
  route?: string;
  /** Marketing status (e.g. `"Prescription"`). */
  marketing_status?: string;
  /** Product number within the application. */
  product_number?: string;
  /** Reference drug for ANDAs (`"Yes"`/`"No"`/`"None"`). */
  reference_drug?: string;
  /** Whether this is the reference standard (`"Yes"`/`"No"`/`"None"`). */
  reference_standard?: string;
  /** Therapeutic-equivalence code (Orange Book, e.g. `"AB"`). */
  te_code?: string;
  /** Date marketing of the product began (`YYYYMMDD`). */
  marketing_start_date?: string;
  /** Date marketing of the product ended (`YYYYMMDD`). */
  marketing_end_date?: string;
}

/** One submission (original or supplement) under a Drugs@FDA application. */
export interface DrugsFdaSubmission {
  /** Submission number. */
  submission_number?: string;
  /** Submission type (e.g. `"ORIG"`, `"SUPPL"`). */
  submission_type?: string;
  /** Submission class code. */
  submission_class_code?: string;
  /** Human-readable submission class description. */
  submission_class_code_description?: string;
  /** Submission status (e.g. `"AP"` = approved). */
  submission_status?: string;
  /** Date of the submission status (`YYYYMMDD`). */
  submission_status_date?: string;
  /** Review priority (e.g. `"PRIORITY"`, `"STANDARD"`, `"NA"`). */
  review_priority?: string;
  /** Notes attached to the submission. */
  submissions_notes?: string;
  /** Most-recent label text accompanying this submission (`"1"` = yes). */
  last_update_for_label_text?: string;
  /** Application-approval notes. */
  submission_public_notes?: string;
}

/** Most-recent-submission summary attached to a Drugs@FDA record. */
export interface DrugsFdaSubmissionDetail extends DrugsFdaSubmission {
  /** Number of the application this summary describes. */
  application_number?: string;
  /** Dechunked date the submission's status was set (`YYYYMMDD`). */
  submission_status_date_as_yyyymmdd?: string;
}

/**
 * A Drugs@FDA application (`drug/drugsfda` endpoint) — the regulatory
 * record of an approved (or formerly approved) drug application since 1939.
 */
export interface DrugsFda {
  /** NDA/ANDA/BLA application number. */
  application_number?: string;
  /** Sponsor (applicant) firm name. */
  sponsor_name?: string;
  /** The product(s) approved/marketed under this application. */
  products?: ApplicationProduct[];
  /** Every submission (originals + supplements) under this application. */
  submissions?: DrugsFdaSubmission[];
  /** Summary of the most recent submission. */
  most_recent_submission?: DrugsFdaSubmissionDetail;
  /** Harmonized FDA identifiers spanning this application's products. */
  openfda?: OpenFdaHarmonized;
}

/** One product row in an Orange Book application record. */
export interface OrangeBookProduct extends Omit<ApplicationProduct, "te_code"> {
  /** Drug's full application name. */
  application_full_name?: string;
  /** Application short name. */
  application_name?: string;
  /** Therapeutic-equivalence code (e.g. `"AB"`, `"BX"`). */
  te_code?: string;
  /** Application-level fields echoed per product. */
  application_type?: string;
  application_number?: string;
}

/**
 * An Orange Book application record (`drug/orangebook` endpoint) — approved
 * drug products with therapeutic-equivalence evaluations.
 */
export interface DrugOrangeBook {
  /** Application number (e.g. `"ANDA070660"`). */
  application_number?: string;
  /** Application full name. */
  application_full_name?: string;
  /** Sponsor firm name. */
  sponsor_name?: string;
  /** Date the application was approved (`YYYYMMDD`). */
  approval_date?: string;
  /** Products listed under this application. */
  products?: OrangeBookProduct[];
}

/**
 * A drug-shortage record (`drug/shortages` endpoint).
 */
export interface DrugShortage {
  /** Shortage availability status (e.g. `"Currently in Shortage"`). */
  availability?: string;
  /** Company associated with the shortage. */
  company_name?: string;
  /** Contact information for the company. */
  contact_info?: string[];
  /** Dosage form of the affected product. */
  dosage_form?: string;
  /** Generic name of the affected product. */
  generic_name?: string;
  /** Date the shortage was first posted (`YYYYMMDD`). */
  initial_posting_date?: string;
  /** Package-level NDC(s) affected. */
  package_ndc?: string[];
  /** Presentation (e.g. `"Prefilled Syringes"`). */
  presentation?: string;
  /** Related-info links/notes. */
  related_info?: string[];
  /** Shortage status (e.g. `"Active"`, `"Resolved"`). */
  status?: string;
  /** Therapeutic category bucket used by FDA CDER shortages. */
  therapeutic_category?: string[];
  /** Date of the latest update (`YYYYMMDD`). */
  update_date?: string;
  /** Kind of this update (e.g. `"New"`, `"Change"`). */
  update_type?: string;
  /** Harmonized FDA identifiers, when matched. */
  openfda?: OpenFdaHarmonized;
}

/** Drug recall enforcement reports share the generic report shape. */
export type DrugEnforcement = RecallEnforcementReport;
