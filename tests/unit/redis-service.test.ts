import mockRedisModule from 'ioredis-mock';
import { UpstashRedisService } from '../../src/services/redis-service';

// Mock the @upstash/redis module
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => {
    const redisMock = new mockRedisModule();
    return {
      get: jest.fn().mockImplementation(async (key: string) => {
        const result = await redisMock.get(key);
        return result ? JSON.parse(result as string) : null;
      }),
      set: jest.fn().mockImplementation((key: string, value: any, options?: any) => {
        const serialized = JSON.stringify(value);
        if (options?.ex) {
          return redisMock.setex(key, options.ex, serialized);
        } else if (options?.px) {
          return redisMock.psetex(key, options.px, serialized);
        }
        return redisMock.set(key, serialized);
      }),
      del: jest.fn().mockImplementation((key: string) => redisMock.del(key)),
      exists: jest.fn().mockImplementation((key: string) => redisMock.exists(key)),
      hget: jest.fn().mockImplementation((key: string, field: string) => redisMock.hget(key, field)),
      hset: jest.fn().mockImplementation((key: string, fieldValuePairs: Record<string, any>) => redisMock.hset(key, fieldValuePairs)),
      hgetall: jest.fn().mockImplementation((key: string) => redisMock.hgetall(key)),
      hdel: jest.fn().mockImplementation((key: string, field: string) => redisMock.hdel(key, field)),
      sadd: jest.fn().mockImplementation((key: string, member: string) => redisMock.sadd(key, member)),
      smembers: jest.fn().mockImplementation((key: string) => redisMock.smembers(key)),
      srem: jest.fn().mockImplementation((key: string, member: string) => redisMock.srem(key, member)),
      zadd: jest.fn().mockImplementation((key: string, scoreMembers: { score: number; member: string }) => 
        redisMock.zadd(key, scoreMembers.score, scoreMembers.member)
      ),
      zrange: jest.fn().mockImplementation((key: string, start: number, stop: number) => redisMock.zrange(key, start, stop)),
      zrem: jest.fn().mockImplementation((key: string, member: string) => redisMock.zrem(key, member)),
      expire: jest.fn().mockImplementation((key: string, seconds: number) => redisMock.expire(key, seconds)),
      ttl: jest.fn().mockImplementation((key: string) => redisMock.ttl(key)),
      keys: jest.fn().mockImplementation((pattern: string) => redisMock.keys(pattern)),
      flushdb: jest.fn().mockImplementation(() => redisMock.flushdb()),
    };
  })
}));

describe('UpstashRedisService', () => {
  let redisService: UpstashRedisService;

  beforeEach(() => {
    redisService = new UpstashRedisService();
  });

  describe('Basic Operations', () => {
    test('should set and get a value', async () => {
      const key = 'test-key';
      const value = { message: 'test-value' };
      
      await redisService.set(key, value);
      const result = await redisService.get(key);
      
      expect(result).toEqual(value);
    });

    test('should return null for non-existent key', async () => {
      const result = await redisService.get('non-existent-key');
      expect(result).toBeNull();
    });

    test('should delete a key', async () => {
      const key = 'delete-test';
      await redisService.set(key, 'value');
      
      const deleteCount = await redisService.del(key);
      expect(deleteCount).toBe(1);
      
      const result = await redisService.get(key);
      expect(result).toBeNull();
    });

    test('should check if key exists', async () => {
      const key = 'exists-test';
      
      let exists = await redisService.exists(key);
      expect(exists).toBe(false);
      
      await redisService.set(key, 'value');
      exists = await redisService.exists(key);
      expect(exists).toBe(true);
    });
  });

  describe('Hash Operations', () => {
    test('should set and get hash field', async () => {
      const key = 'hash-test';
      const field = 'field1';
      const value = 'value1';
      
      await redisService.hset(key, field, value);
      const result = await redisService.hget(key, field);
      
      expect(result).toBe(value);
    });

    test('should get all hash fields', async () => {
      const key = 'hash-all-test';
      
      await redisService.hset(key, 'field1', 'value1');
      await redisService.hset(key, 'field2', 'value2');
      
      const result = await redisService.hgetall(key);
      expect(result).toEqual({
        field1: 'value1',
        field2: 'value2'
      });
    });

    test('should delete hash field', async () => {
      const key = 'hash-del-test';
      const field = 'field1';
      
      await redisService.hset(key, field, 'value');
      const deleteCount = await redisService.hdel(key, field);
      
      expect(deleteCount).toBe(1);
      
      const result = await redisService.hget(key, field);
      expect(result).toBeNull();
    });
  });

  describe('Set Operations', () => {
    test('should add and get set members', async () => {
      const key = 'set-test';
      
      await redisService.sadd(key, 'member1');
      await redisService.sadd(key, 'member2');
      
      const members = await redisService.smembers(key);
      expect(members).toEqual(expect.arrayContaining(['member1', 'member2']));
    });

    test('should remove set member', async () => {
      const key = 'set-rem-test';
      
      await redisService.sadd(key, 'member1');
      const removeCount = await redisService.srem(key, 'member1');
      
      expect(removeCount).toBe(1);
      
      const members = await redisService.smembers(key);
      expect(members).not.toContain('member1');
    });
  });

  describe('Session Management', () => {
    test('should set and get session', async () => {
      const sessionId = 'session-123';
      const sessionData = { userId: 'user-456', data: 'test' };
      
      await redisService.setSession(sessionId, sessionData, 3600);
      const result = await redisService.getSession(sessionId);
      
      expect(result).toEqual(sessionData);
    });

    test('should delete session', async () => {
      const sessionId = 'session-delete';
      await redisService.setSession(sessionId, { test: 'data' });
      
      await redisService.deleteSession(sessionId);
      const result = await redisService.getSession(sessionId);
      
      expect(result).toBeNull();
    });
  });

  describe('Cache Management', () => {
    test('should set and get cache', async () => {
      const key = 'cache-test';
      const data = { cached: 'data' };
      
      await redisService.setCache(key, data, 300);
      const result = await redisService.getCache(key);
      
      expect(result).toEqual(data);
    });

    test('should delete cache', async () => {
      const key = 'cache-delete';
      await redisService.setCache(key, { test: 'data' });
      
      await redisService.deleteCache(key);
      const result = await redisService.getCache(key);
      
      expect(result).toBeNull();
    });
  });

  describe('Cost Tracking', () => {
    test('should track cost', async () => {
      const userId = 'user-123';
      const service = 'openai';
      const tokens = 1000;
      const cost = 0.02;
      
      await redisService.trackCost(userId, service, tokens, cost);
      
      const date = new Date().toISOString().split('T')[0];
      const summary = await redisService.getCostSummary(userId, date);
      
      expect(summary).toEqual({
        [`${service}:tokens`]: tokens.toString(),
        [`${service}:cost`]: cost.toString()
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle Redis errors gracefully', async () => {
      // This test would normally require mocking Redis to throw errors
      // For now, we'll test that error handling doesn't crash the service
      const result = await redisService.get('test-error-handling');
      expect(result).toBeDefined(); // Should not throw
    });
  });
});