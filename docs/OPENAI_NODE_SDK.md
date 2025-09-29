# OpenAI Node.js SDK - 基本ガイド

## 🚀 Overview

OpenAI Node.js SDK (`openai`) は、OpenAI APIとのやり取りを簡単にするための公式JavaScriptライブラリです。

**公式リポジトリ**: https://github.com/openai/openai-node

## 📦 インストール・セットアップ

### インストール
```bash
npm install openai
```

### 基本設定
```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // 環境変数から取得
  organization: process.env.OPENAI_ORG_ID, // オプション
});
```

### TechSapoでの設定例
```typescript
// src/config/environment.ts での設定
export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-5', // TechSapoプロジェクト要件: GPT-5専用
    organization: process.env.OPENAI_ORG_ID,
  }
};
```

## 🎯 主要API機能

### 1. Responses API（新しい標準）

#### 基本的な使用方法
```typescript
// 新しいResponses API - TechSapoで推奨
const response = await client.responses.create({
  model: 'gpt-5', // GPT-5専用（プロジェクト要件）
  input: 'システムログエラーの解決方法を教えてください',
  instructions: 'あなたは日本語IT支援の専門家です。',
});

console.log(response.output_text);
```

#### 詳細設定
```typescript
const response = await client.responses.create({
  model: 'gpt-5',
  input: userQuery,
  instructions: `
    あなたは日本語IT支援の専門家です。
    - 技術的問題を明確に分析
    - 実行可能な解決策を提案
    - ステップバイステップの説明
  `,
  store: true, // 対話ステートの保存
  reasoning: { effort: 'medium' }, // 推論品質制御
  metadata: {
    session_id: sessionId,
    task_type: 'it_support'
  }
});
```

### 2. Chat Completions API（従来方式）

#### 基本的なチャット
```typescript
const completion = await client.chat.completions.create({
  model: 'gpt-5',
  messages: [
    {
      role: 'system',
      content: 'あなたは日本語IT支援の専門家です。'
    },
    {
      role: 'user',
      content: 'Nginxサーバーが起動しません。どう対処すればよいですか？'
    }
  ],
  temperature: 0.7,
  max_tokens: 1000
});

console.log(completion.choices[0].message.content);
```

#### ツール統合（Function Calling）
```typescript
const completion = await client.chat.completions.create({
  model: 'gpt-5',
  messages: [
    { role: 'user', content: 'システムの状態を確認してください' }
  ],
  tools: [
    {
      type: 'function',
      function: {
        name: 'checkSystemStatus',
        description: 'システム状態をチェックします',
        parameters: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              description: 'チェックするサービス名'
            },
            detailed: {
              type: 'boolean',
              description: '詳細情報を取得するか'
            }
          },
          required: ['service']
        }
      }
    }
  ],
  tool_choice: 'auto'
});

// ツール呼び出しの処理
const toolCall = completion.choices[0].message.tool_calls?.[0];
if (toolCall) {
  const functionName = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments);

  // 実際のツール実行
  const result = await executeSystemCheck(args.service, args.detailed);

  // 結果を含めて再度API呼び出し
  const finalResponse = await client.chat.completions.create({
    model: 'gpt-5',
    messages: [
      ...messages,
      completion.choices[0].message,
      {
        role: 'tool',
        content: JSON.stringify(result),
        tool_call_id: toolCall.id
      }
    ]
  });
}
```

## 🌊 ストリーミング機能

### Responses APIでのストリーミング
```typescript
const stream = await client.responses.create({
  model: 'gpt-5',
  input: query,
  stream: true
});

for await (const chunk of stream) {
  if (chunk.type === 'text') {
    process.stdout.write(chunk.content);
  } else if (chunk.type === 'done') {
    console.log('\n完了');
    break;
  }
}
```

### Chat Completionsでのストリーミング
```typescript
const stream = await client.chat.completions.create({
  model: 'gpt-5',
  messages: [{ role: 'user', content: 'IT問題の解決手順を教えてください' }],
  stream: true
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}
```

