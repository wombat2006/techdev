import { GoogleDriveRAGConnector } from './googledrive-connector';
export interface ManualSyncOptions {
    connector: GoogleDriveRAGConnector;
    folderId: string;
    vectorStoreName: string;
    batchSize?: number;
    dryRun?: boolean;
}
export interface ManualSyncOutcome {
    vectorStoreId: string | null;
    processedCount: number;
    failedCount: number;
    processedDocuments: Array<{
        id: string;
        name: string;
        vectorStoreFileId?: string;
    }>;
    failedDocuments: Array<{
        id: string;
        name: string;
        error: string;
    }>;
    batchSizeUsed: number;
    dryRun: boolean;
}
export declare const runManualDriveSync: ({ connector, folderId, vectorStoreName, batchSize, dryRun }: ManualSyncOptions) => Promise<ManualSyncOutcome>;
export declare const resyncDriveDocuments: (connector: GoogleDriveRAGConnector, vectorStoreName: string, documentIds: string[]) => Promise<ManualSyncOutcome>;
