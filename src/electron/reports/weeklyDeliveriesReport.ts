import type {
  WeeklyDeliveriesBottledSection,
  WeeklyDeliveriesLooseRow,
  WeeklyDeliveriesLooseSection,
  WeeklyDeliveriesMiscSection,
  WeeklyDeliveriesReport,
  WeeklyDeliveriesWeekChoice,
} from "../../shared/reports.types.js";
import { loadReportCompanySettings, loadReportDisplaySettings, loadReportComments } from "./companySettings.js";
import { resolveReportAsAt } from "../financialYears/service.js";
import {
  PALM_OIL_KG_PER_LITRE,
  detectBottledPack,
  loadProducts,
  loadSalesPoints,
  nowIso,
  parseQty,
  sum,
  type ProductRow,
  type SalesPointRow,
} from "./shared.js";
import { getDatabase } from "../db/index.js";

const LOOSE_CATEGORY_ROWS = [
  { id: "industries", label: "INDUSTRIES" },
  { id: "wholesales", label: "WHOLESALES" },
  { id: "retail", label: "RETAIL" },
  { id: "ration", label: "CDC WORKERS (RATION)" },
] as const;

const BOTTLED_DELIVERY_COLUMNS = [
  { id: "carton15", label: "1X15L CTN", litresPerUnit: 15 },
  { id: "carton5", label: "3X5L CTN", litresPerUnit: 15 },
  { id: "jug20", label: "1X20L JUG", litresPerUnit: 20 },
] as const;

const MISC_SECTION_TITLE = "3) OTHER PRODUCTS / PKO";

