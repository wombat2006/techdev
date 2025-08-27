export interface Context7LibraryCache {
    libraryName: string;
    libraryId: string;
    description: string;
    codeSnippets: number;
    trustScore: number;
    cachedAt: Date;
}
export declare class Context7CacheManager {
    private redis;
    private readonly CACHE_PREFIX;
    private readonly CACHE_TTL;
    getCachedLibraryId(libraryName: string): Promise<string | null>;
    cacheLibraryId(libraryName: string, libraryId: string, metadata?: {
        description?: string;
        codeSnippets?: number;
        trustScore?: number;
    }): Promise<void>;
    invalidateCache(libraryName: string): Promise<void>;
    getAllCachedLibraries(): Promise<Context7LibraryCache[]>;
    searchCachedLibraries(query: string): Promise<Context7LibraryCache[]>;
    private isCacheValid;
    getCacheStats(): Promise<{
        totalCached: number;
        validEntries: number;
        expiredEntries: number;
        topLibraries: Context7LibraryCache[];
    }>;
    cleanupExpiredCache(): Promise<number>;
}
export declare const getContext7CacheManager: () => Context7CacheManager;
export declare function getCachedOrFetchLibraryId(libraryName: string, fetchFunction: () => Promise<{
    libraryId: string;
    metadata?: any;
}>): Promise<string>;
