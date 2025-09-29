jest.mock('dotenv', () => ({ config: jest.fn() }));

const originalEnvRef = process.env;
const originalEnvSnapshot = { ...process.env };

const appEnvKeys = [
  'UPSTASH_REDIS_URL',
  'UPSTASH_REDIS_TOKEN',
  'HUGGINGFACE_API_KEY',
  'HUGGINGFACE_BASE_URL',
  'MYSQL_HOST',
  'MYSQL_PORT',
  'MYSQL_USER',
  'MYSQL_PASSWORD',
  'MYSQL_DATABASE',
  'PORT',
  'NODE_ENV',
  'OPENAI_API_KEY',
  'MONTHLY_BUDGET_LIMIT',
  'COST_ALERT_THRESHOLD',
  'EMBEDDING_MODEL_1',
  'EMBEDDING_MODEL_2',
  'EMBEDDING_MODEL_3',
  'EMBEDDING_MODEL_4',
  'EMBEDDING_MODEL_5',
];

type AppConfig = typeof import('../../src/config/environment').config;

const loadConfig = (): AppConfig => {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires -- dynamic import for test isolation
  const moduleExports = require('../../src/config/environment');
  return moduleExports.config as AppConfig;
};

describe('Environment Configuration', () => {
  beforeEach(() => {
    process.env = { ...originalEnvSnapshot };
    appEnvKeys.forEach(key => {
      delete process.env[key];
    });
  });

  afterAll(() => {
    process.env = originalEnvRef;
  });

  describe('Default Configuration', () => {
    test('should load default values', () => {
      const config = loadConfig();

      expect(config.server.port).toBeDefined();
      expect(config.server.nodeEnv).toBeDefined();
      expect(typeof config.server.port).toBe('number');
      expect(typeof config.server.nodeEnv).toBe('string');
    });

    test('should have required configuration sections', () => {
      const config = loadConfig();

      expect(config).toHaveProperty('redis');
      expect(config).toHaveProperty('huggingface');
      expect(config).toHaveProperty('database');
    });
  });

  describe('Redis Configuration', () => {
    test('should load Redis URL and token from environment', () => {
      process.env.UPSTASH_REDIS_URL = 'redis://test-url';
      process.env.UPSTASH_REDIS_TOKEN = 'test-token';

      const config = loadConfig();

      expect(config.redis.url).toBe('redis://test-url');
      expect(config.redis.token).toBe('test-token');
    });

    test('should handle missing Redis configuration', () => {
      const config = loadConfig();

      expect(config.redis.url).toBe('');
      expect(config.redis.token).toBe('');
    });
  });

  describe('HuggingFace Configuration', () => {
    test('should load HuggingFace API key', () => {
      process.env.HUGGINGFACE_API_KEY = 'hf-test-key';

      const config = loadConfig();

      expect(config.huggingface.apiKey).toBe('hf-test-key');
    });

    test('should have base URL configuration', () => {
      const config = loadConfig();

      expect(config.huggingface).toHaveProperty('baseUrl');
      expect(config.huggingface.baseUrl).toBeDefined();
    });
  });

  describe('Embedding Models Configuration', () => {
    test('should have embedding model configuration', () => {
      const config = loadConfig();

      expect(config).toHaveProperty('embeddingModels');
      expect(config.embeddingModels).toHaveProperty('model1');
      expect(config.embeddingModels.model1).toBeDefined();
    });

    test('should have multiple embedding models configured', () => {
      const config = loadConfig();
      const models = Object.keys(config.embeddingModels);

      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain('model1');
    });
  });

  describe('Database Configuration', () => {
    test('should load database configuration', () => {
      process.env.MYSQL_HOST = 'test-host';

      const config = loadConfig();

      expect(config.database.host).toBe('test-host');
    });

    test('should have default database configuration', () => {
      const config = loadConfig();

      expect(config.database).toHaveProperty('host');
      expect(config.database).toHaveProperty('port');
      expect(config.database).toHaveProperty('user');
    });
  });

  describe('Environment-specific Configuration', () => {
    test('should detect test environment', () => {
      process.env.NODE_ENV = 'test';

      const config = loadConfig();

      expect(config.server.nodeEnv).toBe('test');
    });

    test('should detect production environment', () => {
      process.env.NODE_ENV = 'production';

      const config = loadConfig();

      expect(config.server.nodeEnv).toBe('production');
    });

    test('should default to development environment', () => {
      const config = loadConfig();

      expect(config.server.nodeEnv).toBe('development');
    });
  });

  describe('Port Configuration', () => {
    test('should use PORT environment variable', () => {
      process.env.PORT = '8080';

      const config = loadConfig();

      expect(config.server.port).toBe(8080);
    });

    test('should default to 4000', () => {
      const config = loadConfig();

      expect(config.server.port).toBe(4000);
    });

    test('should parse string port to number', () => {
      process.env.PORT = '3000';

      const config = loadConfig();

      expect(typeof config.server.port).toBe('number');
      expect(config.server.port).toBe(3000);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate required configurations in production', () => {
      process.env.NODE_ENV = 'production';

      expect(() => {
        loadConfig();
      }).not.toThrow();
    });
  });

  describe('Security Configuration', () => {
    test('should limit exposure of sensitive data to required fields', () => {
      process.env.OPENAI_API_KEY = 'sk-secret-key';
      process.env.UPSTASH_REDIS_TOKEN = 'secret-token';

      const config = loadConfig();
      const configString = JSON.stringify(config);

      expect(config.redis.token).toBe('secret-token');
      expect(configString.includes('sk-secret-key')).toBe(false);
    });
  });
});
