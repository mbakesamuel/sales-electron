import { app } from "electron";
import { closeDatabase, initDatabase } from "../dist-electron/electron/db/index.js";
import {
  deleteRow,
  insertRow,
  updateRow,
} from "../dist-electron/electron/db/tableMutations.js";

app.whenReady().then(() => {
  initDatabase();

  const inserted = insertRow({
    table: "SalesPoint",
    values: { name: `Test Sales Point ${Date.now()}` },
  });
  console.log("insertOk", inserted.id, inserted.name);

  const updated = updateRow({
    table: "SalesPoint",
    primaryKey: { id: inserted.id },
    values: { name: `${inserted.name} Updated` },
  });
  console.log("updateOk", updated.name);

  deleteRow({
    table: "SalesPoint",
    primaryKey: { id: inserted.id },
  });
  console.log("deleteOk");

  closeDatabase();
  app.quit();
});
