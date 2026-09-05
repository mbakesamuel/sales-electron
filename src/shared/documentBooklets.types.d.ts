export type DocumentBookletKind = "SALES_INVOICE" | "DELIVERY_ORDER";
export type DocumentBookletStatus = "PENDING" | "ACTIVE" | "CANCELLED" | "REJECTED";
export interface DocumentBookletRow {
    id: string;
    documentKind: DocumentBookletKind;
    bookletCode: string | null;
    startSerial: string;
    endSerial: string;
    salesPointId: number;
    salesPointName?: string;
    status: DocumentBookletStatus;
    issuedAt: string;
    issuedByUserId: string | null;
    issuedByUserName?: string | null;
    validatedAt?: string | null;
    validatedByUserId?: string | null;
    validatedByUserName?: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    totalPages: number;
    usedPages?: number;
}
export interface CreateDocumentBookletInput {
    documentKind: DocumentBookletKind;
    bookletCode?: string | null;
    startSerial: string;
    endSerial: string;
    salesPointId: number;
    notes?: string | null;
    activateImmediately?: boolean;
}
export interface DocumentBookletFilters {
    documentKind?: DocumentBookletKind | "ALL";
    salesPointId?: number | "ALL";
    status?: DocumentBookletStatus | "ALL";
}
export interface ValidateSerialForSalesPointInput {
    documentKind: DocumentBookletKind;
    serial: string;
    salesPointId: number;
}
export type ValidateSerialForSalesPointResult = {
    ok: true;
    bookletId: string | null;
    bookletCode: string | null;
} | {
    ok: false;
    error: string;
};
export type ValidateDocumentBookletResult = {
    ok: true;
    booklet: DocumentBookletRow;
} | {
    ok: false;
    error: string;
};
export type RejectDocumentBookletResult = {
    ok: true;
} | {
    ok: false;
    error: string;
};
export interface ValidateManyBookletsResult {
    ok: boolean;
    validated: number;
    errors: Array<{
        id: string;
        error: string;
        bookletCode?: string | null;
    }>;
    error?: string;
}
