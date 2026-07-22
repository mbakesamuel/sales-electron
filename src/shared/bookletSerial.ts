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
