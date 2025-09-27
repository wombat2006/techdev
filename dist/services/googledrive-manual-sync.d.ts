import { GoogleDriveRAGConnector } from './googledrive-connector';
export interface ManualSyncOptions {
    connector: GoogleDriveRAGConnector;
    folderId: string;
    vectorStoreName: string;
    batchSize?: number;
}
export interface ManualSyncOutcome {
    vectorStoreId: string;
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
}
export declare const runManualDriveSync: ({ connector, folderId, vectorStoreName, batchSize }: ManualSyncOptions) => Promise<ManualSyncOutcome>;
