import { Redis } from '@upstash/redis';
import { config } from '../config/environment';

/* eslint-disable @typescript-eslint/no-unused-vars, no-unused-vars */
export interface RedisService {
  get<T = any>(key: string): Promise<T | null>;
  set(key: string, value: any, options?: { ex?: number; px?: number }): Promise<void>;
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
/* eslint-enable @typescript-eslint/no-unused-vars, no-unused-vars */

class UpstashRedisService implements RedisService {
  private redis: Redis;

  constructor() {
    if (!config.redis.url || !config.redis.token) {
      throw new Error('Upstash Redis URL and TOKEN are required');
    }

    this.redis = new Redis({
      url: config.redis.url,
      token: config.redis.token,
    });
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const result = await this.redis.get(key);
      return result as T;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, options?: { ex?: number; px?: number }): Promise<void> {
    try {
      if (options?.ex) {
        await this.redis.set(key, value, { ex: options.ex });
      } else if (options?.px) {
        await this.redis.set(key, value, { px: options.px });
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      throw error;
    }
  }

  async del(key: string): Promise<number> {
    try {
      return await this.redis.del(key);
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  async hget<T = any>(key: string, field: string): Promise<T | null> {
    try {
      const result = await this.redis.hget(key, field);
      return result as T;
    } catch (error) {
      console.error(`Redis HGET error for key ${key}, field ${field}:`, error);
      return null;
    }
  }

  async hset(key: string, field: string, value: any): Promise<void> {
    try {
      await this.redis.hset(key, { [field]: value });
    } catch (error) {
      console.error(`Redis HSET error for key ${key}, field ${field}:`, error);
      throw error;
    }
  }

  async hgetall<T = Record<string, any>>(key: string): Promise<T> {
    try {
      const result = await this.redis.hgetall(key);
      return result as T;
    } catch (error) {
      console.error(`Redis HGETALL error for key ${key}:`, error);
      return {} as T;
    }
  }

  async hdel(key: string, field: string): Promise<number> {
    try {
      return await this.redis.hdel(key, field);
    } catch (error) {
      console.error(`Redis HDEL error for key ${key}, field ${field}:`, error);
      return 0;
    }
  }

  async sadd(key: string, member: string): Promise<number> {
    try {
      return await this.redis.sadd(key, member);
    } catch (error) {
      console.error(`Redis SADD error for key ${key}:`, error);
      return 0;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      return await this.redis.smembers(key);
    } catch (error) {
      console.error(`Redis SMEMBERS error for key ${key}:`, error);
      return [];
    }
  }

  async srem(key: string, member: string): Promise<number> {
    try {
      return await this.redis.srem(key, member);
    } catch (error) {
      console.error(`Redis SREM error for key ${key}:`, error);
      return 0;
    }
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    try {
      const result = await this.redis.zadd(key, { score, member });
      return result || 0;
    } catch (error) {
      console.error(`Redis ZADD error for key ${key}:`, error);
      return 0;
    }
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.redis.zrange(key, start, stop);
    } catch (error) {
      console.error(`Redis ZRANGE error for key ${key}:`, error);
      return [];
    }
  }

  async zrem(key: string, member: string): Promise<number> {
    try {
      return await this.redis.zrem(key, member);
    } catch (error) {
      console.error(`Redis ZREM error for key ${key}:`, error);
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, seconds);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      console.error(`Redis TTL error for key ${key}:`, error);
      return -1;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      console.error(`Redis KEYS error for pattern ${pattern}:`, error);
      return [];
    }
  }

  async flushdb(): Promise<void> {
    try {
      await this.redis.flushdb();
    } catch (error) {
      console.error('Redis FLUSHDB error:', error);
      throw error;
    }
  }

  // Session management methods
  async setSession(sessionId: string, data: any, expireInSeconds = 3600): Promise<void> {
    const key = `session:${sessionId}`;
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    await this.set(key, payload, { ex: expireInSeconds });
  }

  async getSession<T = any>(sessionId: string): Promise<T | null> {
    const key = `session:${sessionId}`;
    const data = await this.get(key);
    if (!data) {
      return null;
    }

    if (typeof data === 'string') {
      try {
        return JSON.parse(data) as T;
      } catch (error) {
        console.error(`Redis GET parse error for key ${key}:`, error);
        return null;
      }
    }

    return data as T;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.del(key);
  }

  // Cache management methods
  async setCache(key: string, data: any, expireInSeconds = 300): Promise<void> {
    const cacheKey = `cache:${key}`;
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    await this.set(cacheKey, payload, { ex: expireInSeconds });
  }

  async getCache<T = any>(key: string): Promise<T | null> {
    const cacheKey = `cache:${key}`;
    const data = await this.get(cacheKey);
    if (!data) {
      return null;
    }

    if (typeof data === 'string') {
      try {
        return JSON.parse(data) as T;
      } catch (error) {
        console.error(`Redis cache parse error for key ${cacheKey}:`, error);
        return null;
      }
    }

    return data as T;
  }

  async deleteCache(key: string): Promise<void> {
    const cacheKey = `cache:${key}`;
    await this.del(cacheKey);
  }

  // Cost tracking methods
  async trackCost(userId: string, service: string, tokens: number, cost: number): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const key = `cost:${userId}:${date}`;
    
    await this.hset(key, `${service}:tokens`, tokens.toString());
    await this.hset(key, `${service}:cost`, cost.toString());
    await this.expire(key, 86400 * 31); // 31 days retention
  }

  async getCostSummary(userId: string, date: string): Promise<Record<string, any>> {
    const key = `cost:${userId}:${date}`;
    return await this.hgetall(key);
  }
}

// Singleton instance
let redisService: UpstashRedisService | null = null;

export const getRedisService = (): UpstashRedisService => {
  if (!redisService) {
    redisService = new UpstashRedisService();
  }
  return redisService;
};

export { UpstashRedisService };
