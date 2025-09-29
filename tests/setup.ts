import { config } from '../src/config/environment';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.UPSTASH_REDIS_URL = 'redis://localhost:6379';
process.env.UPSTASH_REDIS_TOKEN = 'test-token';
process.env.HUGGINGFACE_API_KEY = 'test-hf-key';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.PORT = '3001';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret';
process.env.GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || 'test-google-refresh-token';
process.env.GOOGLE_KNOWN_PDF_ID = process.env.GOOGLE_KNOWN_PDF_ID || 'test-doc-1';
process.env.GOOGLE_RAG_FOLDER_ID = process.env.GOOGLE_RAG_FOLDER_ID || 'folder_mock_id_12345';

// Set test timeout
jest.setTimeout(30000);

// Increase EventEmitter max listeners to prevent memory leak warnings
require('events').EventEmitter.defaultMaxListeners = 20;

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

// Provide a virtual mock for googleapis to avoid optional dependency failures in tests
jest.mock('googleapis', () => {
  const { Readable } = require('stream');

  const sampleFile = {
    id: 'test-doc-1',
    name: 'Sample Document.pdf',
    mimeType: 'application/pdf',
    size: '1024',
    modifiedTime: new Date().toISOString(),
    webViewLink: 'https://example.com/doc'
  };

  return {
    google: {
      drive: jest.fn(() => ({
        files: {
          list: jest.fn().mockResolvedValue({ data: { files: [sampleFile] } }),
          get: jest.fn((params: any = {}, options?: any) => {
            const requestedId = params?.fileId;

            if (requestedId && requestedId !== sampleFile.id) {
              return Promise.reject(new Error('File not found'));
            }

            if (options?.responseType === 'stream') {
              return Promise.resolve({
                data: Readable.from(['mock file content'])
              });
            }

            if (options?.responseType === 'arraybuffer') {
              return Promise.resolve({
                data: Buffer.from('mock file content').buffer
              });
            }

            return Promise.resolve({
              data: {
                ...sampleFile,
                id: requestedId || sampleFile.id
              }
            });
          }),
          export: jest.fn().mockResolvedValue({ data: 'exported content' })
        },
        revisions: {
          list: jest.fn().mockResolvedValue({ data: { revisions: [] } })
        },
        permissions: {
          list: jest.fn().mockResolvedValue({ data: { permissions: [] } })
        }
      })),
      auth: {
        OAuth2: jest.fn(() => ({
          setCredentials: jest.fn(),
          on: jest.fn()
        }))
      }
    }
  };
}, { virtual: true });

// Mock OpenAI SDK to avoid importing optional runtime dependencies during tests
jest.mock('openai', () => {
  const mockVectorStores = {
    list: jest.fn().mockResolvedValue({ data: [] }),
    create: jest.fn().mockResolvedValue({ id: 'vs_test' }),
    files: {
      create: jest.fn().mockResolvedValue({ id: 'vs_file_test' })
    }
  };

  const mockFiles = {
    create: jest.fn().mockResolvedValue({ id: 'file_test' })
  };

  const mockBeta = {
    assistants: {
      create: jest.fn().mockResolvedValue({ id: 'asst_test' }),
      del: jest.fn().mockResolvedValue(undefined)
    },
    threads: {
      create: jest.fn().mockResolvedValue({ id: 'thread_test' }),
      messages: {
        create: jest.fn().mockResolvedValue({ id: 'msg_test' }),
        list: jest.fn().mockResolvedValue({ data: [] })
      },
      runs: {
        createAndPoll: jest.fn().mockResolvedValue({ id: 'run_test', status: 'completed' })
      }
    }
  };

  return {
    __esModule: true,
    default: class OpenAI {
      vectorStores: typeof mockVectorStores;
      files: typeof mockFiles;
      beta: typeof mockBeta;

      constructor() {
        this.vectorStores = mockVectorStores;
        this.files = mockFiles;
        this.beta = mockBeta;
      }
    }
  };
}, { virtual: true });

// Stub Upstash Redis client to avoid URL validation during tests
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn().mockResolvedValue(1),
    hget: jest.fn(),
    hset: jest.fn(),
    hgetall: jest.fn().mockResolvedValue({}),
    hdel: jest.fn(),
    sadd: jest.fn(),
    smembers: jest.fn().mockResolvedValue([]),
    srem: jest.fn(),
    zadd: jest.fn(),
    zrange: jest.fn().mockResolvedValue([]),
    zrem: jest.fn(),
    expire: jest.fn().mockResolvedValue(true),
    ttl: jest.fn().mockResolvedValue(-1),
    keys: jest.fn().mockResolvedValue([]),
    flushdb: jest.fn()
  }))
}));

// Ensure fs.createReadStream is safe for tests without hitting the real filesystem
const fsModule = require('fs');
const { Readable } = require('stream');
jest.spyOn(fsModule, 'createReadStream').mockImplementation(() => Readable.from(['test stream content']));
