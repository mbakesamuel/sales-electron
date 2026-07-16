import { app } from "electron";
import { closeDatabase, getDatabase, initDatabase } from "../dist-electron/electron/db/index.js";

app.whenReady().then(() => {
  initDatabase();
  const db = getDatabase();

  const tables = db
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table'
         AND name NOT LIKE 'sqlite_%'
         AND name != 'schema_migrations'
       ORDER BY name`,
    )
    .all();

  console.log("tableCount", tables.length);
  console.log(JSON.stringify(tables.map((row) => row.name), null, 2));

  closeDatabase();
  app.quit();
});
