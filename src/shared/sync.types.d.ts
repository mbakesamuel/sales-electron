export type SyncConnectionStatus = "ONLINE" | "OFFLINE" | "SYNCING" | "ERROR";
export type SyncOutboxAction = "INSERT" | "UPDATE" | "DELETE" | "UPSERT";
export type SyncOutboxStatus = "PENDING" | "IN_FLIGHT" | "FAILED" | "SYNCED";
export type SyncEntityType = "Sale" | "DeliveryOrder" | "StockReceipt" | "StockTransfer" | "StockAdjustment" | "Customer" | "Payment" | "DocumentBooklet";
export interface SyncOutboxItem {
    id: number;
    entityType: SyncEntityType | string;
    entityId: string;
    action: SyncOutboxAction;
    payloadJson: string;
    status: SyncOutboxStatus;
    retryCount: number;
    lastError: string | null;
    createdAt: string;
    syncedAt: string | null;
}
export interface SyncStateConfig {
    id: string;
    syncServerUrl: string;
    apiToken: string | null;
    salesPointId: number | null;
    deviceId: string;
    lastPulledAt: string | null;
    lastPushedAt: string | null;
    autoSyncEnabled: boolean;
}
export interface SyncPushBatchItem {
    outboxId: number;
    entityType: string;
    entityId: string;
    action: SyncOutboxAction;
    payload: Record<string, unknown>;
    createdAt: string;
}
export interface SyncPushBatch {
    deviceId: string;
    salesPointId: number | null;
    clientTime: string;
    items: SyncPushBatchItem[];
}
export interface SyncPushResult {
    ok: boolean;
    committedIds: number[];
    errors?: Array<{
        outboxId: number;
        error: string;
    }>;
    serverTime: string;
}
export interface SyncPullDelta {
    since: string;
    serverTime: string;
    products?: Record<string, unknown>[];
    productUnitPrices?: Record<string, unknown>[];
    productCategories?: Record<string, unknown>[];
    customers?: Record<string, unknown>[];
    customerTypes?: Record<string, unknown>[];
    taxRegimes?: Record<string, unknown>[];
    taxRateSchedules?: Record<string, unknown>[];
    paymentMethods?: Record<string, unknown>[];
    salesPoints?: Record<string, unknown>[];
    locations?: Record<string, unknown>[];
    storageLocations?: Record<string, unknown>[];
    users?: Record<string, unknown>[];
    roles?: Record<string, unknown>[];
    roleRoutePermissions?: Record<string, unknown>[];
    roleActionPermissions?: Record<string, unknown>[];
    companySettings?: Record<string, unknown> | null;
    documentBooklets?: Record<string, unknown>[];
}
export interface SyncPullResult {
    ok: boolean;
    appliedTables: string[];
    serverTime: string;
    count: number;
}
export interface SyncProgressState {
    status: SyncConnectionStatus;
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
    failedCount: number;
    lastPushedAt: string | null;
    lastPulledAt: string | null;
    lastError: string | null;
    syncServerUrl: string;
    deviceId: string;
}
export interface TestConnectionResult {
    ok: boolean;
    latencyMs?: number;
    error?: string;
    serverVersion?: string;
}
export interface SyncBackfillResult {
    ok: boolean;
    message?: string;
    enqueuedCount: number;
    summary: Record<string, number>;
    masterSummary?: Record<string, number>;
}
export interface SyncApi {
    getStatus(): Promise<SyncProgressState>;
    triggerNow(authToken: string): Promise<{
        ok: boolean;
        message?: string;
    }>;
    backfillAllData(authToken: string): Promise<SyncBackfillResult>;
    getConfig(authToken: string): Promise<SyncStateConfig>;
    saveConfig(authToken: string, config: Partial<SyncStateConfig>): Promise<{
        ok: boolean;
        error?: string;
    }>;
    getPendingList(authToken: string, limit?: number): Promise<SyncOutboxItem[]>;
    testConnection(authToken: string, serverUrl?: string): Promise<TestConnectionResult>;
    onStatusChanged?(callback: (status: SyncProgressState) => void): () => void;
}
