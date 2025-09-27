"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runManualDriveSync = void 0;
const googledrive_vector_mapping_1 = require("./googledrive-vector-mapping");
const logger_1 = require("../utils/logger");
const runManualDriveSync = async ({ connector, folderId, vectorStoreName, batchSize = 5 }) => {
    logger_1.logger.info('🔄 Manual Google Drive sync started', {
        folderId,
        vectorStoreName,
        batchSize
    });
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
        batchSizeUsed: batchSize
    };
};
exports.runManualDriveSync = runManualDriveSync;
//# sourceMappingURL=googledrive-manual-sync.js.map