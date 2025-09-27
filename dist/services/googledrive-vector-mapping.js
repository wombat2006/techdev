"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearDriveVectorMapping = exports.resolveDriveVectorMapping = exports.rememberDriveVectorMappingsBulk = exports.rememberDriveVectorMapping = exports.warmDriveVectorMappings = void 0;
const redis_service_1 = require("./redis-service");
const logger_1 = require("../utils/logger");
const inMemoryMappings = new Map();
const VECTOR_MAPPING_KEY = 'rag:drive-vector-mapping';
let redisService = null;
const ensureRedis = () => {
    if (redisService) {
        return redisService;
    }
    try {
        redisService = (0, redis_service_1.getRedisService)();
    }
    catch (error) {
        logger_1.logger.debug('Drive mapping store: Redis unavailable', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        redisService = null;
    }
    return redisService;
};
const warmDriveVectorMappings = async () => {
    const redis = ensureRedis();
    if (!redis) {
        return inMemoryMappings.size;
    }
    try {
        const existing = await redis.hgetall(VECTOR_MAPPING_KEY);
        if (!existing) {
            return inMemoryMappings.size;
        }
        Object.entries(existing).forEach(([fileId, raw]) => {
            try {
                const parsed = JSON.parse(raw);
                if (parsed?.vectorStoreId && parsed?.vectorStoreFileId) {
                    inMemoryMappings.set(fileId, parsed);
                }
            }
            catch (error) {
                logger_1.logger.warn('Drive mapping store: failed to parse mapping during warmup', {
                    fileId,
                    raw,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        return inMemoryMappings.size;
    }
    catch (error) {
        logger_1.logger.warn('Drive mapping store: failed to warm cache from Redis', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return inMemoryMappings.size;
    }
};
exports.warmDriveVectorMappings = warmDriveVectorMappings;
const rememberDriveVectorMapping = async (fileId, vectorStoreId, vectorStoreFileId) => {
    const payload = { vectorStoreId, vectorStoreFileId };
    inMemoryMappings.set(fileId, payload);
    const redis = ensureRedis();
    if (!redis) {
        return;
    }
    try {
        await redis.hset(VECTOR_MAPPING_KEY, fileId, JSON.stringify(payload));
    }
    catch (error) {
        logger_1.logger.warn('Drive mapping store: failed to persist mapping to Redis', {
            fileId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.rememberDriveVectorMapping = rememberDriveVectorMapping;
const rememberDriveVectorMappingsBulk = async (mappings) => {
    if (mappings.length === 0) {
        return;
    }
    mappings.forEach(({ fileId, vectorStoreId, vectorStoreFileId }) => {
        inMemoryMappings.set(fileId, { vectorStoreId, vectorStoreFileId });
    });
    const redis = ensureRedis();
    if (!redis) {
        return;
    }
    try {
        const entries = mappings.map(({ fileId, vectorStoreId, vectorStoreFileId }) => ({
            field: fileId,
            value: JSON.stringify({ vectorStoreId, vectorStoreFileId })
        }));
        for (const entry of entries) {
            await redis.hset(VECTOR_MAPPING_KEY, entry.field, entry.value);
        }
    }
    catch (error) {
        logger_1.logger.warn('Drive mapping store: failed to persist bulk mappings', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.rememberDriveVectorMappingsBulk = rememberDriveVectorMappingsBulk;
const resolveDriveVectorMapping = async (fileId) => {
    const cached = inMemoryMappings.get(fileId);
    if (cached) {
        return cached;
    }
    const redis = ensureRedis();
    if (!redis) {
        return null;
    }
    try {
        const raw = await redis.hget(VECTOR_MAPPING_KEY, fileId);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        inMemoryMappings.set(fileId, parsed);
        return parsed;
    }
    catch (error) {
        logger_1.logger.warn('Drive mapping store: failed to load mapping from Redis', {
            fileId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return null;
    }
};
exports.resolveDriveVectorMapping = resolveDriveVectorMapping;
const clearDriveVectorMapping = async (fileId) => {
    inMemoryMappings.delete(fileId);
    const redis = ensureRedis();
    if (!redis) {
        return;
    }
    try {
        await redis.hdel(VECTOR_MAPPING_KEY, fileId);
    }
    catch (error) {
        logger_1.logger.warn('Drive mapping store: failed to delete mapping from Redis', {
            fileId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.clearDriveVectorMapping = clearDriveVectorMapping;
//# sourceMappingURL=googledrive-vector-mapping.js.map