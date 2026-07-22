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
