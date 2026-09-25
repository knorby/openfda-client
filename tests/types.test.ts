import { expect, test } from "vitest";
import type { ResultFor } from "../src/client";
import type { CountResult } from "../src/types/common";
import type { CosmeticEvent } from "../src/types/cosmetic";
import type {
  DrugEvent,
  DrugLabel,
  DrugNdc,
  DrugOrangeBook,
  DrugShortage,
} from "../src/types/drug";
import type { FoodEvent } from "../src/types/food";
import type { Substance, UniiRecord } from "../src/types/other";

/**
 * Compile-time tests: these assign realistic fixtures to the model types
 * (typecheck fails on any shape mismatch) and assert `ResultFor` path
 * resolution. Runtime assertions only mark the tests as run.
 */

// A realistic drug/label record (subset of documented fields).
const label: DrugLabel = {
  active_ingredient: [
    "Atorvastatin Calcium equivalent to 10 mg of atorvastatin",
  ],
  dosage_and_administration: ["Administer once daily."],
  effective_time: "20240515",
  id: "a7bf1c17-1e58-4d3e-9d1f-0e5d0f0f0f0f",
  indications_and_usage: ["For the treatment of hyperlipidemia."],
  set_id: "b7bf1c17-1e58-4d3e-9d1f-0e5d0f0f0f0f",
  version: "12",
  warnings: ["Do not use if you are pregnant."],
  carcinogenesis_and_mutagenesis_and_impairment_of_fertility: ["See studies."],
  openfda: {
    brand_name: ["LIPITOR"],
    generic_name: ["ATORVASTATIN CALCIUM"],
    manufacturer_name: ["Parke-Davis Div of Pfizer Labs"],
    package_ndc: ["0069-1530-66", "0069-1530-90"],
    product_ndc: ["0069-1530"],
    product_type: ["HUMAN PRESCRIPTION DRUG"],
    route: ["ORAL"],
    spl_id: ["abc"],
    spl_set_id: ["def"],
    substance_name: ["ATORVASTATIN CALCIUM"],
    unii: ["E3986RS5NQ"],
    is_original_packager: [true],
  },
};
expect(label.active_ingredient?.[0]).toContain("Atorvastatin");
expect(
  label.carcinogenesis_and_mutagenesis_and_impairment_of_fertility?.[0],
).toBe("See studies.");

// A realistic drug/event record.
const event: DrugEvent = {
  safetyreportid: "12345678",
  receivedate: "20240115",
  serious: "1",
  seriousnessdeath: "1",
  occurcountry: "US",
  patient: {
    drug: [
      {
        medicinalproduct: "LIPITOR",
        drugcharacterization: "1",
        drugindication: "Hyperlipidemia",
        openfda: { brand_name: ["LIPITOR"] },
      },
      { medicinalproduct: "ASPIRIN", drugcharacterization: "2" },
    ],
    reaction: [
      { reactionmeddrapt: "DEATH", reactionoutcome: "5" },
      { reactionmeddrapt: "HEADACHE", reactionoutcome: "1" },
    ],
    patientonsetage: "65",
    patientonsetageunit: "800",
    patientsex: "2",
  },
  primarysource: { qualification: "1", reportercountry: "US" },
  sender: { senderorganization: "FDA-PHARMACEUTICAL" },
};
expect(event.patient?.drug?.[0]?.openfda?.brand_name?.[0]).toBe("LIPITOR");

// A realistic drug/ndc record.
const ndc: DrugNdc = {
  active_ingredients: [{ name: "ATORVASTATIN CALCIUM", strength: "10 MG" }],
  application_number: "ANDA090768",
  brand_name: "ATORVASTATIN CALCIUM",
  dosage_form: "TABLET, FILM COATED",
  finished: true,
  generic_name: "ATORVASTATIN CALCIUM",
  labeler_name: "Ranbaxy Pharmaceuticals Inc.",
  marketing_category: "ANDA",
  marketing_start_date: "20111229",
  packaging: [
    {
      description: "90 TABLET, FILM COATED in 1 BOTTLE",
      package_ndc: "0071-0156-24",
    },
  ],
  product_id: "0071-0155_51c01940-ffac-4e5d-9e06-a6777352e1e2",
  product_ndc: "0071-0155",
  product_type: "HUMAN PRESCRIPTION DRUG",
  route: ["ORAL"],
};
expect(ndc.packaging?.[0]?.package_ndc).toBe("0071-0156-24");

const shortage: DrugShortage = {
  contact_info: "Contact manufacturer",
  package_ndc: "12345-6789-01",
  related_info: "Updated supply information",
  shortage_reason: "Demand increase",
  discontinued_date: "20260101",
};
expect(shortage.package_ndc).toBe("12345-6789-01");

