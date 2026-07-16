import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dbPath = path.join(
  process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"),
  "sales-electron",
  "sales.db",
);

function removeIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`Deleted: ${filePath}`);
  }
}

try {
  removeIfExists(dbPath);
  removeIfExists(`${dbPath}-wal`);
  removeIfExists(`${dbPath}-shm`);
  if (!fs.existsSync(dbPath)) {
    console.log("Database reset complete.");
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    `Could not delete database (close the Electron app first): ${message}`,
  );
  process.exit(1);
}
