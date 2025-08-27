import { config } from '../src/config/environment';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.UPSTASH_REDIS_URL = 'redis://localhost:6379';
process.env.UPSTASH_REDIS_TOKEN = 'test-token';
process.env.HUGGINGFACE_API_KEY = 'test-hf-key';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.PORT = '3001';

// Set test timeout
jest.setTimeout(30000);

// Mock winston logger to avoid console spam
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));