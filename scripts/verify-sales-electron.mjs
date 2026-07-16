import { app } from "electron";
import { closeDatabase, initDatabase } from "../dist-electron/electron/db/index.js";
import {
  createSale,
  getSalesFormOptions,
  listSales,
  loadSaleByInvoiceNo,
} from "../dist-electron/electron/sales/service.js";

app.whenReady().then(() => {
  initDatabase();

  const options = getSalesFormOptions();
  console.log("customers", options.customers.length);
  console.log("looseProducts", options.looseProducts.length);
  console.log("bottledProducts", options.bottledProducts.length);

  const product = options.looseProducts[0];
  if (!product) {
    console.error("No loose products in seed data.");
    closeDatabase();
    app.quit();
    return;
  }

  const net = 100 * 500;
  const vat = Math.round(net * parseFloat(options.vatRateDecimal));
  const gross = net + vat;

  const result = createSale({
    userId: "seed-admin-001",
    customerId: options.customers[0].id,
    salesPointId: options.salesPoints[0]?.id ?? null,
    vehicleNumber: "LT-1234-A",
    dateIssued: "2026-07-11",
    lines: [
      {
        productId: product.productId,
        qtyKg: "100",
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

  console.log("create", result);

  if (result.ok) {
    const loaded = loadSaleByInvoiceNo(result.invoiceNo);
    console.log("loaded", loaded?.invoiceNo, loaded?.status, loaded?.lines.length);
    const list = listSales({ period: "all" });
    console.log("listCount", list.rows.length);
  }

  closeDatabase();
  app.quit();
});
