import { ipcMain } from "electron";
import type {
  CreateSaleInput,
  DeliveryOrderLookupResult,
  LoadedSaleView,
  PendingSaleRow,
  SalesFormOptions,
  SalesListFilters,
  SalesListResult,
  SaveSaleResult,
  SaleMutationResult,
  SalePrintPayload,
  AvailableDeliveryOrderRow,
  UnitPricePreviewResult,
} from "../../shared/sales.types.js";
import type { TaxRatesBag } from "../../shared/taxRules.js";
import {
  listAvailableDeliveryOrders,
  lookupDeliveryOrder,
} from "../sales/deliveryOrders.js";
import { loadSalePrintById } from "../sales/print.js";
import {
  createSale,
  deleteSale,
  getSalesFormOptions,
  listPendingSales,
  listSales,
  loadSaleByInvoiceNo,
  previewSaleUnitPrice,
  validateSale,
} from "../sales/service.js";
import { loadTaxRatesAsOf } from "../tax/resolveRates.js";

export function registerSalesHandlers(): void {
  ipcMain.handle("sales:getFormOptions", (): SalesFormOptions => {
    return getSalesFormOptions();
  });

  ipcMain.handle(
    "sales:getTaxRatesAsOf",
    (_event, asOfDate: string): TaxRatesBag => {
      return loadTaxRatesAsOf(
        typeof asOfDate === "string" ? asOfDate : undefined,
      );
    },
  );

  ipcMain.handle(
    "sales:listSales",
    (_event, filters: SalesListFilters): SalesListResult => {
      return listSales(filters ?? {});
    },
  );

  ipcMain.handle("sales:listPendingSales", (): PendingSaleRow[] => {
    return listPendingSales();
  });

  ipcMain.handle(
    "sales:loadSaleByInvoiceNo",
    (_event, invoiceNo: string): LoadedSaleView | null => {
      if (typeof invoiceNo !== "string") {
        return null;
      }

      return loadSaleByInvoiceNo(invoiceNo);
    },
  );

  ipcMain.handle(
    "sales:createSale",
    (_event, input: CreateSaleInput): SaveSaleResult => {
      if (!input || typeof input.userId !== "string") {
        return { ok: false, error: "Login required." };
      }

      return createSale(input);
    },
  );

  ipcMain.handle(
    "sales:validateSale",
    (_event, payload: { saleId: string; userId: string }): SaleMutationResult => {
      if (!payload?.saleId || !payload.userId) {
        return { ok: false, error: "Invalid request." };
      }

      return validateSale(payload.saleId, payload.userId);
    },
  );

  ipcMain.handle(
    "sales:deleteSale",
    (_event, payload: { saleId: string; userId: string }): SaleMutationResult => {
      if (!payload?.saleId || !payload?.userId) {
        return { ok: false, error: "Invalid request." };
      }

      return deleteSale(payload.saleId, payload.userId);
    },
  );

  ipcMain.handle(
    "sales:listAvailableDeliveryOrders",
    (
      _event,
      payload: { salesPointId: number; customerId: number },
    ): AvailableDeliveryOrderRow[] => {
      if (
        typeof payload?.salesPointId !== "number" ||
        typeof payload?.customerId !== "number"
      ) {
        return [];
      }

      return listAvailableDeliveryOrders(payload.salesPointId, payload.customerId);
    },
  );

  ipcMain.handle(
    "sales:lookupDeliveryOrder",
    (
      _event,
      payload: { deliveryOrderNo: string; salesPointId: number; customerId: string },
    ): DeliveryOrderLookupResult | null => {
      if (!payload?.deliveryOrderNo || typeof payload.salesPointId !== "number") {
        return null;
      }

      return lookupDeliveryOrder(
        payload.deliveryOrderNo,
        payload.salesPointId,
        payload.customerId ?? "",
      );
    },
  );

  ipcMain.handle(
    "sales:loadSalePrintById",
    (_event, saleId: string): SalePrintPayload | null => {
      if (typeof saleId !== "string") {
        return null;
      }

      return loadSalePrintById(saleId);
    },
  );

  ipcMain.handle(
    "sales:previewUnitPrice",
    (
      _event,
      payload: { productId: number; asOfDate: string; customerId?: number | null },
    ): UnitPricePreviewResult => {
      if (!payload || typeof payload.productId !== "number") {
        return { ok: false, error: "Product is required." };
      }

      return previewSaleUnitPrice(payload);
    },
  );
}
