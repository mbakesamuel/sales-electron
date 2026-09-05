export declare const BOOKLET_SERIAL_MAX_LENGTH = 20;
export type BookletSerialResult = {
    ok: true;
    serial: string;
} | {
    ok: false;
    error: string;
};
export declare function validateBookletSerial(raw: string | null | undefined): BookletSerialResult;
export declare function isValidBookletSerial(raw: string | null | undefined): boolean;
export interface BookletRangeResult {
    ok: true;
    startSerial: string;
    endSerial: string;
    totalPages: number;
}
export type ValidateBookletRangeResult = BookletRangeResult | {
    ok: false;
    error: string;
};
export declare function validateBookletRange(startRaw: string | null | undefined, endRaw: string | null | undefined): ValidateBookletRangeResult;
export declare function isSerialInRange(serial: string, startSerial: string, endSerial: string): boolean;
export declare function doRangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean;
