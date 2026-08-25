import type { SalePrintLine } from "./types.ts";
/** Build "10 × Palm Oil 1L, 5 × Palm Oil 5L" from print lines. */
export declare function buildCashReceiptSettlementPhrase(lines: readonly SalePrintLine[]): string;
