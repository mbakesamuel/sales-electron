const DATE_PREFIX =
  /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/;

/**
 * Format a stored `YYYY-MM-DD` (optionally with time) for display as `dd-mm-yyyy`.
 * Parses the leading calendar date without UTC conversion.
 */
export function formatDisplayDate(value: unknown): string {
  if (value == null || value === "") {
    return "—";
  }

  const text = String(value).trim();
  const match = DATE_PREFIX.exec(text);
  if (!match) {
    return text.length >= 10 ? text.slice(0, 10) : text;
  }

  return `${match[3]}-${match[2]}-${match[1]}`;
}

/**
 * Format a stored date-time for display: `dd-mm-yyyy` plus `HH:mm` or `HH:mm:ss` when present.
 */
export function formatDisplayDateTime(value: unknown): string {
  if (value == null || value === "") {
    return "—";
  }

  const text = String(value).trim();
  const match = DATE_PREFIX.exec(text);
  if (!match) {
    return text;
  }

  const datePart = `${match[3]}-${match[2]}-${match[1]}`;
  if (match[4] == null || match[5] == null) {
    return datePart;
  }

  const timePart =
    match[6] != null
      ? `${match[4]}:${match[5]}:${match[6]}`
      : `${match[4]}:${match[5]}`;
  return `${datePart} ${timePart}`;
}
