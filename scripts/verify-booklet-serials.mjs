import { app } from "electron";
import { closeDatabase, initDatabase } from "../dist-electron/electron/db/index.js";
import {
  getOpenPostingPeriod,
} from "../dist-electron/electron/financialYears/service.js";
import {
  loadDeliveryOrderByNo,
  saveDeliveryOrder,
} from "../dist-electron/electron/deliveryOrders/service.js";
import {
  createSale,
  getSalesFormOptions,
  loadSaleByInvoiceNo,
} from "../dist-electron/electron/sales/service.js";
import { validateBookletSerial } from "../dist-electron/shared/bookletSerial.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

app.whenReady().then(() => {
  initDatabase();
  const options = getSalesFormOptions();
  const period = getOpenPostingPeriod();

  assert(validateBookletSerial("12345").ok, "digits-only serial should pass");
  assert(!validateBookletSerial("abc").ok, "letters should fail");
  assert(!validateBookletSerial("").ok, "empty should fail");
  assert(validateBookletSerial(" 000123 ").serial === "000123", "trim and keep leading zeros");

  const legacyDo = loadDeliveryOrderByNo("DO-2026-000001");
  assert(legacyDo != null, "legacy DO lookup should work");

  const legacyInvoice = loadSaleByInvoiceNo("INV-2026-000001");
  console.log("legacy invoice lookup", legacyInvoice?.invoiceNo ?? "not found");

  if (!period) {
    console.log("skipped create tests: no open financial month");
    console.log("booklet serial verification passed");
    closeDatabase();
    app.quit();
    return;
  }

  const dateIssued = period.startDate;

  const serialSuffix = String(Date.now()).slice(-6);
  const doSerial = `1${serialSuffix}`;
  const invoiceSerial = `2${serialSuffix}`;

  const doResult = saveDeliveryOrder({
    userId: "seed-admin-001",
    deliveryOrderNo: doSerial,
    customerId: options.customers[0].id,
    dateIssued,
    salesPointId: options.salesPoints[0].id,
    lines: [
      {
        productId: options.looseProducts[0].productId,
        orderQty: "10",
      },
    ],
    payments: [],
  });
  assert(doResult.ok, `create DO: ${doResult.ok ? doResult.deliveryOrderNo : doResult.error}`);
  assert(
    loadDeliveryOrderByNo(doSerial) != null,
    "load DO by booklet serial should work",
  );

  const dupDo = saveDeliveryOrder({
    userId: "seed-admin-001",
    deliveryOrderNo: doSerial,
    customerId: options.customers[0].id,
    dateIssued,
    salesPointId: options.salesPoints[0].id,
    lines: [
      {
        productId: options.looseProducts[0].productId,
        orderQty: "5",
      },
    ],
    payments: [],
  });
  assert(!dupDo.ok && dupDo.error.includes("already used"), "duplicate DO should fail");

  const product = options.looseProducts[0];
  const net = 10 * 500;
  const vat = Math.round(net * parseFloat(options.vatRateDecimal));
  const salesTax = Math.round(net * (options.customers[0].salesTaxRate ?? 0));
  const gross = net + vat + salesTax;

  const saleResult = createSale({
    userId: "seed-admin-001",
    invoiceNo: invoiceSerial,
    customerId: options.customers[0].id,
    salesPointId: options.salesPoints[0]?.id ?? null,
    vehicleNumber: "LT-1234-A",
    dateIssued,
    lines: [
      {
        productId: product.productId,
        qtyKg: "10",
        unitPricePerKg: "500",
        storageLocationId: options.storageLocations[0]?.id ?? null,
      },
    ],
    payments: [
      {
        paymentMethodId: options.paymentMethods[0].id,
        amount: String(gross),
      },
    ],
  });
  assert(
    saleResult.ok,
    `create invoice: ${saleResult.ok ? saleResult.invoiceNo : saleResult.error}`,
  );
  assert(loadSaleByInvoiceNo(invoiceSerial) != null, "load invoice by booklet serial should work");

  console.log("booklet serial verification passed");
  closeDatabase();
  app.quit();
});