### Express.jsでのServer-Sent Events統合
```typescript
// TechSapoでの実装例
app.post('/api/v1/stream-analysis', async (req, res) => {
  const { query } = req.body;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  try {
    const stream = await client.responses.create({
      model: 'gpt-5',
      input: `IT支援: ${query}`,
      instructions: '段階的に解決策を提示してください',
      stream: true
    });

    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        res.write(`data: ${JSON.stringify({
          type: 'content',
          content: chunk.content,
          timestamp: new Date().toISOString()
        })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({
      type: 'done',
      timestamp: new Date().toISOString()
    })}\n\n`);

  } catch (error) {
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message
    })}\n\n`);
  } finally {
    res.end();
  }
});
```

## 📁 ファイル操作

### ファイルアップロード
```typescript
import fs from 'fs';

// ファイルアップロード
const file = await client.files.create({
  file: fs.createReadStream('path/to/document.pdf'),
  purpose: 'assistants' // または 'fine-tune', 'batch'
});

console.log('File uploaded:', file.id);
```

### ベクターストア作成・管理
```typescript
// ベクターストア作成
const vectorStore = await client.beta.vectorStores.create({
  name: 'TechSapo Knowledge Base',
  expires_after: {
    anchor: 'last_active_at',
    days: 365
  }
});

// ファイルをベクターストアに追加
const vectorStoreFile = await client.beta.vectorStores.files.create(
  vectorStore.id,
  { file_id: file.id }
);

// ベクターストア検索
const searchResults = await client.beta.vectorStores.fileBatches.create(
  vectorStore.id,
  {
    file_ids: [file.id]
  }
);
```

### TechSapoでのRAG実装例
```typescript
// GoogleDrive連携でのファイル処理
export class OpenAIFileManager {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async uploadDocument(filePath: string, purpose: string = 'assistants'): Promise<string> {
    try {
      const file = await this.client.files.create({
        file: fs.createReadStream(filePath),
        purpose: purpose as any
      });

      logger.info('File uploaded to OpenAI', {
        fileId: file.id,
        filename: file.filename,
        bytes: file.bytes
      });

      return file.id;
    } catch (error) {
      logger.error('Failed to upload file to OpenAI', {
        filePath,
        error: error.message
      });
      throw error;
    }
  }

  async createVectorStore(name: string, fileIds: string[]): Promise<string> {
    const vectorStore = await this.client.beta.vectorStores.create({
      name,
      file_ids: fileIds
    });

    return vectorStore.id;
  }

  async searchInVectorStore(vectorStoreId: string, query: string): Promise<any> {
    const response = await this.client.responses.create({
      model: 'gpt-5',
      input: query,
      tools: [{
        type: 'file_search',
        vector_store_ids: [vectorStoreId]
      }]
    });

    return response;
  }
}
```

## 🛠️ エラーハンドリング

### 基本的なエラー処理
```typescript
import OpenAI from 'openai';

try {
  const response = await client.responses.create({
    model: 'gpt-5',
    input: query
  });

  return response.output_text;

} catch (error) {
  if (error instanceof OpenAI.APIError) {
    console.error('OpenAI API Error:', {
      status: error.status,
      message: error.message,
      type: error.type,
      code: error.code
    });

    // ステータスコード別処理
    switch (error.status) {
      case 400:
        throw new Error('リクエストが無効です: ' + error.message);
      case 401:
        throw new Error('APIキーが無効です');
      case 429:
        throw new Error('レート制限に達しました。しばらく待ってから再試行してください');
      case 500:
        throw new Error('OpenAIサーバーエラーが発生しました');
      default:
        throw new Error(`OpenAI APIエラー (${error.status}): ${error.message}`);
    }
  } else {
    console.error('Unexpected error:', error);
    throw new Error('予期しないエラーが発生しました');
  }
}
```

### TechSapoでの統合エラーハンドリング
```typescript
// src/utils/openai-error-handler.ts
export class OpenAIErrorHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (error instanceof OpenAI.APIError) {
          // リトライしない条件
          if ([400, 401, 403].includes(error.status)) {
            throw error;
          }

          // レート制限の場合は長めに待つ
          if (error.status === 429) {
            const retryAfter = error.headers?.['retry-after'];
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, attempt);

