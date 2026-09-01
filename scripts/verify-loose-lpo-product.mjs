/**
 * Verify loose LPO product classification (operations vs report bucketing).
 * Run: npm run verify:loose-lpo-product
 */

import {
  isLooseLpoProduct,
  isLooseLpoReportProduct,
  isSludgePoolReportProduct,
  LOOSE_LPO_PRODUCT_CODE,
} from "../dist-electron/shared/looseLpoProduct.js";

/** @type {Array<{ name: string; input: object; expect: boolean }>} */
const operationalCases = [
  {
    name: "LPO code",
    input: { productCode: "LPO", productName: "Loose Palm Oil", isBottled: 0 },
    expect: true,
  },
  {
    name: "LPO code lowercase",
    input: { productCode: "lpo", productName: "Loose Palm Oil", isBottled: 0 },
    expect: true,
  },
  {
    name: "legacy name only",
    input: { productCode: null, productName: "Loose Palm Oil", isBottled: 0 },
    expect: true,
  },
  {
    name: "sludge grade B",
    input: {
      productCode: "PSB",
      productName: "Palm Sludge Oil Grade B",
      isBottled: 0,
    },
    expect: false,
  },
  {
    name: "bottom tank grade A",
    input: {
      productCode: "BTA",
      productName: "Bottom Tank Oil Grade A",
      isBottled: 0,
    },
    expect: false,
  },
  {
    name: "bottled LPO code",
    input: { productCode: LOOSE_LPO_PRODUCT_CODE, productName: "Loose Palm Oil", isBottled: 1 },
    expect: false,
  },
  {
    name: "main category sludge without LPO code",
    input: {
      productCode: null,
      productName: "Palm Sludge Oil Grade C",
      isBottled: 0,
    },
    expect: false,
  },
];

/** @type {Array<{ name: string; input: object; expect: boolean }>} */
const reportCases = [
  {
    name: "LPO code",
    input: { productCode: "LPO", productName: "Loose Palm Oil", isBottled: 0 },
    expect: true,
  },
  {
    name: "sludge grade B",
    input: {
      productCode: "PSB",
      productName: "Palm Sludge Oil Grade B",
      isBottled: 0,
    },
    expect: true,
  },
  {
    name: "bottom tank grade A",
    input: {
      productCode: "BTA",
      productName: "Bottom Tank Oil Grade A",
      isBottled: 0,
    },
    expect: true,
  },
  {
    name: "sludge grade C",
    input: {
      productCode: null,
      productName: "Palm Sludge Oil Grade C",
      isBottled: 0,
    },
    expect: true,
  },
  {
    name: "sludge pool",
    input: { productCode: "SLU", productName: "Sludge Oil", isBottled: 0 },
    expect: false,
  },
  {
    name: "bottled sludge grade",
    input: {
      productCode: "PSB",
      productName: "Palm Sludge Oil Grade B",
      isBottled: 1,
    },
    expect: false,
  },
];

/** @type {Array<{ name: string; input: object; expect: boolean }>} */
const poolCases = [
  {
    name: "sludge pool",
    input: { productCode: "SLU", productName: "Sludge Oil", isBottled: 0 },
    expect: true,
  },
  {
    name: "sludge member not pool",
    input: {
      productCode: "PSB",
      productName: "Palm Sludge Oil Grade B",
      isBottled: 0,
    },
    expect: false,
  },
];

let failed = 0;

function runSuite(label, cases, fn) {
  for (const testCase of cases) {
    const actual = fn(testCase.input);
    if (actual !== testCase.expect) {
      console.error(
        `FAIL [${label}] ${testCase.name} — expected ${testCase.expect}, got ${actual}`,
      );
      failed += 1;
    } else {
      console.log(`ok [${label}]: ${testCase.name}`);
    }
  }
}

runSuite("operational", operationalCases, isLooseLpoProduct);
runSuite("report", reportCases, isLooseLpoReportProduct);
runSuite("pool", poolCases, isSludgePoolReportProduct);

if (failed > 0) {
  console.error(`${failed} case(s) failed.`);
  process.exit(1);
}

const total =
  operationalCases.length + reportCases.length + poolCases.length;
console.log(`All ${total} loose LPO classification checks passed.`);
