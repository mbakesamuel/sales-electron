import { app } from "electron";
import { closeDatabase, initDatabase } from "../dist-electron/electron/db/index.js";
import { queryTable } from "../dist-electron/electron/db/tableQuery.js";

app.whenReady().then(() => {
  initDatabase();

  const users = queryTable({ table: "User", limit: 10, offset: 0 });
  console.log("userColumns", users.columns.join(", "));
  console.log("userRows", users.rows.length);
  console.log("passwordHidden", users.columns.includes("passwordHash") === false);

  const sales = queryTable({ table: "Sale", limit: 5, offset: 0 });
  console.log("saleTotal", sales.total);

  closeDatabase();
  app.quit();
});