interface SaleLineRecord {
  salesPointId: number | null;
  saleDisposition: string | null;
  customerTypeCode: string;
  customerTypeName: string;
  productId: number;
  productName: string;
  isMain: number;
  isBottled: number;
  qtyKg: number;
  qtyUnits: number | null;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Local calendar date (avoids UTC shift from Date.toISOString). */
function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function parseLocalIso(iso: string): Date {
  return startOfDay(new Date(`${iso.slice(0, 10)}T00:00:00`));
}

function mondayOf(date: Date): Date {
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  return startOfDay(monday);
}

function minIso(a: string, b: string): string {
  return a <= b ? a : b;
}

function maxIso(a: string, b: string): string {
  return a >= b ? a : b;
}

function formatWeekLabel(weekFromIso: string, weekToIso: string): string {
  const from = parseLocalIso(weekFromIso);
  const to = parseLocalIso(weekToIso);
  const fromDay = from.getDate();
  const toDay = to.getDate();
  const monthShort = to.toLocaleDateString("en-GB", { month: "short" });
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${fromDay}–${toDay} ${monthShort}`;
  }
  const fromMonth = from.toLocaleDateString("en-GB", { month: "short" });
  return `${fromDay} ${fromMonth} – ${toDay} ${monthShort}`;
}

function resolveLooseCategoryId(
  saleDisposition: string | null,
  customerTypeCode: string,
  customerTypeName: string,
): (typeof LOOSE_CATEGORY_ROWS)[number]["id"] {
  if (saleDisposition === "RATION") {
    return "ration";
  }

  const text = `${customerTypeCode} ${customerTypeName}`.toUpperCase();
  if (text.includes("WHOLESALE")) {
    return "wholesales";
  }
  if (text.includes("RETAIL")) {
    return "retail";
  }
  if (text.includes("INDUSTR")) {
    return "industries";
  }
  return "ration";
}

function loadSaleLines(weekFromIso: string, weekToIso: string): SaleLineRecord[] {
  return getDatabase()
    .prepare(
      `SELECT s.salesPointId, s.saleDisposition, ct.code AS customerTypeCode, ct.name AS customerTypeName,
              sl.productId, p.productName, COALESCE(pc.isMain, 0) AS isMain,
              COALESCE(pc.isBottled, 0) AS isBottled, sl.qtyKg, sl.qtyUnits
       FROM Sale s
       INNER JOIN SaleLine sl ON sl.saleId = s.id
       INNER JOIN Product p ON p.productId = sl.productId
       LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
       LEFT JOIN Customer c ON c.id = s.customerId
       LEFT JOIN CustomerTypeDefinition ct ON ct.id = c.customerTypeId
       WHERE s.status = 'VALIDATED'
         AND s.dateIssued >= ?
         AND s.dateIssued <= ?`,
    )
    .all(weekFromIso, weekToIso)
    .map((row) => ({
      salesPointId: (row as { salesPointId: number | null }).salesPointId,
      saleDisposition: (row as { saleDisposition: string | null }).saleDisposition,
      customerTypeCode: String((row as { customerTypeCode: string | null }).customerTypeCode ?? ""),
      customerTypeName: String((row as { customerTypeName: string | null }).customerTypeName ?? ""),
      productId: (row as { productId: number }).productId,
      productName: String((row as { productName: string }).productName),
      isMain: (row as { isMain: number }).isMain,
      isBottled: (row as { isBottled: number }).isBottled,
      qtyKg: parseQty((row as { qtyKg: string }).qtyKg),
      qtyUnits: (row as { qtyUnits: string | null }).qtyUnits
        ? parseQty((row as { qtyUnits: string }).qtyUnits)
        : null,
    }));
}

function looseLineKg(line: SaleLineRecord): number {
  return line.qtyKg;
}

function bottledLineUnits(line: SaleLineRecord): number {
  return line.qtyUnits ?? line.qtyKg;
}

function buildLooseSection(
  salesPoints: SalesPointRow[],
  saleLines: SaleLineRecord[],
  hideZero: boolean,
): WeeklyDeliveriesLooseSection {
  const salesPointNames = salesPoints.map((salesPoint) => salesPoint.name.toUpperCase());
  const looseLines = saleLines.filter((line) => line.isBottled !== 1 && line.isMain === 1);

  const dataRows: WeeklyDeliveriesLooseRow[] = LOOSE_CATEGORY_ROWS.map((category) => {
    const quantities = salesPoints.map((salesPoint) =>
      sum(
        looseLines
          .filter((line) => {
            if (line.salesPointId !== salesPoint.id) {
              return false;
            }
            return (
              resolveLooseCategoryId(
                line.saleDisposition,
                line.customerTypeCode,
                line.customerTypeName,
              ) === category.id
            );
          })
          .map((line) => looseLineKg(line)),
      ),
    );

    return {
      label: category.label,
      quantities,
      rowTotal: sum(quantities),
      kind: "data" as const,
    };
  }).filter((row) => !hideZero || Math.abs(row.rowTotal) > 0.0001);

  const columnTotals = salesPoints.map((_, salesPointIndex) =>
    sum(dataRows.map((row) => row.quantities[salesPointIndex] ?? 0)),
  );

  const rows: WeeklyDeliveriesLooseRow[] = [
    ...dataRows,
    {
      label: "TOTAL",
      quantities: columnTotals,
      rowTotal: sum(columnTotals),
      kind: "total",
    },
  ];

  return {
    title: "1) LOOSE PALM OIL",
    salesPointNames,
    rows,
  };
}

function buildBottledSection(
  saleLines: SaleLineRecord[],
  products: ProductRow[],
): WeeklyDeliveriesBottledSection {
  const bottledProducts = products.filter((product) => product.isBottled === 1);
  const productPackById = new Map(
    bottledProducts.map((product) => [product.productId, detectBottledPack(product).id]),
  );
  const bottledLines = saleLines.filter((line) => line.isBottled === 1);

  const unitCounts = BOTTLED_DELIVERY_COLUMNS.map((column) => {
    return sum(
      bottledLines
        .filter((line) => productPackById.get(line.productId) === column.id)
        .map((line) => bottledLineUnits(line)),
    );
  });

  const litres = BOTTLED_DELIVERY_COLUMNS.map(
    (column, index) => unitCounts[index] * column.litresPerUnit,
  );
  const kgs = litres.map((litre) => litre * PALM_OIL_KG_PER_LITRE);
  const totalUnits = sum(unitCounts);
  const totalKgs = sum(kgs);

  return {
    title: "2) BOTTLED PALM OIL",
    columns: BOTTLED_DELIVERY_COLUMNS.map(({ id, label, litresPerUnit }) => ({
      id,
      label,
      litresPerUnit,
    })),
    unitCounts,
    litres,
    kgs,
    totalUnits,
    totalKgs,
  };
}

function buildMiscSection(
  saleLines: SaleLineRecord[],
  products: ProductRow[],
  hideZero: boolean,
): WeeklyDeliveriesMiscSection {
  const miscProducts = products.filter((product) => product.isBottled !== 1 && product.isMain !== 1);
  const miscLines = saleLines.filter((line) => line.isBottled !== 1 && line.isMain !== 1);

  const rows = miscProducts
    .map((product) => ({
      label: product.productName.toUpperCase(),
      quantityKg: sum(
        miscLines.filter((line) => line.productId === product.productId).map((line) => looseLineKg(line)),
      ),
    }))
    .filter((row) => !hideZero || row.quantityKg > 0)
    .sort((left, right) => left.label.localeCompare(right.label));

  return {
    title: MISC_SECTION_TITLE,
    rows,
  };
}

/** Mondays of weeks that overlap the open month up to as-at. */
function buildWeekChoices(
  monthStart: string,
  monthEnd: string,
  asAtIso: string,
): WeeklyDeliveriesWeekChoice[] {
  const hardEnd = minIso(monthEnd, asAtIso);
  if (hardEnd < monthStart) {
    return [];
  }

  const firstMonday = mondayOf(parseLocalIso(monthStart));
  const cursor = new Date(firstMonday);
  const choices: WeeklyDeliveriesWeekChoice[] = [];

  while (toIsoDate(cursor) <= hardEnd) {
    const mondayIso = toIsoDate(cursor);
    const sunday = new Date(cursor);
    sunday.setDate(cursor.getDate() + 6);
    const sundayIso = toIsoDate(sunday);

    const weekFromIso = maxIso(mondayIso, monthStart);
    const weekToIso = minIso(sundayIso, hardEnd);

    if (weekFromIso <= weekToIso) {
      choices.push({
        weekMondayIso: mondayIso,
        weekFromIso,
        weekToIso,
        label: formatWeekLabel(weekFromIso, weekToIso),
      });
    }

    cursor.setDate(cursor.getDate() + 7);
  }

  return choices;
}

function resolveSelectedWeek(
  choices: WeeklyDeliveriesWeekChoice[],
  asAtIso: string,
  requestedMondayIso: string | null | undefined,
): WeeklyDeliveriesWeekChoice | null {
  if (choices.length === 0) {
    return null;
  }

  if (requestedMondayIso) {
    const match = choices.find((choice) => choice.weekMondayIso === requestedMondayIso.slice(0, 10));
    if (match) {
      return match;
    }
  }

  const asAtMonday = toIsoDate(mondayOf(parseLocalIso(asAtIso)));
  return (
    choices.find((choice) => choice.weekMondayIso === asAtMonday) ??
    choices[choices.length - 1] ??
    null
  );
}

export function getWeeklyDeliveriesReport(
  userId?: string | null,
  weekMondayIso?: string | null,
): WeeklyDeliveriesReport {
  const settings = loadReportCompanySettings(userId);
  const { hideZeroReportRows: hideZero } = loadReportDisplaySettings();
  const salesPoints = loadSalesPoints();
  const products = loadProducts();

  const { asAtIso, period } = resolveReportAsAt();
  const weekChoices = buildWeekChoices(period.startDate, period.endDate, asAtIso);
  const selected =
    resolveSelectedWeek(weekChoices, asAtIso, weekMondayIso) ??
    (() => {
      const monday = mondayOf(parseLocalIso(asAtIso));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const weekFromIso = maxIso(toIsoDate(monday), period.startDate);
      const weekToIso = minIso(toIsoDate(sunday), asAtIso);
      return {
        weekMondayIso: toIsoDate(monday),
        weekFromIso,
        weekToIso,
        label: formatWeekLabel(weekFromIso, weekToIso),
      } satisfies WeeklyDeliveriesWeekChoice;
    })();

  const saleLines = loadSaleLines(selected.weekFromIso, selected.weekToIso);

  return {
    settings,
    asAtIso,
    weekMondayIso: selected.weekMondayIso,
    weekFromIso: selected.weekFromIso,
    weekToIso: selected.weekToIso,
    weekChoices,
    generatedAtIso: nowIso(),
    looseSection: buildLooseSection(salesPoints, saleLines, hideZero),
    bottledSection: buildBottledSection(saleLines, products),
    miscSection: buildMiscSection(saleLines, products, hideZero),
    comments: loadReportComments("sales-delivery-report"),
  };
}
