const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
] as const;

const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
] as const;

function titleCase(word: string): string {
  if (!word) {
    return word;
  }
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function belowThousand(n: number): string {
  if (n < 20) {
    return ONES[n] ?? String(n);
  }
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return ones ? `${TENS[tens]}-${ONES[ones]}` : (TENS[tens] ?? String(n));
  }
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const head = `${ONES[hundred]} hundred`;
  return rest ? `${head} ${belowThousand(rest)}` : head;
}

function integerToWords(n: number): string {
  if (n === 0) {
    return "zero";
  }
  const scales: Array<{ value: number; label: string }> = [
    { value: 1_000_000_000, label: "billion" },
    { value: 1_000_000, label: "million" },
    { value: 1_000, label: "thousand" },
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
  return parts.join(" ");
}

function titleCaseWords(text: string): string {
  return text
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(titleCase)
    .join(text.includes("-") ? "-" : " ");
}

/** e.g. 14920 → "Fourteen tons, Nine hundred and twenty kilos" */
export function formatKgInTonsAndKilosWords(qtyKg: string | number): string {
  const parsed =
    typeof qtyKg === "number" ? qtyKg : Number.parseFloat(String(qtyKg));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return "Zero kilos";
  }

  const totalKg = Math.round(parsed);
  const tons = Math.floor(totalKg / 1000);
  const kilos = totalKg % 1000;
  const parts: string[] = [];

  if (tons > 0) {
    parts.push(
      `${titleCaseWords(integerToWords(tons))} ton${tons === 1 ? "" : "s"}`,
    );
  }
  if (kilos > 0) {
    parts.push(
      `${titleCaseWords(integerToWords(kilos))} kilo${kilos === 1 ? "" : "s"}`,
    );
  }
  if (parts.length === 0) {
    return "Zero kilos";
  }
  return parts.join(", ");
}
