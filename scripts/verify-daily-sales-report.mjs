import { app } from "electron";
import { closeDatabase, initDatabase } from "../dist-electron/electron/db/index.js";
import { getDailySalesReport } from "../dist-electron/electron/reports/dailySalesReport.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

app.whenReady().then(() => {
  initDatabase();

  const today = new Date().toISOString().slice(0, 10);
  const allReport = getDailySalesReport("seed-admin-001", today, null);
  assert(Array.isArray(allReport.sections), "sections should be an array");
  assert(allReport.salesPointLabel === "ALL SALES POINTS", "all label");
  assert(allReport.summaryRows.length === 5, "summary rows");
  assert(allReport.salesPointOptions.length >= 0, "sales point options");

  if (allReport.salesPointOptions.length > 0) {
    const pointId = allReport.salesPointOptions[0].id;
    const pointReport = getDailySalesReport("seed-admin-001", today, pointId);
    assert(
      pointReport.salesPointLabel === allReport.salesPointOptions[0].name,
      "point label",
    );
  }

  const invalid = (() => {
    try {
      getDailySalesReport("seed-admin-001", "bad-date", null);
      return false;
    } catch {
      return true;
    }
  })();
  assert(invalid, "invalid date should throw");

  console.log("daily sales report verification passed");
  closeDatabase();
  app.quit();
});
