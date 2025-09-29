"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedOrFetchLibraryId = exports.getContext7CacheManager = exports.Context7CacheManager = void 0;
const redis_service_1 = require("./redis-service");
class Context7CacheManager {
    redis = (0, redis_service_1.getRedisService)();
    CACHE_PREFIX = 'context7:library:';
    CACHE_TTL = 86400 * 7; // 7 days
    async getCachedLibraryId(libraryName) {
        try {
            const cacheKey = `${this.CACHE_PREFIX}${libraryName.toLowerCase()}`;
            const cached = await this.redis.getCache(cacheKey);
            if (cached && this.isCacheValid(cached)) {
                return cached.libraryId;
            }
            return null;
        }
        catch (error) {
            console.error('Error retrieving cached library ID:', error);
            return null;
        }
    }
    async cacheLibraryId(libraryName, libraryId, metadata = {}) {
        try {
            const cacheKey = `${this.CACHE_PREFIX}${libraryName.toLowerCase()}`;
            const cacheData = {
                libraryName,
                libraryId,
                description: metadata.description || '',
                codeSnippets: metadata.codeSnippets || 0,
                trustScore: metadata.trustScore || 0,
                cachedAt: new Date()
            };
            await this.redis.setCache(cacheKey, cacheData, this.CACHE_TTL);
        }
        catch (error) {
            console.error('Error caching library ID:', error);
        }
    }
    async invalidateCache(libraryName) {
        try {
            const cacheKey = `${this.CACHE_PREFIX}${libraryName.toLowerCase()}`;
            await this.redis.deleteCache(cacheKey);
        }
        catch (error) {
            console.error('Error invalidating cache:', error);
        }
    }
    async getAllCachedLibraries() {
        try {
            const pattern = `cache:${this.CACHE_PREFIX}*`;
            const keys = await this.redis.keys(pattern);
            const libraries = [];
            for (const key of keys) {
                const cached = await this.redis.get(key);
                if (cached && this.isCacheValid(cached)) {
                    libraries.push(cached);
                }
            }
            return libraries.sort((a, b) => b.trustScore - a.trustScore);
        }
        catch (error) {
            console.error('Error retrieving all cached libraries:', error);
            return [];
        }
    }
    async searchCachedLibraries(query) {
        try {
            const allLibraries = await this.getAllCachedLibraries();
            const lowercaseQuery = query.toLowerCase();
            return allLibraries.filter(library => library.libraryName.toLowerCase().includes(lowercaseQuery) ||
                library.description.toLowerCase().includes(lowercaseQuery));
        }
        catch (error) {
            console.error('Error searching cached libraries:', error);
            return [];
        }
    }
    isCacheValid(cached) {
        const cacheAge = Date.now() - new Date(cached.cachedAt).getTime();
        return cacheAge < (this.CACHE_TTL * 1000); // TTL is in seconds, convert to ms
    }
    async getCacheStats() {
        try {
            const allLibraries = await this.getAllCachedLibraries();
            const pattern = `cache:${this.CACHE_PREFIX}*`;
            const allKeys = await this.redis.keys(pattern);
            const validEntries = allLibraries.length;
            const expiredEntries = allKeys.length - validEntries;
            const topLibraries = allLibraries
                .sort((a, b) => b.trustScore - a.trustScore)
                .slice(0, 10);
            return {
                totalCached: allKeys.length,
                validEntries,
                expiredEntries,
                topLibraries
            };
        }
        catch (error) {
            console.error('Error getting cache stats:', error);
            return {
                totalCached: 0,
                validEntries: 0,
                expiredEntries: 0,
                topLibraries: []
            };
        }
    }
    async cleanupExpiredCache() {
        try {
            const pattern = `cache:${this.CACHE_PREFIX}*`;
            const keys = await this.redis.keys(pattern);
            let cleanedCount = 0;
            for (const key of keys) {
                const cached = await this.redis.get(key);
                if (!cached || !this.isCacheValid(cached)) {
                    await this.redis.del(key);
                    cleanedCount++;
                }
            }
            return cleanedCount;
        }
        catch (error) {
            console.error('Error cleaning up expired cache:', error);
            return 0;
        }
    }
}
exports.Context7CacheManager = Context7CacheManager;
// Singleton instance
let context7CacheManager = null;
const getContext7CacheManager = () => {
    if (!context7CacheManager) {
        context7CacheManager = new Context7CacheManager();
    }
    return context7CacheManager;
};
exports.getContext7CacheManager = getContext7CacheManager;
// Helper function to integrate with existing context7 workflows
async function getCachedOrFetchLibraryId(libraryName, fetchFunction) {
    const cacheManager = (0, exports.getContext7CacheManager)();
    // Try cache first
    const cachedId = await cacheManager.getCachedLibraryId(libraryName);
    if (cachedId) {
        return cachedId;
    }
    // Fetch from source and cache result
    try {
        const result = await fetchFunction();
        await cacheManager.cacheLibraryId(libraryName, result.libraryId, result.metadata);
        return result.libraryId;
    }
    catch (error) {
        console.error(`Failed to fetch library ID for ${libraryName}:`, error);
        throw error;
    }
}
exports.getCachedOrFetchLibraryId = getCachedOrFetchLibraryId;
//# sourceMappingURL=context7-cache.js.map