import type { SalePrintLine } from "./types.ts";

/** Build "10 × Palm Oil 1L, 5 × Palm Oil 5L" from print lines. */
export function buildCashReceiptSettlementPhrase(
  lines: readonly SalePrintLine[],
): string {
  const parts = lines
    .map((line) => {
      const rawQty = String(line.qty ?? "").trim();
      const name = String(line.productName ?? "").trim();
      if (!rawQty || !name) {
        return null;
      }
      const qtyNum = Number.parseFloat(rawQty);
      const qty = Number.isFinite(qtyNum)
        ? String(Number(qtyNum.toFixed(6)).valueOf()).replace(/\.0+$/, "")
        : rawQty;
      return `${qty} × ${name}`;
    })
    .filter((part): part is string => part != null);

  if (parts.length === 0) {
    return "the products listed on this sale";
  }

  return parts.join(", ");
}
