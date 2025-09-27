"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resyncDriveDocuments = exports.runManualDriveSync = void 0;
const googledrive_vector_mapping_1 = require("./googledrive-vector-mapping");
const logger_1 = require("../utils/logger");
const runManualDriveSync = async ({ connector, folderId, vectorStoreName, batchSize = 5, dryRun = false }) => {
    logger_1.logger.info('🔄 Manual Google Drive sync started', {
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
    await (0, googledrive_vector_mapping_1.rememberDriveVectorMappingsBulk)(syncResult.processedDocuments
        .filter(doc => Boolean(doc.vectorStoreFileId))
        .map(doc => ({
        fileId: doc.id,
        vectorStoreId: syncResult.vectorStoreId,
        vectorStoreFileId: doc.vectorStoreFileId
    })));
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
exports.runManualDriveSync = runManualDriveSync;
const resyncDriveDocuments = async (connector, vectorStoreName, documentIds) => {
    logger_1.logger.info('🔁 Drive document re-sync started', {
        count: documentIds.length,
        vectorStoreName
    });
    const result = await connector.syncDocumentsById(documentIds, vectorStoreName);
    await (0, googledrive_vector_mapping_1.rememberDriveVectorMappingsBulk)(result.processed.map(doc => ({
        fileId: doc.id,
        vectorStoreId: result.vectorStoreId,
        vectorStoreFileId: doc.vectorStoreFileId
    })));
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
exports.resyncDriveDocuments = resyncDriveDocuments;
//# sourceMappingURL=googledrive-manual-sync.js.map