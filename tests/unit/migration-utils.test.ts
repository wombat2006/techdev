import fs from 'fs';
import path from 'path';
import { migrateSQLiteToRedis, validateMigration, cleanupOldData } from '../../src/utils/migrate-to-redis';
import { getRedisService } from '../../src/services/redis-service';

// Mock dependencies
jest.mock('fs');
jest.mock('sqlite3', () => ({}));
jest.mock('../../src/services/redis-service');

describe('Migration Utils', () => {
  let mockRedisService: any;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    mockRedisService = {
      set: jest.fn(),
      get: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      keys: jest.fn(),
      del: jest.fn(),
      flushdb: jest.fn(),
    };
    
    (getRedisService as jest.Mock).mockReturnValue(mockRedisService);
    
    // Mock fs methods
    mockFs.existsSync = jest.fn();
    mockFs.readFileSync = jest.fn();
    mockFs.writeFileSync = jest.fn();
    mockFs.unlinkSync = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('migrateSQLiteToRedis', () => {
    test('should migrate data from SQLite to Redis', async () => {
      const sqliteDbPath = '/test/path/data.db';
      
      // Mock SQLite file exists
      mockFs.existsSync.mockReturnValue(true);
      
      // Mock successful Redis operations
      mockRedisService.set.mockResolvedValue(undefined);
      mockRedisService.hset.mockResolvedValue(undefined);

      const result = await migrateSQLiteToRedis(sqliteDbPath);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('migratedCount');
      expect(result).toHaveProperty('errors');
      expect(mockFs.existsSync).toHaveBeenCalledWith(sqliteDbPath);
    });

    test('should handle non-existent SQLite file', async () => {
      const sqliteDbPath = '/nonexistent/data.db';
      
      mockFs.existsSync.mockReturnValue(false);

      const result = await migrateSQLiteToRedis(sqliteDbPath);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('SQLite file not found'));
    });

    test('should handle Redis connection errors', async () => {
      const sqliteDbPath = '/test/path/data.db';
      
      mockFs.existsSync.mockReturnValue(true);
      mockRedisService.set.mockRejectedValue(new Error('Redis connection failed'));

      const result = await migrateSQLiteToRedis(sqliteDbPath);
      
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('Redis')
      ]));
    });

    test('should create backup before migration', async () => {
      const sqliteDbPath = '/test/path/data.db';
      const backupPath = `${sqliteDbPath}.backup.${new Date().toISOString().split('T')[0]}`;
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(Buffer.from('test data'));
      mockRedisService.set.mockResolvedValue(undefined);

      await migrateSQLiteToRedis(sqliteDbPath, { createBackup: true });
      
      expect(mockFs.readFileSync).toHaveBeenCalledWith(sqliteDbPath);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('backup'),
        expect.any(Buffer)
      );
    });
  });

  describe('validateMigration', () => {
    test('should validate successful migration', async () => {
      const testKeys = ['session:123', 'cache:test', 'cost:user:2024-01-01'];
      
      mockRedisService.keys.mockResolvedValue(testKeys);
      mockRedisService.get.mockResolvedValue('test-data');

      const validation = await validateMigration();
      
      expect(validation.isValid).toBe(true);
      expect(validation.redisKeyCount).toBe(testKeys.length);
      expect(validation.errors).toEqual([]);
    });

    test('should detect validation errors', async () => {
      mockRedisService.keys.mockResolvedValue([]);
      
      const validation = await validateMigration();
      
      expect(validation.isValid).toBe(false);
      expect(validation.redisKeyCount).toBe(0);
      expect(validation.errors).toContain('No data found in Redis');
    });

    test('should handle Redis errors during validation', async () => {
      mockRedisService.keys.mockRejectedValue(new Error('Redis error'));
      
      const validation = await validateMigration();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(expect.stringContaining('Redis error'));
    });

    test('should validate data integrity', async () => {
      const testKeys = ['session:test1'];
      
      mockRedisService.keys.mockResolvedValue(testKeys);
      mockRedisService.get.mockResolvedValue('{"valid": "json"}');

      const validation = await validateMigration();
      
      expect(validation.isValid).toBe(true);
      expect(validation.redisKeyCount).toBe(testKeys.length);
    });
  });

  describe('cleanupOldData', () => {
    test('should cleanup old SQLite files', async () => {
      const filesToClean = [
        '/test/data1.db',
        '/test/data2.db',
        '/test/backup.db'
      ];
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockReturnValue(undefined);

      const result = await cleanupOldData(filesToClean);
      
      expect(result.success).toBe(true);
      expect(result.deletedFiles).toEqual(filesToClean);
      expect(mockFs.unlinkSync).toHaveBeenCalledTimes(filesToClean.length);
    });

    test('should handle non-existent files gracefully', async () => {
      const filesToClean = ['/nonexistent/file.db'];
      
      mockFs.existsSync.mockReturnValue(false);

      const result = await cleanupOldData(filesToClean);
      
      expect(result.success).toBe(true);
      expect(result.skippedFiles).toEqual(filesToClean);
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });

    test('should handle file deletion errors', async () => {
      const filesToClean = ['/test/locked.db'];
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await cleanupOldData(filesToClean);
      
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('Permission denied')])
      );
    });

    test('should provide dry run option', async () => {
      const filesToClean = ['/test/data.db'];
      
      mockFs.existsSync.mockReturnValue(true);

      const result = await cleanupOldData(filesToClean, { dryRun: true });
      
      expect(result.success).toBe(true);
      expect(result.wouldDeleteFiles).toEqual(filesToClean);
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('Migration Error Recovery', () => {
    test('should rollback on migration failure', async () => {
      const sqliteDbPath = '/test/data.db';
      
      mockFs.existsSync.mockReturnValue(true);
      mockRedisService.set
        .mockResolvedValueOnce(undefined) // first operation succeeds
        .mockRejectedValueOnce(new Error('Redis error')); // second fails

      const result = await migrateSQLiteToRedis(sqliteDbPath, { 
        enableRollback: true 
      });
      
      expect(result.success).toBe(false);
      expect(result.rollbackPerformed).toBe(true);
    });

    test('should preserve original data on rollback', async () => {
      const sqliteDbPath = '/test/data.db';
      
      mockFs.existsSync.mockReturnValue(true);
      mockRedisService.set.mockRejectedValue(new Error('Migration failed'));

      const result = await migrateSQLiteToRedis(sqliteDbPath, { 
        createBackup: true,
        enableRollback: true 
      });
      
      expect(result.rollbackPerformed).toBe(true);
    });
  });

  describe('Migration Progress Tracking', () => {
    test('should track migration progress', async () => {
      const sqliteDbPath = '/test/data.db';
      const progressCallback = jest.fn();
      
      mockFs.existsSync.mockReturnValue(true);
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await migrateSQLiteToRedis(sqliteDbPath, { 
        onProgress: progressCallback 
      });
      
      expect(result.success).toBe(true);
    });

    test('should report migration statistics', async () => {
      const sqliteDbPath = '/test/data.db';
      
      mockFs.existsSync.mockReturnValue(true);
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await migrateSQLiteToRedis(sqliteDbPath);
      
      expect(result).toHaveProperty('migratedCount');
      expect(result).toHaveProperty('errors');
      expect(typeof result.migratedCount).toBe('number');
      expect(result.success).toBe(true);
    });
  });
});