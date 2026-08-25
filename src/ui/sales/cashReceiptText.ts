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

const ONES = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
] as const;

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
] as const;

function titleCaseWords(parts: string[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Convert 0–999 to Title Case English words (no hyphens). */
function belowThousand(n: number): string {
  if (n < 20) {
    return ONES[n] ?? "";
  }
  if (n < 100) {
    const ten = Math.floor(n / 10);
    const one = n % 10;
    return titleCaseWords([TENS[ten] ?? "", one ? (ONES[one] ?? "") : ""]);
  }
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  return titleCaseWords([
    ONES[hundred] ?? "",
    "Hundred",
    rest ? belowThousand(rest) : "",
  ]);
}

function integerToTitleCaseWords(n: number): string {
  if (n === 0) {
    return "Zero";
  }

  const scales: Array<{ value: number; label: string }> = [
    { value: 1_000_000_000, label: "Billion" },
    { value: 1_000_000, label: "Million" },
    { value: 1_000, label: "Thousand" },
  ];

  const parts: string[] = [];
  let remaining = n;

  for (const scale of scales) {
    if (remaining >= scale.value) {
      const chunk = Math.floor(remaining / scale.value);
      remaining %= scale.value;
      parts.push(belowThousand(chunk), scale.label);
    }
  }

  if (remaining > 0) {
    parts.push(belowThousand(remaining));
  }

  return titleCaseWords(parts);
}

/**
 * Spell a money amount as Title Case English words ending with "Francs".
 * Example: 28000 → "Twenty Eight Thousand Francs"
 */
export function formatAmountInFrancsWords(amount: string | number): string {
  const parsed =
    typeof amount === "number" ? amount : Number.parseFloat(String(amount));
  if (!Number.isFinite(parsed) || parsed < 0) {
    const raw = String(amount ?? "").trim();
    return raw ? `${raw} Francs` : "Zero Francs";
  }

  const rounded = Math.round(parsed);
  return `${integerToTitleCaseWords(rounded)} Francs`;
}
