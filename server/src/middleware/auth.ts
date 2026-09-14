import type { Context, Next } from "hono";
import { sql } from "../db/index.js";

export interface AuthenticatedDevice {
  id: string;
  name: string;
  salesPointId?: number | null;
}

declare module "hono" {
  interface ContextVariableMap {
    device: AuthenticatedDevice;
  }
}

export async function deviceAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  const masterSecret = process.env.API_SECRET_KEY;

  if (masterSecret && token === masterSecret) {
    c.set("device", {
      id: "master-admin",
      name: "Master Admin Device",
    });
    return next();
  }

  if (token) {
    try {
      const rows = await sql`
        SELECT id, name, sales_point_id, is_active
        FROM devices
        WHERE api_key = ${token} AND is_active = true
        LIMIT 1
      `;

      if (rows.length > 0) {
        const dev = rows[0];
        await sql`
          UPDATE devices
          SET last_seen_at = NOW()
          WHERE id = ${dev.id}
        `;
        c.set("device", {
          id: dev.id,
          name: dev.name,
          salesPointId: dev.sales_point_id,
        });
        return next();
      }
    } catch {
      // In case devices table is not yet migrated, fall back
    }
  }

  // If no master secret set and no token, allow for local dev convenience
  if (!masterSecret && !token) {
    c.set("device", {
      id: "anonymous-terminal",
      name: "Anonymous Terminal",
    });
    return next();
  }

  return c.json({ ok: false, error: "Unauthorized: Invalid device token" }, 401);
}
