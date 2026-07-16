import type {
  StockReport,
  StockReportBottledSection,
  StockReportLooseRow,
  StockReportProductMatrix,
} from "../../shared/reports.types.js";
import type { BottledPackColumn } from "../../shared/reports.types.js";
import { loadReportCompanySettings } from "./companySettings.js";
import { resolveReportAsAt } from "../financialYears/service.js";
import {
  BOTTLED_PACK_ORDER,
  PALM_OIL_KG_PER_LITRE,
  detectBottledPack,
  loadProducts,
  loadSalesPoints,
  loadStorageLocations,
  nowIso,
  parseQty,
  sum,
  type ProductRow,
  type SalesPointRow,
  type StorageLocationRow,
} from "./shared.js";
import { getDatabase } from "../db/index.js";

interface BalanceRow {
  salesPointId: number;
  storageLocationId: number;
  productId: number;
  qty: number;
}

function loadLooseStockBalances(): BalanceRow[] {
  return getDatabase()
    .prepare(
      `SELECT sb.salesPointId, sb.storageLocationId, sb.productId,
              SUM(CAST(sb.qty AS REAL)) AS qty
       FROM StockBalance sb
       INNER JOIN Product p ON p.productId = sb.productId
       LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
       WHERE COALESCE(pc.isBottled, 0) = 0
       GROUP BY sb.salesPointId, sb.storageLocationId, sb.productId`,
    )
    .all()
    .map((row) => ({
      salesPointId: (row as { salesPointId: number }).salesPointId,
      storageLocationId: (row as { storageLocationId: number }).storageLocationId,
      productId: (row as { productId: number }).productId,
      qty: parseQty((row as { qty: number }).qty),
    }));
}

function loadBottledStockBalances(): Array<{
  salesPointId: number;
  productId: number;
  qty: number;
}> {
  return getDatabase()
    .prepare(
      `SELECT sb.salesPointId, sb.productId, SUM(CAST(sb.qty AS REAL)) AS qty
       FROM StockBalance sb
       INNER JOIN Product p ON p.productId = sb.productId
       LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
       WHERE sb.condition = 'SELLABLE' AND COALESCE(pc.isBottled, 0) = 1
       GROUP BY sb.salesPointId, sb.productId`,
    )
    .all()
    .map((row) => ({
      salesPointId: (row as { salesPointId: number }).salesPointId,
      productId: (row as { productId: number }).productId,
      qty: parseQty((row as { qty: number }).qty),
    }));
}

function qtyForLooseAtLocation(
  balances: BalanceRow[],
  salesPointId: number,
  storageLocationId: number,
): number {
  return sum(
    balances
      .filter(
        (row) =>
          row.salesPointId === salesPointId && row.storageLocationId === storageLocationId,
      )
      .map((row) => row.qty),
  );
}

function remarksForLooseAtLocation(
  balances: BalanceRow[],
  products: ProductRow[],
  salesPointId: number,
  storageLocationId: number,
): string | null {
  const productNames = balances
    .filter(
      (row) =>
        row.salesPointId === salesPointId &&
        row.storageLocationId === storageLocationId &&
        row.qty > 0,
    )
    .map((row) => products.find((product) => product.productId === row.productId)?.productName)
    .filter((name): name is string => Boolean(name));

  if (productNames.length === 0) {
    return null;
  }

  return [...new Set(productNames)].join(", ").toUpperCase();
}

function buildLooseRows(
  salesPoints: SalesPointRow[],
  storageLocations: StorageLocationRow[],
  balances: BalanceRow[],
  products: ProductRow[],
): StockReportLooseRow[] {
  const rows: StockReportLooseRow[] = [];
  let grandTotal = 0;

  for (const salesPoint of salesPoints) {
    const locations = storageLocations.filter(
      (location) => location.salesPointId === salesPoint.id,
    );
    const dataRows: StockReportLooseRow[] = [];

    for (const [index, location] of locations.entries()) {
      const quantityKg = qtyForLooseAtLocation(balances, salesPoint.id, location.id);
      dataRows.push({
        salesPointName: index === 0 ? salesPoint.name.toUpperCase() : null,
        storageName: location.name.toUpperCase(),
        quantityKg,
        remarks: remarksForLooseAtLocation(balances, products, salesPoint.id, location.id),
        kind: "data",
      });
    }

    if (locations.length === 0) {
      dataRows.push({
        salesPointName: salesPoint.name.toUpperCase(),
        storageName: null,
        quantityKg: 0,
        remarks: null,
        kind: "data",
      });
    }

    const subtotal = sum(dataRows.map((row) => row.quantityKg));
    grandTotal += subtotal;

    rows.push(...dataRows);
    rows.push({
      salesPointName: null,
      storageName: "SUB TOTAL",
      quantityKg: subtotal,
      remarks: null,
      kind: "subtotal",
    });
  }

  rows.push({
    salesPointName: null,
    storageName: "GRAND TOTAL",
    quantityKg: grandTotal,
    remarks: null,
    kind: "grand_total",
  });

  return rows;
}

