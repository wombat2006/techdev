export interface RedisService {
    get<T = any>(key: string): Promise<T | null>;
    set(key: string, value: any, options?: {
        ex?: number;
        px?: number;
    }): Promise<void>;
    del(key: string): Promise<number>;
    exists(key: string): Promise<boolean>;
    hget<T = any>(key: string, field: string): Promise<T | null>;
    hset(key: string, field: string, value: any): Promise<void>;
    hgetall<T = Record<string, any>>(key: string): Promise<T>;
    hdel(key: string, field: string): Promise<number>;
    sadd(key: string, member: string): Promise<number>;
    smembers(key: string): Promise<string[]>;
    srem(key: string, member: string): Promise<number>;
    zadd(key: string, score: number, member: string): Promise<number>;
    zrange(key: string, start: number, stop: number): Promise<string[]>;
    zrem(key: string, member: string): Promise<number>;
    expire(key: string, seconds: number): Promise<boolean>;
    ttl(key: string): Promise<number>;
    keys(pattern: string): Promise<string[]>;
    flushdb(): Promise<void>;
}
declare class UpstashRedisService implements RedisService {
    private redis;
    constructor();
    get<T = any>(key: string): Promise<T | null>;
    set(key: string, value: any, options?: {
        ex?: number;
        px?: number;
    }): Promise<void>;
    del(key: string): Promise<number>;
    exists(key: string): Promise<boolean>;
    hget<T = any>(key: string, field: string): Promise<T | null>;
    hset(key: string, field: string, value: any): Promise<void>;
    hgetall<T = Record<string, any>>(key: string): Promise<T>;
    hdel(key: string, field: string): Promise<number>;
    sadd(key: string, member: string): Promise<number>;
    smembers(key: string): Promise<string[]>;
    srem(key: string, member: string): Promise<number>;
    zadd(key: string, score: number, member: string): Promise<number>;
    zrange(key: string, start: number, stop: number): Promise<string[]>;
    zrem(key: string, member: string): Promise<number>;
    expire(key: string, seconds: number): Promise<boolean>;
    ttl(key: string): Promise<number>;
    keys(pattern: string): Promise<string[]>;
    flushdb(): Promise<void>;
    setSession(sessionId: string, data: any, expireInSeconds?: number): Promise<void>;
    getSession<T = any>(sessionId: string): Promise<T | null>;
    deleteSession(sessionId: string): Promise<void>;
    setCache(key: string, data: any, expireInSeconds?: number): Promise<void>;
    getCache<T = any>(key: string): Promise<T | null>;
    deleteCache(key: string): Promise<void>;
    trackCost(userId: string, service: string, tokens: number, cost: number): Promise<void>;
    getCostSummary(userId: string, date: string): Promise<Record<string, any>>;
}
export declare const getRedisService: () => UpstashRedisService;
export { UpstashRedisService };
