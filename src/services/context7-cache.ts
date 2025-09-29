import { getRedisService } from './redis-service';

export interface Context7LibraryCache {
  libraryName: string;
  libraryId: string;
  description: string;
  codeSnippets: number;
  trustScore: number;
  cachedAt: Date;
}

export class Context7CacheManager {
  private redis = getRedisService();
  private readonly CACHE_PREFIX = 'context7:library:';
  private readonly CACHE_TTL = 86400 * 7; // 7 days

  async getCachedLibraryId(libraryName: string): Promise<string | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${libraryName.toLowerCase()}`;
      const cached = await this.redis.getCache<Context7LibraryCache>(cacheKey);
      
      if (cached && this.isCacheValid(cached)) {
        return cached.libraryId;
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving cached library ID:', error);
      return null;
    }
  }

  async cacheLibraryId(
    libraryName: string, 
    libraryId: string, 
    metadata: {
      description?: string;
      codeSnippets?: number;
      trustScore?: number;
    } = {}
  ): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${libraryName.toLowerCase()}`;
      const cacheData: Context7LibraryCache = {
        libraryName,
        libraryId,
        description: metadata.description || '',
        codeSnippets: metadata.codeSnippets || 0,
        trustScore: metadata.trustScore || 0,
        cachedAt: new Date()
      };

      await this.redis.setCache(cacheKey, cacheData, this.CACHE_TTL);
    } catch (error) {
      console.error('Error caching library ID:', error);
    }
  }

  async invalidateCache(libraryName: string): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${libraryName.toLowerCase()}`;
      await this.redis.deleteCache(cacheKey);
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  async getAllCachedLibraries(): Promise<Context7LibraryCache[]> {
    try {
      const pattern = `cache:${this.CACHE_PREFIX}*`;
      const keys = await this.redis.keys(pattern);
      const libraries: Context7LibraryCache[] = [];

      for (const key of keys) {
        const cached = await this.redis.get<Context7LibraryCache>(key);
        if (cached && this.isCacheValid(cached)) {
          libraries.push(cached);
        }
      }

      return libraries.sort((a, b) => b.trustScore - a.trustScore);
    } catch (error) {
      console.error('Error retrieving all cached libraries:', error);
      return [];
    }
  }

  async searchCachedLibraries(query: string): Promise<Context7LibraryCache[]> {
    try {
      const allLibraries = await this.getAllCachedLibraries();
      const lowercaseQuery = query.toLowerCase();

      return allLibraries.filter(library => 
        library.libraryName.toLowerCase().includes(lowercaseQuery) ||
        library.description.toLowerCase().includes(lowercaseQuery)
      );
    } catch (error) {
      console.error('Error searching cached libraries:', error);
      return [];
    }
  }

  private isCacheValid(cached: Context7LibraryCache): boolean {
    const cacheAge = Date.now() - new Date(cached.cachedAt).getTime();
    return cacheAge < (this.CACHE_TTL * 1000); // TTL is in seconds, convert to ms
  }

  async getCacheStats(): Promise<{
    totalCached: number;
    validEntries: number;
    expiredEntries: number;
    topLibraries: Context7LibraryCache[];
  }> {
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
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalCached: 0,
        validEntries: 0,
        expiredEntries: 0,
        topLibraries: []
      };
    }
  }

  async cleanupExpiredCache(): Promise<number> {
    try {
      const pattern = `cache:${this.CACHE_PREFIX}*`;
      const keys = await this.redis.keys(pattern);
      let cleanedCount = 0;

      for (const key of keys) {
        const cached = await this.redis.get<Context7LibraryCache>(key);
        if (!cached || !this.isCacheValid(cached)) {
          await this.redis.del(key);
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up expired cache:', error);
      return 0;
    }
  }
}

// Singleton instance
let context7CacheManager: Context7CacheManager | null = null;

export const getContext7CacheManager = (): Context7CacheManager => {
  if (!context7CacheManager) {
    context7CacheManager = new Context7CacheManager();
  }
  return context7CacheManager;
};

// Helper function to integrate with existing context7 workflows
export async function getCachedOrFetchLibraryId(
  libraryName: string,
  fetchFunction: () => Promise<{ libraryId: string; metadata?: any }>
): Promise<string> {
  const cacheManager = getContext7CacheManager();
  
  // Try cache first
  const cachedId = await cacheManager.getCachedLibraryId(libraryName);
  if (cachedId) {
    return cachedId;
  }

  // Fetch from source and cache result
  try {
    const result = await fetchFunction();
    await cacheManager.cacheLibraryId(
      libraryName, 
      result.libraryId, 
      result.metadata
    );
    return result.libraryId;
  } catch (error) {
    console.error(`Failed to fetch library ID for ${libraryName}:`, error);
    throw error;
  }
}