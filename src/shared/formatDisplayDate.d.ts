/**
 * Format a stored `YYYY-MM-DD` (optionally with time) for display as `dd-mm-yyyy`.
 * Parses the leading calendar date without UTC conversion.
 */
export declare function formatDisplayDate(value: unknown): string;
/**
 * Format a stored date-time for display: `dd-mm-yyyy` plus `HH:mm` or `HH:mm:ss` when present.
 */
export declare function formatDisplayDateTime(value: unknown): string;
