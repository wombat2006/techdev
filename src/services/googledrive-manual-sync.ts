import { GoogleDriveRAGConnector } from './googledrive-connector';
import { rememberDriveVectorMappingsBulk } from './googledrive-vector-mapping';

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
  processedDocuments: Array<{ id: string; name: string; vectorStoreFileId?: string }>;
  failedDocuments: Array<{ id: string; name: string; error: string }>;
  batchSizeUsed: number;
}

export const runManualDriveSync = async ({
  connector,
  folderId,
  vectorStoreName,
  batchSize = 5
}: ManualSyncOptions): Promise<ManualSyncOutcome> => {
  const syncResult = await connector.syncFolderToRAG(folderId, vectorStoreName, batchSize);

  await rememberDriveVectorMappingsBulk(
    syncResult.processedDocuments
      .filter(doc => Boolean(doc.vectorStoreFileId))
      .map(doc => ({
        fileId: doc.id,
        vectorStoreId: syncResult.vectorStoreId,
        vectorStoreFileId: doc.vectorStoreFileId as string
      }))
  );

  return {
    vectorStoreId: syncResult.vectorStoreId,
    processedCount: syncResult.processedCount,
    failedCount: syncResult.failedCount,
    processedDocuments: syncResult.processedDocuments.map(doc => ({
      id: doc.id,
      name: doc.name,
      vectorStoreFileId: doc.vectorStoreFileId
    })),
    failedDocuments: syncResult.failedDocuments,
    batchSizeUsed: batchSize
  };
};
