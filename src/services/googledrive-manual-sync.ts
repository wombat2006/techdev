import { GoogleDriveRAGConnector } from './googledrive-connector';
import { rememberDriveVectorMappingsBulk } from './googledrive-vector-mapping';
import { logger } from '../utils/logger';

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
  processedDocuments: Array<{ id: string; name: string; vectorStoreFileId?: string }>;
  failedDocuments: Array<{ id: string; name: string; error: string }>;
  batchSizeUsed: number;
  dryRun: boolean;
}

export const runManualDriveSync = async ({
  connector,
  folderId,
  vectorStoreName,
  batchSize = 5,
  dryRun = false
}: ManualSyncOptions): Promise<ManualSyncOutcome> => {
  logger.info('🔄 Manual Google Drive sync started', {
    folderId,
    vectorStoreName,
    batchSize,
    dryRun
  });

  if (dryRun) {
    const documents = await connector.listDocuments(folderId);
    return {
      vectorStoreId: null,
      processedCount: 0,
      failedCount: 0,
      processedDocuments: documents.map(doc => ({ id: doc.id, name: doc.name })),
      failedDocuments: [],
      batchSizeUsed: batchSize,
      dryRun: true
    };
  }

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
    batchSizeUsed: batchSize,
    dryRun: false
  };
};

export const resyncDriveDocuments = async (
  connector: GoogleDriveRAGConnector,
  vectorStoreName: string,
  documentIds: string[]
): Promise<ManualSyncOutcome> => {
  logger.info('🔁 Drive document re-sync started', {
    count: documentIds.length,
    vectorStoreName
  });

  const result = await connector.syncDocumentsById(documentIds, vectorStoreName);

  await rememberDriveVectorMappingsBulk(
    result.processed.map(doc => ({
      fileId: doc.id,
      vectorStoreId: result.vectorStoreId,
      vectorStoreFileId: doc.vectorStoreFileId
    }))
  );

  return {
    vectorStoreId: result.vectorStoreId,
    processedCount: result.processed.length,
    failedCount: result.failed.length,
    processedDocuments: result.processed.map(doc => ({
      id: doc.id,
      name: doc.name,
      vectorStoreFileId: doc.vectorStoreFileId
    })),
    failedDocuments: result.failed.map(doc => ({
      id: doc.id,
      name: doc.id,
      error: doc.error
    })),
    batchSizeUsed: documentIds.length,
    dryRun: false
  };
};
