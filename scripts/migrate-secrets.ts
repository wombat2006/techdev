#!/usr/bin/env ts-node
/**
 * .env → AWS Secrets Manager 移行スクリプト
 *
 * 使用方法:
 *   ts-node scripts/migrate-secrets.ts --secret-name techsapo/production --region us-east-1
 *
 * または:
 *   npm run migrate-secrets
 */

import dotenv from 'dotenv';
import { AWSSecretsManagerService, TechSapoSecrets } from '../src/services/aws-secrets-manager';
import { program } from 'commander';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// コマンドライン引数解析
program
  .name('migrate-secrets')
  .description('Migrate .env secrets to AWS Secrets Manager')
  .option('-s, --secret-name <name>', 'AWS Secrets Manager secret name', 'techsapo/production')
  .option('-r, --region <region>', 'AWS region', process.env.AWS_REGION || 'us-east-1')
  .option('-e, --env-file <path>', '.env file path', '.env')
  .option('--dry-run', 'Dry run mode (no actual upload)', false)
  .option('--update', 'Update existing secret instead of creating new one', false)
  .parse();

const options = program.opts();

/**
 * .envファイルからシークレット読み込み
 */
function loadEnvSecrets(envFilePath: string): TechSapoSecrets {
  const fullPath = resolve(process.cwd(), envFilePath);

  console.log(`📂 Loading secrets from: ${fullPath}`);

  dotenv.config({ path: fullPath });

  const secrets: TechSapoSecrets = {
    // LLM Provider API Keys
    HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY || '',
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    CONTEXT7_API_KEY: process.env.CONTEXT7_API_KEY,

    // Redis Configuration
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || '',
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || '',

    // Database Configuration
    MYSQL_HOST: process.env.MYSQL_HOST,
    MYSQL_PORT: process.env.MYSQL_PORT,
    MYSQL_USER: process.env.MYSQL_USER,
    MYSQL_PASSWORD: process.env.MYSQL_PASSWORD,
    MYSQL_DATABASE: process.env.MYSQL_DATABASE,

    // Google OAuth
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
    GOOGLE_WEBHOOK_TOKEN: process.env.GOOGLE_WEBHOOK_TOKEN,

    // Monitoring & Logging
    LOG_LEVEL: process.env.LOG_LEVEL,

    // Cost Management
    MONTHLY_BUDGET_LIMIT: process.env.MONTHLY_BUDGET_LIMIT,
    COST_ALERT_THRESHOLD: process.env.COST_ALERT_THRESHOLD,
  };

  // 空の値を除外
  const filteredSecrets: any = {};
  Object.entries(secrets).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      filteredSecrets[key] = value;
    }
  });

  return filteredSecrets as TechSapoSecrets;
}

/**
 * シークレット検証
 */
function validateSecrets(secrets: TechSapoSecrets): void {
  const required = [
    'HUGGINGFACE_API_KEY',
    'OPENROUTER_API_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
  ];

  const missing = required.filter(key => !secrets[key as keyof TechSapoSecrets]);

  if (missing.length > 0) {
    console.error(`❌ Missing required secrets: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log(`✅ All required secrets present`);
}

/**
 * シークレット表示（マスク付き）
 */
function displaySecrets(secrets: TechSapoSecrets): void {
  console.log('\n📋 Secrets to be migrated:');
  console.log('─'.repeat(60));

  Object.entries(secrets).forEach(([key, value]) => {
    if (value) {
      const maskedValue = value.length > 10
        ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
        : '***';
      console.log(`  ${key}: ${maskedValue}`);
    }
  });

  console.log('─'.repeat(60));
  console.log(`Total secrets: ${Object.keys(secrets).length}\n`);
}

/**
 * メイン処理
 */
async function main() {
  console.log('\n🔐 AWS Secrets Manager Migration Tool\n');

  try {
    // 1. .envファイル読み込み
    const secrets = loadEnvSecrets(options.envFile);

    // 2. シークレット検証
    validateSecrets(secrets);

    // 3. シークレット表示
    displaySecrets(secrets);

    // 4. Dry runモード
    if (options.dryRun) {
      console.log('🔍 Dry run mode - no actual upload will be performed');
      console.log(`\nTarget:
  Secret Name: ${options.secretName}
  AWS Region:  ${options.region}
  Operation:   ${options.update ? 'UPDATE' : 'CREATE'}
`);
      console.log('✅ Dry run completed successfully');
      return;
    }

    // 5. AWS Secrets Manager初期化
    console.log(`\n🚀 Initializing AWS Secrets Manager...`);
    const secretsManager = new AWSSecretsManagerService({
      secretName: options.secretName,
      region: options.region,
    });

    // 6. シークレット存在確認
    const exists = await secretsManager.secretExists();

    if (exists && !options.update) {
      console.error(`\n❌ Secret already exists: ${options.secretName}`);
      console.error('Use --update flag to update existing secret');
      process.exit(1);
    }

    if (!exists && options.update) {
      console.error(`\n❌ Secret does not exist: ${options.secretName}`);
      console.error('Remove --update flag to create new secret');
      process.exit(1);
    }

    // 7. シークレットアップロード
    console.log(`\n📤 Uploading secrets to AWS Secrets Manager...`);

    if (options.update) {
      await secretsManager.updateSecret(secrets);
      console.log(`✅ Secret updated: ${options.secretName}`);
    } else {
      await secretsManager.createSecret(secrets);
      console.log(`✅ Secret created: ${options.secretName}`);
    }

    // 8. 検証
    console.log(`\n🔍 Verifying uploaded secrets...`);
    const uploadedSecrets = await secretsManager.getSecrets();
    const uploadedKeys = Object.keys(uploadedSecrets);

    console.log(`✅ Verification successful - ${uploadedKeys.length} keys uploaded`);

    // 9. 完了
    console.log(`\n🎉 Migration completed successfully!`);
    console.log(`\nNext steps:
  1. Update your deployment configuration:
     export USE_AWS_SECRETS_MANAGER=true
     export AWS_SECRET_NAME=${options.secretName}
     export AWS_REGION=${options.region}

  2. Restart your application to use AWS Secrets Manager

  3. (Optional) Backup and remove .env file for security
`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
