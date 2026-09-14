import type { SyncProgressState, SyncStateConfig } from "../../shared/sync.types.ts";
export declare function getAuthenticatedSync(): {
    getStatus: () => Promise<SyncProgressState>;
    triggerNow: () => Promise<{
        ok: boolean;
        message?: string;
    }>;
    backfillAllData: () => Promise<import("../../shared/sync.types.ts").SyncBackfillResult>;
    getConfig: () => Promise<SyncStateConfig>;
    saveConfig: (config: Partial<SyncStateConfig>) => Promise<{
        ok: boolean;
        error?: string;
    }>;
    getPendingList: (limit?: number) => Promise<import("../../shared/sync.types.ts").SyncOutboxItem[]>;
    testConnection: (serverUrl?: string) => Promise<import("../../shared/sync.types.ts").TestConnectionResult>;
    onStatusChanged: (callback: (status: SyncProgressState) => void) => () => void;
};
