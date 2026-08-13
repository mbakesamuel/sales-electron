export function parseAmount(value: string): number {
  const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundMoney(value: number): string {
  return Math.round(value).toString();
}

/** Persist tax rates as decimals (e.g. 0.1925). Do not use roundMoney — that zeros rates < 0.5. */
export function formatTaxRateSnapshot(rate: number): string {
  if (!Number.isFinite(rate) || rate === 0) {
    return "0";
  }
  return String(Number(rate.toFixed(6)));
}

export function formatXaf(value: string | number): string {
  const amount = typeof value === "number" ? value : parseAmount(value);
  if (amount === 0) {
    return "";
  }

  return `${Math.round(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} XAF`;
}

export function trimQty(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "") || "0";
}
