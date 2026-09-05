export const BOOKLET_SERIAL_MAX_LENGTH = 20;

export type BookletSerialResult =
  | { ok: true; serial: string }
  | { ok: false; error: string };

export function validateBookletSerial(raw: string | null | undefined): BookletSerialResult {
  const serial = String(raw ?? "").trim();

  if (!serial) {
    return { ok: false, error: "Enter the booklet serial number." };
  }

  if (!/^\d+$/.test(serial)) {
    return { ok: false, error: "Serial must contain digits only." };
  }

  if (serial.length > BOOKLET_SERIAL_MAX_LENGTH) {
    return {
      ok: false,
      error: `Serial must be at most ${BOOKLET_SERIAL_MAX_LENGTH} digits.`,
    };
  }

  return { ok: true, serial };
}

export function isValidBookletSerial(raw: string | null | undefined): boolean {
  return validateBookletSerial(raw).ok;
}

export interface BookletRangeResult {
  ok: true;
  startSerial: string;
  endSerial: string;
  totalPages: number;
}

export type ValidateBookletRangeResult =
  | BookletRangeResult
  | { ok: false; error: string };

export function validateBookletRange(
  startRaw: string | null | undefined,
  endRaw: string | null | undefined,
): ValidateBookletRangeResult {
  const startRes = validateBookletSerial(startRaw);
  if (!startRes.ok) {
    return { ok: false, error: `Start serial: ${startRes.error}` };
  }

  const endRes = validateBookletSerial(endRaw);
  if (!endRes.ok) {
    return { ok: false, error: `End serial: ${endRes.error}` };
  }

  try {
    const startVal = BigInt(startRes.serial);
    const endVal = BigInt(endRes.serial);

    if (startVal > endVal) {
      return {
        ok: false,
        error: "Start serial must be less than or equal to end serial.",
      };
    }

    const diff = endVal - startVal + 1n;
    if (diff > 100000n) {
      return {
        ok: false,
        error: "Booklet range is too large (maximum 100,000 pages per booklet).",
      };
    }

    return {
      ok: true,
      startSerial: startRes.serial,
      endSerial: endRes.serial,
      totalPages: Number(diff),
    };
  } catch {
    return { ok: false, error: "Invalid numeric range." };
  }
}

export function isSerialInRange(
  serial: string,
  startSerial: string,
  endSerial: string,
): boolean {
  try {
    const s = BigInt(serial.trim());
    const start = BigInt(startSerial.trim());
    const end = BigInt(endSerial.trim());
    return s >= start && s <= end;
  } catch {
    return false;
  }
}

export function doRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  try {
    const sA = BigInt(startA.trim());
    const eA = BigInt(endA.trim());
    const sB = BigInt(startB.trim());
    const eB = BigInt(endB.trim());
    return sA <= eB && sB <= eA;
  } catch {
    return false;
  }
}
