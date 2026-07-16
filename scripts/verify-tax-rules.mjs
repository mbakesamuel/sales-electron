/**
 * Verify VAT + sales-tax rules (with rate bags).
 * Run: npm run verify:tax-rules
 */

import {
  FALLBACK_TAX_RATES,
  normalizeVatRateDecimal,
  resolveCustomerTaxProfile,
  resolveSalesTaxRate,
  resolveVatApplies,
} from "../dist-electron/shared/taxRules.js";

/** @type {Array<{ name: string; input: object; expect: object }>} */
const cases = [
  {
    name: "Domestic Actual (taxpayer ID) → VAT + 2%",
    input: {
      residency: "LOCAL",
      taxRegimeKind: "REAL",
      taxpayerId: "NIU-1",
      rates: FALLBACK_TAX_RATES,
    },
    expect: { vatApplies: true, vatRate: 0.1925, salesTaxRate: 0.02 },
  },
  {
    name: "Domestic Simplified (taxpayer ID) → VAT + 5%",
    input: {
      residency: "LOCAL",
      taxRegimeKind: "SIMPLIFIED",
      taxpayerId: "NIU-2",
      rates: FALLBACK_TAX_RATES,
    },
    expect: { vatApplies: true, vatRate: 0.1925, salesTaxRate: 0.05 },
  },
  {
    name: "Domestic no taxpayer ID → VAT + 10%",
    input: {
      residency: "LOCAL",
      taxRegimeKind: "REAL",
      taxpayerId: null,
      rates: FALLBACK_TAX_RATES,
    },
    expect: { vatApplies: true, vatRate: 0.1925, salesTaxRate: 0.1 },
  },
  {
    name: "Uses provided rates bag (not hardcodes)",
    input: {
      residency: "LOCAL",
      taxRegimeKind: "REAL",
      taxpayerId: "NIU-1",
      rates: {
        vatRate: 0.2,
        salesActual: 0.03,
        salesSimplified: 0.06,
        salesNoTaxpayer: 0.12,
      },
    },
    expect: { vatApplies: true, vatRate: 0.2, salesTaxRate: 0.03 },
  },
  {
    name: "Foreign + Simplified → no VAT + sales tax from rates",
    input: {
      residency: "OVERSEAS",
      taxRegimeKind: "SIMPLIFIED",
      taxpayerId: "NIU-3",
      rates: FALLBACK_TAX_RATES,
    },
    expect: { vatApplies: false, vatRate: 0, salesTaxRate: 0.05 },
  },
  {
    name: "Foreign + no taxpayer ID → no VAT + 10%",
    input: {
      residency: "OVERSEAS",
      taxRegimeKind: "REAL",
      taxpayerId: null,
      rates: FALLBACK_TAX_RATES,
    },
    expect: { vatApplies: false, vatRate: 0, salesTaxRate: 0.1 },
  },
];

let failed = 0;

for (const testCase of cases) {
  const actual = resolveCustomerTaxProfile(testCase.input);
  const ok =
    actual.vatApplies === testCase.expect.vatApplies &&
    Math.abs(actual.vatRate - testCase.expect.vatRate) < 1e-9 &&
    Math.abs(actual.salesTaxRate - testCase.expect.salesTaxRate) < 1e-9;

  if (!ok) {
    failed += 1;
    console.error(`FAIL: ${testCase.name}`);
    console.error("  expected", testCase.expect);
    console.error("  actual  ", {
      vatApplies: actual.vatApplies,
      vatRate: actual.vatRate,
      salesTaxRate: actual.salesTaxRate,
    });
  } else {
    console.log(`PASS: ${testCase.name}`);
  }
}

const fromPercent = normalizeVatRateDecimal("19.25");
if (Math.abs(fromPercent - 0.1925) > 1e-9) {
  failed += 1;
  console.error("FAIL: normalizeVatRateDecimal(19.25)");
} else {
  console.log("PASS: normalizeVatRateDecimal accepts percent");
}

if (!resolveVatApplies("LOCAL") || resolveVatApplies("OVERSEAS")) {
  failed += 1;
  console.error("FAIL: resolveVatApplies residency");
} else {
  console.log("PASS: resolveVatApplies residency");
}

if (
  resolveSalesTaxRate({
    taxRegimeKind: "REAL",
    taxpayerId: "x",
    rates: FALLBACK_TAX_RATES,
  }) !== 0.02
) {
  failed += 1;
  console.error("FAIL: resolveSalesTaxRate REAL");
} else {
  console.log("PASS: resolveSalesTaxRate REAL");
}

if (failed > 0) {
  console.error(`\n${failed} tax rule check(s) failed.`);
  process.exit(1);
}

console.log("\nAll tax rule checks passed.");
