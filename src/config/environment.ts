import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '4000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  huggingface: {
    apiKey: process.env.HUGGINGFACE_API_KEY || '',
    baseUrl: process.env.HUGGINGFACE_BASE_URL || 'https://api-inference.huggingface.co',
    timeout: 300000, // 5 minutes for complete testing
    retryAttempts: 3,
  },
  redis: {
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN || '',
  },
  database: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'techsapo',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs/app.log',
  },
  costManagement: {
    monthlyBudgetLimit: parseFloat(process.env.MONTHLY_BUDGET_LIMIT || '70'),
    alertThreshold: parseFloat(process.env.COST_ALERT_THRESHOLD || '0.8'),
  },
  embeddingModels: {
    model1: process.env.EMBEDDING_MODEL_1 || 'cl-tohoku/bert-base-japanese-v3',
    model2: process.env.EMBEDDING_MODEL_2 || 'sonoisa/sentence-bert-base-ja-mean-tokens-v2',
    model3: process.env.EMBEDDING_MODEL_3 || 'colorfulscoop/sbert-base-ja',
    model4: process.env.EMBEDDING_MODEL_4 || 'rinna/japanese-roberta-base',
    model5: process.env.EMBEDDING_MODEL_5 || 'tohoku-nlp/bert-base-japanese-v2',
  },
  wallBounce: {
    enableFallback: process.env.ENABLE_WALL_BOUNCE_FALLBACK === 'true',
    enableTimeout: process.env.ENABLE_WALL_BOUNCE_TIMEOUT === 'true',
    timeoutMs: parseInt(process.env.WALL_BOUNCE_TIMEOUT_MS || '0', 10),
    minProviders: parseInt(process.env.WALL_BOUNCE_MIN_PROVIDERS || '1', 10),
  },
};

export const validateEnvironment = (): void => {
  const required = [
    'HUGGINGFACE_API_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

export default config;