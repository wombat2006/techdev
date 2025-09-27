import { getRedisService, RedisService } from './redis-service';
import { logger } from '../utils/logger';

interface VectorMapping {
  vectorStoreId: string;
  vectorStoreFileId: string;
}

const inMemoryMappings = new Map<string, VectorMapping>();
const VECTOR_MAPPING_KEY = 'rag:drive-vector-mapping';

let redisService: RedisService | null = null;

const ensureRedis = (): RedisService | null => {
  if (redisService) {
    return redisService;
  }

  try {
    redisService = getRedisService();
  } catch (error) {
    logger.debug('Drive mapping store: Redis unavailable', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    redisService = null;
  }

  return redisService;
};

export const warmDriveVectorMappings = async (): Promise<number> => {
  const redis = ensureRedis();
  if (!redis) {
    return inMemoryMappings.size;
  }

  try {
    const entries = await redis.hgetall<Record<string, string>>(VECTOR_MAPPING_KEY);
    if (!entries) {
      return inMemoryMappings.size;
    }

    Object.entries(entries).forEach(([fileId, raw]) => {
      try {
        const parsed = JSON.parse(raw) as VectorMapping;
        if (parsed?.vectorStoreId && parsed?.vectorStoreFileId) {
          inMemoryMappings.set(fileId, parsed);
        }
      } catch (error) {
        logger.warn('Drive mapping store: failed to parse mapping during warmup', {
          fileId,
          raw,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    return inMemoryMappings.size;
  } catch (error) {
    logger.warn('Drive mapping store: failed to warm cache from Redis', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return inMemoryMappings.size;
  }
};

export const rememberDriveVectorMapping = async (
  fileId: string,
  vectorStoreId: string,
  vectorStoreFileId: string
): Promise<void> => {
  const payload: VectorMapping = { vectorStoreId, vectorStoreFileId };
  inMemoryMappings.set(fileId, payload);

  const redis = ensureRedis();
  if (!redis) {
    return;
  }

  try {
    await redis.hset(VECTOR_MAPPING_KEY, fileId, JSON.stringify(payload));
  } catch (error) {
    logger.warn('Drive mapping store: failed to persist mapping to Redis', {
      fileId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const rememberDriveVectorMappingsBulk = async (
  mappings: Array<{ fileId: string; vectorStoreId: string; vectorStoreFileId: string }>
): Promise<void> => {
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
  } catch (error) {
    logger.warn('Drive mapping store: failed to persist bulk mappings', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const resolveDriveVectorMapping = async (fileId: string): Promise<VectorMapping | null> => {
  const cached = inMemoryMappings.get(fileId);
  if (cached) {
    return cached;
  }

  const redis = ensureRedis();
  if (!redis) {
    return null;
  }

  try {
    const raw = await redis.hget<string>(VECTOR_MAPPING_KEY, fileId);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as VectorMapping;
    inMemoryMappings.set(fileId, parsed);
    return parsed;
  } catch (error) {
    logger.warn('Drive mapping store: failed to load mapping from Redis', {
      fileId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
};

export const clearDriveVectorMapping = async (fileId: string): Promise<void> => {
  inMemoryMappings.delete(fileId);

  const redis = ensureRedis();
  if (!redis) {
    return;
  }

  try {
    await redis.hdel(VECTOR_MAPPING_KEY, fileId);
  } catch (error) {
    logger.warn('Drive mapping store: failed to delete mapping from Redis', {
      fileId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