            logger.warn(`Rate limited, waiting ${delay}ms before retry ${attempt}/${maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          logger.warn(`API call failed, retrying in ${delay}ms (${attempt}/${maxRetries})`, {
            error: error.message
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  static handleStreamError(error: any, callback: (error: string) => void) {
    if (error instanceof OpenAI.APIError) {
      callback(`OpenAI API Error: ${error.message}`);
    } else {
      callback('ストリーミング中にエラーが発生しました');
    }
  }
}
```

## 🔧 高度な機能

### Webhook検証
```typescript
import { createHmac } from 'crypto';

export function verifyOpenAIWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return signature === `sha256=${expectedSignature}`;
}

// Express.jsでの使用例
app.post('/webhooks/openai', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['openai-signature'] as string;
  const payload = req.body.toString();

  if (!verifyOpenAIWebhook(payload, signature, process.env.OPENAI_WEBHOOK_SECRET!)) {
    return res.status(400).send('Invalid signature');
  }

  const event = JSON.parse(payload);
  // Webhookイベントの処理
  console.log('Received webhook event:', event.type);

  res.status(200).send('OK');
});
```

### Batch Processing（バッチ処理）
```typescript
// 大量のリクエストをバッチで処理
const batchInput = [
  { custom_id: 'request-1', method: 'POST', url: '/v1/responses', body: {
    model: 'gpt-5',
    input: 'ログエラーの分析: Error 500'
  }},
  { custom_id: 'request-2', method: 'POST', url: '/v1/responses', body: {
    model: 'gpt-5',
    input: 'ネットワーク接続問題の解決'
  }}
];

// バッチファイル作成
const batchFile = await client.files.create({
  file: Buffer.from(batchInput.map(req => JSON.stringify(req)).join('\n')),
  purpose: 'batch'
});

// バッチ処理開始
const batch = await client.batches.create({
  input_file_id: batchFile.id,
  endpoint: '/v1/responses',
  completion_window: '24h'
});

// バッチ状態確認
const batchStatus = await client.batches.retrieve(batch.id);
console.log('Batch status:', batchStatus.status);
```

## 🌐 Azure OpenAI対応

### Azure OpenAI設定
```typescript
import { AzureOpenAI } from 'openai';

const azureClient = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: '2024-02-15-preview',
  deployment: 'gpt-5-deployment' // Azureでのデプロイメント名
});

// 使用方法は通常のOpenAIと同じ
const response = await azureClient.responses.create({
  input: 'IT問題の解決方法'
});
```

## 📊 使用量監視・コスト管理

### トークン使用量追跡
```typescript
export class OpenAIUsageTracker {
  private totalTokens: number = 0;
  private totalCost: number = 0;
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async trackUsage(model: string, promptTokens: number, completionTokens: number) {
    const totalTokens = promptTokens + completionTokens;
    const cost = this.calculateCost(model, promptTokens, completionTokens);

    this.totalTokens += totalTokens;
    this.totalCost += cost;

    // Redis に保存
    const today = new Date().toISOString().split('T')[0];
    await this.redis.hincrby(`usage:${today}`, 'tokens', totalTokens);
    await this.redis.hincrbyfloat(`usage:${today}`, 'cost', cost);

    // 予算チェック
    if (this.totalCost > parseFloat(process.env.OPENAI_BUDGET_LIMIT || '100')) {
      logger.warn('OpenAI budget limit exceeded', {
        currentCost: this.totalCost,
        limit: process.env.OPENAI_BUDGET_LIMIT
      });
    }
  }

  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = {
      'gpt-5': { prompt: 0.01, completion: 0.03 }, // 1000トークンあたりのUSD
      'gpt-4': { prompt: 0.03, completion: 0.06 },
      'gpt-3.5-turbo': { prompt: 0.001, completion: 0.002 }
    };

    const modelPricing = pricing[model] || pricing['gpt-5'];
    return (promptTokens / 1000) * modelPricing.prompt +
           (completionTokens / 1000) * modelPricing.completion;
  }

  async getDailyUsage(date: string = new Date().toISOString().split('T')[0]) {
    const usage = await this.redis.hgetall(`usage:${date}`);
    return {
      date,
      tokens: parseInt(usage.tokens || '0'),
      cost: parseFloat(usage.cost || '0')
    };
  }
}
```

## 🔄 TechSapo統合パターン

### Wall-Bounce Analyzerとの統合
```typescript
// 既存のWall-Bounce分析にOpenAI SDKの高度機能を統合
export class EnhancedOpenAIIntegration {
  private client: OpenAI;
  private usageTracker: OpenAIUsageTracker;

  async executeEnhancedAnalysis(query: string, options: AnalysisOptions) {
    const startTime = Date.now();

    try {
      // ストリーミングでリアルタイム応答
      if (options.streaming) {
        return await this.executeStreamingAnalysis(query, options);
      }

      // バッチ処理で複数クエリを効率的に処理
      if (options.batch) {
        return await this.executeBatchAnalysis(query, options);
      }

      // 標準分析
      const response = await OpenAIErrorHandler.withRetry(async () => {
        return await this.client.responses.create({
          model: 'gpt-5',
          input: query,
          instructions: options.instructions || 'IT問題解決の専門家として回答',
          store: options.sessionId ? true : false,
          metadata: {
            session_id: options.sessionId,
            task_type: options.taskType,
            timestamp: new Date().toISOString()
          }
        });
      });

      // 使用量追跡
      await this.usageTracker.trackUsage(
        'gpt-5',
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0
      );

      return {
        content: response.output_text,
        metadata: {
          processingTime: Date.now() - startTime,
          tokenUsage: response.usage,
          model: 'gpt-5'
        }
      };

    } catch (error) {
      logger.error('Enhanced OpenAI analysis failed', {
        query: query.substring(0, 100),
        error: error.message,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  private async executeStreamingAnalysis(query: string, options: AnalysisOptions) {
    const stream = await this.client.responses.create({
      model: 'gpt-5',
      input: query,
      instructions: options.instructions,
      stream: true
    });

    let fullContent = '';
    const chunks: string[] = [];

    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        chunks.push(chunk.content);
        fullContent += chunk.content;

        // リアルタイムコールバック
        if (options.onChunk) {
          options.onChunk(chunk.content);
        }
      }
    }

    return {
      content: fullContent,
      chunks,
      streaming: true
    };
  }
}
```

## 🎯 ベストプラクティス

### 1. 環境設定の最適化
```typescript
// 本番環境とdev環境での設定分離
const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
  timeout: process.env.NODE_ENV === 'production' ? 60000 : 30000,
  maxRetries: process.env.NODE_ENV === 'production' ? 3 : 1,
};
```

### 2. プロンプトテンプレート管理
```typescript
export const PromptTemplates = {
  IT_SUPPORT: `
あなたは日本語IT支援の専門家です。
以下の問題について分析し、解決策を提案してください：

問題: {query}

回答形式：
1. 問題の分析
2. 根本原因
3. 解決手順（ステップバイステップ）
4. 予防策
`,

  LOG_ANALYSIS: `
以下のログを分析し、問題を特定してください：

ログ: {logContent}
システム: {systemContext}

分析結果：
- 問題種別：
- 深刻度：
- 推奨対応：
`
};
```

### 3. レスポンス品質保証
```typescript
export function validateResponse(response: any): boolean {
  // 空レスポンスチェック
  if (!response.output_text || response.output_text.trim().length === 0) {
    return false;
  }

  // 日本語レスポンスチェック
  const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(response.output_text);

  // IT関連キーワードチェック
  const hasRelevantContent = /システム|サーバ|エラー|問題|解決|設定|ネットワーク/.test(response.output_text);

  return hasJapanese && hasRelevantContent;
}
```

## 📈 パフォーマンス最適化

### 1. 並列処理
```typescript
// 複数のクエリを並列実行
const queries = [
  'システムログの分析',
  'ネットワーク状態の確認',
  'セキュリティチェック'
];

const results = await Promise.allSettled(
  queries.map(query => client.responses.create({
    model: 'gpt-5',
    input: query
  }))
);

const successfulResults = results
  .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
  .map(result => result.value);
```

### 2. キャッシュ戦略
```typescript
export class OpenAICache {
  private cache: Map<string, { response: any; timestamp: number }> = new Map();
  private ttl: number = 3600000; // 1時間

  async getCachedResponse(input: string, model: string): Promise<any | null> {
    const key = `${model}:${Buffer.from(input).toString('base64')}`;
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.response;
    }

    return null;
  }

  setCachedResponse(input: string, model: string, response: any): void {
    const key = `${model}:${Buffer.from(input).toString('base64')}`;
    this.cache.set(key, {
      response,
      timestamp: Date.now()
    });
  }
}
```

このガイドは、OpenAI Node.js SDKの基本的な使用方法から、TechSapoプロジェクトでの高度な統合パターンまでを包括的にカバーしています。