const orangeBook: DrugOrangeBook = {
  approval_date: "19930630",
  product_number: "002",
  products: [
    {
      active_ingredients: [{ name: "METHAZOLAMIDE", strength: "50MG" }],
      application_number: "040001",
      brand_name: "METHAZOLAMIDE",
      reference_listed_drug: false,
      reference_standard: false,
      therapeutic_equivalence_codes: ["AB"],
    },
  ],
};
expect(orangeBook.products?.[0]?.reference_standard).toBe(false);
expect(orangeBook.product_number).toBe("002");

const numericCount: CountResult = { term: 2, count: 10906992 };
expect(numericCount.term).toBe(2);

// A realistic food/event record.
const foodEvent: FoodEvent = {
  date_created: "20231001",
  outcomes: ["Visited a Health Care Provider"],
  products: [
    {
      industry_code: "18",
      industry_name: "Vit Min/Herb as Misc",
      role: "SUSPECT",
      name_brand: "SUPER VITAMIN",
    },
  ],
  reactions: ["Headache"],
  report_number: "12345",
  consumer: { gender: "F" },
};
expect(foodEvent.products?.[0]?.role).toBe("SUSPECT");

// A realistic cosmetic/event record.
const cosmeticEvent: CosmeticEvent = {
  event_date: "20240201",
  initial_received_date: "20240210",
  outcomes: ["Other Serious Outcome"],
  patient: { age: "34", age_unit: "800", gender: "F" },
  products: [{ product_name: "HAIR SMOOTHING KIT", role: "SUSPECT" }],
  reactions: ["Hair loss"],
  report_number: "COS-1",
  report_type: "Initial",
};
expect(cosmeticEvent.products?.[0]?.role).toBe("SUSPECT");

// A realistic other/substance (GSRS) record. Deep GSRS sections
// (structure, moieties, …) are opaque `Record<string, unknown>` pass-throughs.
const substance: Substance = {
  unii: "E3986RS5NQ",
  uuid: "1e5d0f0f-0f0f-4d3e-9d1f-0e5d0f0f0f0f",
  version: "1",
  substance_class: "chemical",
  definition_type: "UNII",
  definition_level: "base",
  names: [
    {
      name: "ATORVASTATIN CALCIUM",
      type: "cn",
      preferred: true,
      stdName: "atorvastatin calcium",
      languages: ["EN"],
      domains: ["name_type:cn"],
      name_orgs: [{ name_org: "United States Pharmacopeia", uuid: "org-1" }],
    },
  ],
  codes: [{ code: "E3986RS5NQ", code_system: "UNII", type: "PRIMARY" }],
  references: [{ citation: "SPL submission", doc_type: "public-domain" }],
  relationships: [
    {
      type: "active-moiety",
      related_substance: { name: "ATORVASTATIN", unii: "K4MIA10C8L" },
    },
  ],
  structure: { formula: "C66H68CaF2N4O10", stereochemistry: "undefined" },
};
expect(substance.names?.[0]?.name_orgs?.[0]?.name_org).toContain(
  "Pharmacopeia",
);
expect(substance.codes?.[0]?.code_system).toBe("UNII");
expect(substance.relationships?.[0]?.related_substance?.unii).toBe(
  "K4MIA10C8L",
);

// A realistic other/unii crosswalk record.
const unii: UniiRecord = { substance_name: "ATORVASTATIN", unii: "K4MIA10C8L" };
expect(unii.substance_name).toBe("ATORVASTATIN");

test("ResultFor resolves typed paths to their models", () => {
  type Assert<TActual, TExpected> = TActual extends TExpected
    ? TExpected extends TActual
      ? true
      : never
    : never;
  const a: Assert<ResultFor<"drug/label">, DrugLabel> = true;
  const b: Assert<ResultFor<"drug/event">, DrugEvent> = true;
  const c: Assert<ResultFor<"drug/ndc">, DrugNdc> = true;
  const d: Assert<ResultFor<"food/event">, FoodEvent> = true;
  const e: Assert<ResultFor<"cosmetic/event">, CosmeticEvent> = true;
  const f: Assert<ResultFor<"other/substance">, Substance> = true;
  const g: Assert<ResultFor<"other/unii">, UniiRecord> = true;
  const h: Assert<ResultFor<"drug/shortages">, DrugShortage> = true;
  const i: Assert<ResultFor<"drug/orangebook">, DrugOrangeBook> = true;
  expect([a, b, c, d, e, f, g, h, i]).toEqual([
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
  ]);
});

test("ResultFor falls back to a generic record for untyped paths", () => {
  const generic: ResultFor<"device/udi"> = { whatever: "field", n: 1 };
  expect(Object.keys(generic)).toContain("whatever");
  // And a caller can override the fallback with their own model:
  interface DeviceUdi {
    deviceIdentifier?: string;
  }
  const overridden: ResultFor<"device/udi"> & DeviceUdi = {
    deviceIdentifier: "abc",
  };
  expect(overridden.deviceIdentifier).toBe("abc");
});
