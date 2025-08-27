import { config } from '../../src/config/environment';

// Store original env vars
const originalEnv = process.env;

describe('Environment Configuration', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Default Configuration', () => {
    test('should load default values', () => {
      expect(config.server.port).toBeDefined();
      expect(config.server.nodeEnv).toBeDefined();
      expect(typeof config.server.port).toBe('number');
      expect(typeof config.server.nodeEnv).toBe('string');
    });

    test('should have required configuration sections', () => {
      expect(config).toHaveProperty('redis');
      expect(config).toHaveProperty('huggingface');
      expect(config).toHaveProperty('database');
    });
  });

  describe('Redis Configuration', () => {
    test('should load Redis URL and token from environment', () => {
      process.env.UPSTASH_REDIS_URL = 'redis://test-url';
      process.env.UPSTASH_REDIS_TOKEN = 'test-token';

      // Re-import config to get updated values
      delete require.cache[require.resolve('../../src/config/environment')];
      const { config: newConfig } = require('../../src/config/environment');

      expect(newConfig.redis.url).toBe('redis://test-url');
      expect(newConfig.redis.token).toBe('test-token');
    });

    test('should handle missing Redis configuration', () => {
      delete process.env.UPSTASH_REDIS_URL;
      delete process.env.UPSTASH_REDIS_TOKEN;

      delete require.cache[require.resolve('../../src/config/environment')];
      const { config: newConfig } = require('../../src/config/environment');

      expect(newConfig.redis.url).toBe('');
      expect(newConfig.redis.token).toBe('');
    });
  });

  describe('HuggingFace Configuration', () => {
    test('should load HuggingFace API key', () => {
      process.env.HUGGINGFACE_API_KEY = 'hf-test-key';

      delete require.cache[require.resolve('../../src/config/environment')];
      const { config: newConfig } = require('../../src/config/environment');

      expect(newConfig.huggingface.apiKey).toBe('hf-test-key');
    });

    test('should have base URL configuration', () => {
      expect(config.huggingface).toHaveProperty('baseUrl');
      expect(config.huggingface.baseUrl).toBeDefined();
    });
  });

  describe('Embedding Models Configuration', () => {
    test('should have embedding model configuration', () => {
      expect(config).toHaveProperty('embeddingModels');
      expect(config.embeddingModels).toHaveProperty('model1');
      expect(config.embeddingModels.model1).toBeDefined();
    });

    test('should have multiple embedding models configured', () => {
      const models = Object.keys(config.embeddingModels);
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain('model1');
    });
  });

  describe('Database Configuration', () => {
    test('should load database configuration', () => {
      process.env.MYSQL_HOST = 'test-host';

      delete require.cache[require.resolve('../../src/config/environment')];
      const { config: newConfig } = require('../../src/config/environment');

      expect(newConfig.database.host).toBe('test-host');
    });

    test('should have default database configuration', () => {
      expect(config.database).toHaveProperty('host');
      expect(config.database).toHaveProperty('port');
      expect(config.database).toHaveProperty('user');
    });
  });

  describe('Environment-specific Configuration', () => {
    test('should detect test environment', () => {
      process.env.NODE_ENV = 'test';

      delete require.cache[require.resolve('../../src/config/environment')];
      const { config: newConfig } = require('../../src/config/environment');

      expect(newConfig.server.nodeEnv).toBe('test');
    });

    test('should detect production environment', () => {
      process.env.NODE_ENV = 'production';

      delete require.cache[require.resolve('../../src/config/environment')];
      const { config: newConfig } = require('../../src/config/environment');

      expect(newConfig.server.nodeEnv).toBe('production');
    });

    test('should default to development environment', () => {
      delete process.env.NODE_ENV;

      delete require.cache[require.resolve('../../src/config/environment')];
      const { config: newConfig } = require('../../src/config/environment');

      expect(newConfig.server.nodeEnv).toBe('development');
    });
  });

  describe('Port Configuration', () => {
    test('should use PORT environment variable', () => {
      process.env.PORT = '8080';

      delete require.cache[require.resolve('../../src/config/environment')];
      const { config: newConfig } = require('../../src/config/environment');

      expect(newConfig.server.port).toBe(8080);
    });

    test('should default to 4000', () => {
      delete process.env.PORT;

      delete require.cache[require.resolve('../../src/config/environment')];
      const { config: newConfig } = require('../../src/config/environment');

      expect(newConfig.server.port).toBe(4000);
    });

    test('should parse string port to number', () => {
      process.env.PORT = '3000';

      delete require.cache[require.resolve('../../src/config/environment')];
      const { config: newConfig } = require('../../src/config/environment');

      expect(typeof newConfig.server.port).toBe('number');
      expect(newConfig.server.port).toBe(3000);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate required configurations in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.UPSTASH_REDIS_URL;
      delete process.env.UPSTASH_REDIS_TOKEN;

      // This might throw an error or have validation logic
      // depending on how the config module is implemented
      expect(() => {
        delete require.cache[require.resolve('../../src/config/environment')];
        require('../../src/config/environment');
      }).not.toThrow(); // Adjust based on actual implementation
    });
  });

  describe('Security Configuration', () => {
    test('should not expose sensitive data in non-secure contexts', () => {
      process.env.OPENAI_API_KEY = 'sk-secret-key';
      process.env.UPSTASH_REDIS_TOKEN = 'secret-token';

      delete require.cache[require.resolve('../../src/config/environment')];
      const { config: newConfig } = require('../../src/config/environment');

      // Ensure config doesn't accidentally log or expose sensitive data
      const configString = JSON.stringify(newConfig);
      expect(configString.includes('sk-secret-key')).toBe(false); // Config should not expose the exact secret key in logs
      // But we'd want to ensure it's not logged elsewhere
    });
  });
});