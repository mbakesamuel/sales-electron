import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import dotenv from "dotenv";
import { healthRoute } from "./routes/health.js";
import { syncRoute } from "./routes/sync.js";

dotenv.config();

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

// Routes
app.route("/api/health", healthRoute);
app.route("/api/sync", syncRoute);

app.get("/", (c) => {
  return c.json({
    name: "Sales Central PostgreSQL Sync API",
    version: "1.0.0",
    docs: "/api/health",
  });
});

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || "0.0.0.0";

console.log(`Starting Hono sync server on http://${host}:${port}...`);

serve(
  {
    fetch: app.fetch,
    port,
    hostname: host,
  },
  (info) => {
    console.log(`Sales Central API listening at http://${info.address}:${info.port}`);
  },
);
