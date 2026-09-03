import { getDatabase } from "../db/index.js";

export type ResolveTransportRateResult =
  | { ok: true; ratePerKg: string; ratePerKgNumeric: number }
  | { ok: false; error: string };

function normalizeAsOfDay(asOfDate: string): string {
  const trimmed = asOfDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed.slice(0, 10);
}

export function resolveTransportRatePerKg(
  salesPointId: number,
  productId: number,
  asOfDate: string,
): ResolveTransportRateResult {
  const day = normalizeAsOfDay(asOfDate);
  const row = getDatabase()
    .prepare(
      `SELECT ratePerKg FROM TransportRateSchedule
       WHERE salesPointId = ? AND productId = ? AND effectiveFrom <= ?
       ORDER BY effectiveFrom DESC
       LIMIT 1`,
    )
    .get(salesPointId, productId, day) as { ratePerKg: string } | undefined;

  if (!row) {
    return {
      ok: false,
      error: `No transport rate for collection point and product on or before ${day}.`,
    };
  }

  const ratePerKgNumeric = Number.parseFloat(row.ratePerKg);
  if (!Number.isFinite(ratePerKgNumeric) || ratePerKgNumeric < 0) {
    return { ok: false, error: "Transport rate is invalid." };
  }

  return {
    ok: true,
    ratePerKg: row.ratePerKg,
    ratePerKgNumeric,
  };
}
