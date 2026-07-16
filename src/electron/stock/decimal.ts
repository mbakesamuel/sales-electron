export function parseQty(value: string | number | null | undefined): number {
  const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatQty(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "") || "0";
}

export function addQty(a: string, b: string): string {
  return formatQty(parseQty(a) + parseQty(b));
}

export function sumQty(values: string[]): string {
  return formatQty(values.reduce((acc, value) => acc + parseQty(value), 0));
}

export function negateQty(value: string): string {
  return formatQty(-parseQty(value));
}

export function absQty(value: string): string {
  return formatQty(Math.abs(parseQty(value)));
}

export function isPositiveQty(value: string): boolean {
  return parseQty(value) > 0;
}

export function isNonZeroQty(value: string): boolean {
  return Math.abs(parseQty(value)) > 0.000001;
}
