"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpstashRedisService = exports.getRedisService = void 0;
const redis_1 = require("@upstash/redis");
const environment_1 = require("../config/environment");
class UpstashRedisService {
    redis;
    constructor() {
        if (!environment_1.config.redis.url || !environment_1.config.redis.token) {
            throw new Error('Upstash Redis URL and TOKEN are required');
        }
        this.redis = new redis_1.Redis({
            url: environment_1.config.redis.url,
            token: environment_1.config.redis.token,
        });
    }
    async get(key) {
        try {
            const result = await this.redis.get(key);
            return result;
        }
        catch (error) {
            console.error(`Redis GET error for key ${key}:`, error);
            return null;
        }
    }
    async set(key, value, options) {
        try {
            if (options?.ex) {
                await this.redis.set(key, value, { ex: options.ex });
            }
            else if (options?.px) {
                await this.redis.set(key, value, { px: options.px });
            }
            else {
                await this.redis.set(key, value);
            }
        }
        catch (error) {
            console.error(`Redis SET error for key ${key}:`, error);
            throw error;
        }
    }
    async del(key) {
        try {
            return await this.redis.del(key);
        }
        catch (error) {
            console.error(`Redis DEL error for key ${key}:`, error);
            return 0;
        }
    }
    async exists(key) {
        try {
            const result = await this.redis.exists(key);
            return result === 1;
        }
        catch (error) {
            console.error(`Redis EXISTS error for key ${key}:`, error);
            return false;
        }
    }
    async hget(key, field) {
        try {
            const result = await this.redis.hget(key, field);
            return result;
        }
        catch (error) {
            console.error(`Redis HGET error for key ${key}, field ${field}:`, error);
            return null;
        }
    }
    async hset(key, field, value) {
        try {
            await this.redis.hset(key, { [field]: value });
        }
        catch (error) {
            console.error(`Redis HSET error for key ${key}, field ${field}:`, error);
            throw error;
        }
    }
    async hgetall(key) {
        try {
            const result = await this.redis.hgetall(key);
            return result;
        }
        catch (error) {
            console.error(`Redis HGETALL error for key ${key}:`, error);
            return {};
        }
    }
    async hdel(key, field) {
        try {
            return await this.redis.hdel(key, field);
        }
        catch (error) {
            console.error(`Redis HDEL error for key ${key}, field ${field}:`, error);
            return 0;
        }
    }
    async sadd(key, member) {
        try {
            return await this.redis.sadd(key, member);
        }
        catch (error) {
            console.error(`Redis SADD error for key ${key}:`, error);
            return 0;
        }
    }
    async smembers(key) {
        try {
            return await this.redis.smembers(key);
        }
        catch (error) {
            console.error(`Redis SMEMBERS error for key ${key}:`, error);
            return [];
        }
    }
    async srem(key, member) {
        try {
            return await this.redis.srem(key, member);
        }
        catch (error) {
            console.error(`Redis SREM error for key ${key}:`, error);
            return 0;
        }
    }
    async zadd(key, score, member) {
        try {
            const result = await this.redis.zadd(key, { score, member });
            return result || 0;
        }
        catch (error) {
            console.error(`Redis ZADD error for key ${key}:`, error);
            return 0;
        }
    }
    async zrange(key, start, stop) {
        try {
            return await this.redis.zrange(key, start, stop);
        }
        catch (error) {
            console.error(`Redis ZRANGE error for key ${key}:`, error);
            return [];
        }
    }
    async zrem(key, member) {
        try {
            return await this.redis.zrem(key, member);
        }
        catch (error) {
            console.error(`Redis ZREM error for key ${key}:`, error);
            return 0;
        }
    }
    async expire(key, seconds) {
        try {
            const result = await this.redis.expire(key, seconds);
            return result === 1;
        }
        catch (error) {
            console.error(`Redis EXPIRE error for key ${key}:`, error);
            return false;
        }
    }
    async ttl(key) {
        try {
            return await this.redis.ttl(key);
        }
        catch (error) {
            console.error(`Redis TTL error for key ${key}:`, error);
            return -1;
        }
    }
    async keys(pattern) {
        try {
            return await this.redis.keys(pattern);
        }
        catch (error) {
            console.error(`Redis KEYS error for pattern ${pattern}:`, error);
            return [];
        }
    }
    async flushdb() {
        try {
            await this.redis.flushdb();
        }
        catch (error) {
            console.error('Redis FLUSHDB error:', error);
            throw error;
        }
    }
    // Session management methods
    async setSession(sessionId, data, expireInSeconds = 3600) {
        const key = `session:${sessionId}`;
        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        await this.set(key, payload, { ex: expireInSeconds });
    }
    async getSession(sessionId) {
        const key = `session:${sessionId}`;
        const data = await this.get(key);
        if (!data) {
            return null;
        }
        if (typeof data === 'string') {
            try {
                return JSON.parse(data);
            }
            catch (error) {
                console.error(`Redis GET parse error for key ${key}:`, error);
                return null;
            }
        }
        return data;
    }
    async deleteSession(sessionId) {
        const key = `session:${sessionId}`;
        await this.del(key);
    }
    // Cache management methods
    async setCache(key, data, expireInSeconds = 300) {
        const cacheKey = `cache:${key}`;
        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        await this.set(cacheKey, payload, { ex: expireInSeconds });
    }
    async getCache(key) {
        const cacheKey = `cache:${key}`;
        const data = await this.get(cacheKey);
        if (!data) {
            return null;
        }
        if (typeof data === 'string') {
            try {
                return JSON.parse(data);
            }
            catch (error) {
                console.error(`Redis cache parse error for key ${cacheKey}:`, error);
                return null;
            }
        }
        return data;
    }
    async deleteCache(key) {
        const cacheKey = `cache:${key}`;
        await this.del(cacheKey);
    }
    // Cost tracking methods
    async trackCost(userId, service, tokens, cost) {
        const date = new Date().toISOString().split('T')[0];
        const key = `cost:${userId}:${date}`;
        await this.hset(key, `${service}:tokens`, tokens.toString());
        await this.hset(key, `${service}:cost`, cost.toString());
        await this.expire(key, 86400 * 31); // 31 days retention
    }
    async getCostSummary(userId, date) {
        const key = `cost:${userId}:${date}`;
        return await this.hgetall(key);
    }
}
exports.UpstashRedisService = UpstashRedisService;
// Singleton instance
let redisService = null;
const getRedisService = () => {
    if (!redisService) {
        redisService = new UpstashRedisService();
    }
    return redisService;
};
exports.getRedisService = getRedisService;
//# sourceMappingURL=redis-service.js.map