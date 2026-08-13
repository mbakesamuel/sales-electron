import type { BinCardQuery, BinCardReport, ReceiveTransferInput, SaveAdjustmentInput, SaveReceiptInput, SaveTransferInput, StockBootstrap, StockGenericResult, StockMutationResult } from "../../shared/stock.types.ts";
export interface StockApi {
    getBootstrap(userId: string): Promise<StockBootstrap>;
    getBinCard(userId: string, query: BinCardQuery): Promise<BinCardReport>;
    saveReceipt(input: SaveReceiptInput): Promise<StockMutationResult>;
    postReceipt(payload: {
        userId: string;
        receiptId: string;
    }): Promise<StockGenericResult>;
    cancelReceipt(payload: {
        userId: string;
        receiptId: string;
    }): Promise<StockGenericResult>;
    findReceiptByNumber(payload: {
        userId: string;
        receiptNo: string;
    }): Promise<{
        ok: true;
        detail: import("../../shared/stock.types.ts").ReceiptDetail;
    } | {
        ok: false;
        error: string;
    }>;
    loadReceiptForReview(payload: {
        userId: string;
        receiptId: string;
    }): Promise<{
        ok: true;
        detail: import("../../shared/stock.types.ts").ReceiptDetail;
    } | {
        ok: false;
        error: string;
    }>;
    saveTransfer(input: SaveTransferInput): Promise<StockMutationResult>;
    dispatchTransfer(payload: {
        userId: string;
        transferId: string;
    }): Promise<StockGenericResult>;
    postInternalTransfer(payload: {
        userId: string;
        transferId: string;
    }): Promise<StockGenericResult>;
    receiveTransfer(input: ReceiveTransferInput): Promise<StockGenericResult>;
    cancelTransfer(payload: {
        userId: string;
        transferId: string;
    }): Promise<StockGenericResult>;
    findTransferByNumber(payload: {
        userId: string;
        transferNo: string;
    }): Promise<{
        ok: true;
        detail: import("../../shared/stock.types.ts").TransferDetail;
    } | {
        ok: false;
        error: string;
    }>;
    loadTransferForReview(payload: {
        userId: string;
        transferId: string;
    }): Promise<{
        ok: true;
        detail: import("../../shared/stock.types.ts").TransferDetail;
    } | {
        ok: false;
        error: string;
    }>;
    saveAdjustment(input: SaveAdjustmentInput): Promise<StockMutationResult>;
    postAdjustment(payload: {
        userId: string;
        adjustmentId: string;
    }): Promise<StockGenericResult>;
    cancelAdjustment(payload: {
        userId: string;
        adjustmentId: string;
    }): Promise<StockGenericResult>;
    findAdjustmentByNumber(payload: {
        userId: string;
        adjustmentNo: string;
    }): Promise<{
        ok: true;
        detail: import("../../shared/stock.types.ts").AdjustmentDetail;
    } | {
        ok: false;
        error: string;
    }>;
    loadAdjustmentForReview(payload: {
        userId: string;
        adjustmentId: string;
    }): Promise<{
        ok: true;
        detail: import("../../shared/stock.types.ts").AdjustmentDetail;
    } | {
        ok: false;
        error: string;
    }>;
}