function buildBottledSection(
  salesPoints: SalesPointRow[],
  products: ProductRow[],
  balances: Array<{ salesPointId: number; productId: number; qty: number }>,
): StockReportBottledSection | null {
  const bottledProducts = products.filter((product) => product.isBottled === 1);
  if (bottledProducts.length === 0) {
    return null;
  }

  const columnMap = new Map<string, BottledPackColumn>();
  for (const product of bottledProducts) {
    const pack = detectBottledPack(product);
    if (!columnMap.has(pack.id)) {
      columnMap.set(pack.id, { ...pack, units: 0 });
    }
  }

  const columns = BOTTLED_PACK_ORDER.filter((packId) => columnMap.has(packId)).map(
    (packId) => columnMap.get(packId)!,
  );
  if (columns.length === 0) {
    return null;
  }

  const rows = salesPoints.map((salesPoint) => {
    const unitCounts = columns.map((column) => {
      const matchingProducts = bottledProducts.filter(
        (product) => detectBottledPack(product).id === column.id,
      );
      return sum(
        matchingProducts.map((product) => {
          const row = balances.find(
            (balance) =>
              balance.salesPointId === salesPoint.id && balance.productId === product.productId,
          );
          return row?.qty ?? 0;
        }),
      );
    });

    return {
      salesPointName: salesPoint.name.toUpperCase(),
      unitCounts,
    };
  });

  const columnTotals = columns.map((_, columnIndex) =>
    sum(rows.map((row) => row.unitCounts[columnIndex])),
  );
  const litres = columns.map((column, index) => columnTotals[index] * column.litresPerUnit);
  const kgs = litres.map((litre) => litre * PALM_OIL_KG_PER_LITRE);
  const totalKgs = sum(kgs);

  const bottledCategory = getDatabase()
    .prepare(
      `SELECT productCat FROM ProductCat WHERE isBottled = 1 ORDER BY productCatId ASC LIMIT 1`,
    )
    .get() as { productCat: string } | undefined;

  return {
    title: (bottledCategory?.productCat ?? "Bottled palm oil").toUpperCase(),
    columns,
    rows,
    columnTotals,
    litres,
    kgs,
    totalKgs,
  };
}

function buildOtherProductsSection(
  salesPoints: SalesPointRow[],
  products: ProductRow[],
  balances: BalanceRow[],
): StockReportProductMatrix | null {
  const otherProducts = products.filter(
    (product) => product.isBottled !== 1 && product.isMain !== 1,
  );
  if (otherProducts.length === 0) {
    return null;
  }

  const rows = otherProducts.map((product) => ({
    productName: product.productName.toUpperCase(),
    quantities: salesPoints.map((salesPoint) =>
      sum(
        balances
          .filter(
            (balance) =>
              balance.productId === product.productId && balance.salesPointId === salesPoint.id,
          )
          .map((balance) => balance.qty),
      ),
    ),
  }));

  const totals = salesPoints.map((_, salesPointIndex) =>
    sum(rows.map((row) => row.quantities[salesPointIndex])),
  );

  return {
    title: "OTHER PRODUCTS",
    salesPointNames: salesPoints.map((salesPoint) => salesPoint.name.toUpperCase()),
    rows,
    totals,
  };
}

export function getStockReport(userId?: string | null): StockReport {
  const settings = loadReportCompanySettings(userId);
  const salesPoints = loadSalesPoints();
  const storageLocations = loadStorageLocations();
  const products = loadProducts();
  const looseBalances = loadLooseStockBalances();
  const bottledBalances = loadBottledStockBalances();

  const { asAtIso } = resolveReportAsAt();

  return {
    settings,
    asAtIso,
    generatedAtIso: nowIso(),
    looseRows: buildLooseRows(salesPoints, storageLocations, looseBalances, products),
    bottledSection: buildBottledSection(salesPoints, products, bottledBalances),
    otherProductsSection: buildOtherProductsSection(salesPoints, products, looseBalances),
  };
}
