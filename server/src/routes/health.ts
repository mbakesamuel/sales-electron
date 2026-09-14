import { Hono } from "hono";
import { checkDbConnection } from "../db/index.js";

export const healthRoute = new Hono();

healthRoute.get("/", async (c) => {
  const dbConnected = await checkDbConnection();
  return c.json({
    ok: dbConnected,
    version: "1.0.0",
    service: "sales-sync-server",
    serverTime: new Date().toISOString(),
    database: dbConnected ? "connected" : "disconnected",
  });
});
