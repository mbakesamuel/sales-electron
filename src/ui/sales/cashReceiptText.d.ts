import type { SalePrintLine } from "./types.ts";
/** Build "10 × Palm Oil 1L, 5 × Palm Oil 5L" from print lines. */
export declare function buildCashReceiptSettlementPhrase(lines: readonly SalePrintLine[]): string;
/**
 * Spell a money amount as Title Case English words ending with "Francs".
 * Example: 28000 → "Twenty Eight Thousand Francs"
 */
export declare function formatAmountInFrancsWords(amount: string | number): string;
