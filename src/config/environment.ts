import dotenv from 'dotenv';
import { initializeSecretsManager, AWSSecretsManagerService } from '../services/aws-secrets-manager';

/**
 * 環境変数の初期化戦略
 */
export type EnvironmentStrategy = 'dotenv' | 'aws-secrets-manager' | 'hybrid';

/**
 * 環境設定初期化
 */
export async function initializeEnvironment(strategy: EnvironmentStrategy = 'hybrid'): Promise<void> {
  const useSecretsManager = process.env.USE_AWS_SECRETS_MANAGER === 'true';

  if (strategy === 'aws-secrets-manager' || (strategy === 'hybrid' && useSecretsManager)) {
    // AWS Secrets Manager優先
    const secretName = process.env.AWS_SECRET_NAME || 'techsapo/production';
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

    const secretsManager = initializeSecretsManager({
      secretName,
      region,
      cacheTTL: 300000 // 5分
    });

    await secretsManager.loadIntoEnvironment();
  } else {
    // .env ファイル（開発環境・フォールバック）
    dotenv.config();
  }
}

/**
 * アプリケーション設定
 */
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
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: 'https://openrouter.ai/api/v1',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    apiEnabled: process.env.ANTHROPIC_API_ENABLED === 'true', // Safeguard: API使用は明示的許可が必要
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-3-5-sonnet-20241022',
    maxTokens: 8192,
    temperature: 0.7,
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
    enableTimeout: process.env.ENABLE_WALL_BOUNCE_TIMEOUT === 'true',
    timeoutMs: parseInt(process.env.WALL_BOUNCE_TIMEOUT_MS || '0', 10),
    minProviders: parseInt(process.env.WALL_BOUNCE_MIN_PROVIDERS || '2', 10),  // Changed from '1' to '2' to ensure minimum 2 LLMs
  },
  context7: {
    apiKey: process.env.CONTEXT7_API_KEY || '',
    mcpServer: process.env.CONTEXT7_MCP_SERVER || 'https://mcp.context7.com/mcp',
    cacheTTL: parseInt(process.env.CONTEXT7_CACHE_TTL || '3600', 10),
    cacheEnabled: process.env.CONTEXT7_CACHE_ENABLED !== 'false',
  },
  aws: {
    useSecretsManager: process.env.USE_AWS_SECRETS_MANAGER === 'true',
    secretName: process.env.AWS_SECRET_NAME || 'techsapo/production',
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  },
};

/**
 * 環境変数検証
 */
export const validateEnvironment = (): void => {
  const required = [
    'HUGGINGFACE_API_KEY',
    'OPENROUTER_API_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

export default config;