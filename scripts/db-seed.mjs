import { app } from "electron";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeDatabase, getDatabase, initDatabase } from "../dist-electron/electron/db/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedDir = path.join(__dirname, "seed");

function listSeedFiles() {
  return readdirSync(seedDir)
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

app.whenReady().then(() => {
  initDatabase();
  const db = getDatabase();

  const files = listSeedFiles();
  console.log(`Applying ${files.length} seed file(s) from ${seedDir}`);

  const applyAll = db.transaction(() => {
    for (const fileName of files) {
      const sql = readFileSync(path.join(seedDir, fileName), "utf8").trim();
      if (!sql) {
        continue;
      }

      console.log(`-> ${fileName}`);
      db.exec(sql);
    }
  });

  applyAll();
  console.log("Seed complete.");

  closeDatabase();
  app.quit();
});
