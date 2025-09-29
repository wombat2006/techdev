# OpenAI Agents JS - 基本ガイド

## 🤖 Overview

OpenAI Agents JS (`@openai/agents`) は、マルチエージェントワークフローと音声エージェント用の軽量で強力なフレームワークです。

**公式リポジトリ**: https://github.com/openai/openai-agents-js

## 📦 基本セットアップ

### インストール
```bash
npm install @openai/agents zod@3
```

### 必要環境
- **Node.js**: 22+
- **TypeScript**: 完全対応
- **Zod**: スキーマ検証用（必須依存関係）

### サポート環境
- Node.js 22+
- Deno
- Bun
- Cloudflare Workers (実験的)

## 🏗️ 基本概念

### Agent（エージェント）
LLMを以下で構成されたインテリジェントな実体：
- **Instructions**: エージェントの役割・動作指示
- **Tools**: 使用可能なツール・機能
- **Guardrails**: 入出力の制約・安全機能
- **Handoffs**: 他エージェントへの制御移譲

### 主要機能
1. **Multi-Agent Workflows**: 複数エージェントの協調動作
2. **Tool Integration**: 外部ツール・APIとの統合
3. **Dynamic Handoffs**: 動的なエージェント間制御移譲
4. **Structured Outputs**: 構造化された出力形式
5. **Streaming Responses**: リアルタイムストリーミング応答
6. **Built-in Tracing**: デバッグ・監視機能
7. **Voice Agents**: 音声対応エージェント

## 🚀 基本的な使用方法

### 1. シンプルなエージェント作成
```typescript
import { Agent, run } from '@openai/agents';

const agent = new Agent({
  name: 'Assistant',
  instructions: 'You are a helpful assistant',
});

const result = await run(
  agent,
  'Write a haiku about recursion in programming.'
);
console.log(result.finalOutput);
```

### 2. 日本語IT支援エージェント
```typescript
import { Agent, run } from '@openai/agents';

const itSupportAgent = new Agent({
  name: 'ITSupportSpecialist',
  instructions: `
    あなたは日本語IT支援の専門家です。
    - 技術的問題を明確に分析
    - 実行可能な解決策を提案
    - 簡潔で分かりやすい説明
    - ステップバイステップのガイダンス
  `,
  model: 'gpt-5', // TechSapoプロジェクト要件: GPT-5専用
});

const result = await run(
  itSupportAgent,
  'Nginxサーバーが起動しません。エラーログに「port 80 already in use」と表示されます。'
);
```

### 3. ツール統合エージェント
```typescript
const diagnosticAgent = new Agent({
  name: 'SystemDiagnostic',
  instructions: 'システム診断を行い、問題を特定します。',
  tools: [
    {
      type: 'function',
      function: {
        name: 'checkSystemStatus',
        description: 'システム状態をチェック',
        parameters: {
          type: 'object',
          properties: {
            service: { type: 'string', description: 'チェックするサービス名' },
            detail_level: { type: 'string', enum: ['basic', 'detailed'] }
          },
          required: ['service']
        }
      }
    }
  ]
});

// ツール実装
const tools = {
  checkSystemStatus: async ({ service, detail_level = 'basic' }) => {
    // システム状態チェックロジック
    return {
      service,
      status: 'running',
      details: detail_level === 'detailed' ? 'すべて正常' : 'OK'
    };
  }
};

const result = await run(diagnosticAgent, 'Nginxの状態を確認してください', {
  tools
});
```

## 🔄 マルチエージェントワークフロー

### エージェント間ハンドオフ
```typescript
// 分析エージェント
const analysisAgent = new Agent({
  name: 'LogAnalyzer',
  instructions: 'ログファイルを分析し、問題を特定します。',
  handoffs: ['solution'] // solutionエージェントへのハンドオフ可能
});

// 解決策エージェント
const solutionAgent = new Agent({
  name: 'SolutionProvider',
  instructions: '分析結果に基づいて具体的な解決策を提案します。',
});

// ワークフロー実行
const agents = [analysisAgent, solutionAgent];
const result = await run(analysisAgent, 'エラーログ: Connection refused', {
  agents // 利用可能エージェントリスト
});
```

### 並列エージェント実行
```typescript
// 複数の観点から同時分析
const agents = [
  new Agent({
    name: 'TechnicalAnalyst',
    instructions: '技術的観点からの分析'
  }),
  new Agent({
    name: 'SecurityAnalyst',
    instructions: 'セキュリティ観点からの分析'
  }),
  new Agent({
    name: 'PerformanceAnalyst',
    instructions: 'パフォーマンス観点からの分析'
  })
];

// 並列実行
const results = await Promise.all(
  agents.map(agent => run(agent, query))
);

// 結果統合
const integrationAgent = new Agent({
  name: 'Integrator',
  instructions: '複数の分析結果を統合し、総合的な解決策を提案'
});

const finalResult = await run(
  integrationAgent,
  `以下の分析結果を統合してください: ${results.map(r => r.finalOutput).join('\n')}`
);
```

## 📊 構造化出力

### Zodスキーマによる出力制御
```typescript
import { z } from 'zod';

// 出力スキーマ定義
const DiagnosisSchema = z.object({
  problem: z.string().describe('問題の概要'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).describe('深刻度'),
  root_cause: z.string().describe('根本原因'),
  solutions: z.array(z.string()).describe('解決策リスト'),
  estimated_time: z.string().describe('推定修復時間')
});

const diagnosticAgent = new Agent({
  name: 'StructuredDiagnostic',
  instructions: '構造化された診断結果を提供します。',
  outputSchema: DiagnosisSchema
});

const result = await run(diagnosticAgent, 'データベース接続エラーが発生しています');
// result.finalOutput は DiagnosisSchema 形式で保証される
```

## 🎵 音声エージェント

### リアルタイム音声対応
```typescript
const voiceAgent = new Agent({
  name: 'VoiceITSupport',
  instructions: `
    音声対応のIT支援エージェントです。
    - 明確で簡潔な回答
    - 技術用語の平易な説明
    - 段階的な指示
  `,
  voice: true, // 音声機能有効化
  model: 'gpt-5'
});

// 音声入力での実行
const result = await run(voiceAgent, audioInput, {
  streaming: true, // リアルタイム応答
  voice: true
});
```

## 🔍 デバッグ・監視

### 内蔵トレーシング機能
```typescript
const agent = new Agent({
  name: 'TracedAgent',
  instructions: 'トレーシング付きエージェント',
  tracing: true // トレーシング有効化
});

const result = await run(agent, query, {
  debug: true // デバッグモード
});

// トレース情報の確認
console.log('Execution trace:', result.trace);
console.log('Performance metrics:', result.metrics);
```

### カスタムロギング
```typescript
const agent = new Agent({
  name: 'LoggedAgent',
  instructions: 'ログ付きエージェント',
  onMessage: (message) => {
    console.log('Agent message:', message);
  },
  onToolCall: (toolCall) => {
    console.log('Tool called:', toolCall.name);
  }
});
```

## 🛡️ ガードレール・安全機能

### 入力制約
```typescript
const secureAgent = new Agent({
  name: 'SecureAgent',
  instructions: 'セキュリティを重視するエージェント',
  inputGuardrails: {
    maxLength: 1000,
    prohibitedPatterns: [
      /password/i,
      /secret/i,
      /api[_-]?key/i
    ],
    requireApproval: (input) => {
      // 危険な操作の事前承認
      return /delete|remove|drop/i.test(input);
    }
  }
});
```

### 出力制約
```typescript
const constrainedAgent = new Agent({
  name: 'ConstrainedAgent',
  instructions: '制約付きエージェント',
  outputGuardrails: {
    maxTokens: 500,
    requireReview: true,
    filterSensitiveInfo: true
  }
});
```

## 🔧 高度な設定

### カスタムプロバイダー
```typescript
const agent = new Agent({
  name: 'CustomProviderAgent',
  instructions: 'カスタムプロバイダーを使用',
  provider: {
    type: 'custom',
    endpoint: 'https://custom-ai-api.com',
    apiKey: process.env.CUSTOM_API_KEY,
    model: 'custom-model-v1'
  }
});
```

### パフォーマンス最適化
```typescript
const optimizedAgent = new Agent({
  name: 'OptimizedAgent',
  instructions: '最適化されたエージェント',
  caching: true, // 応答キャッシュ
  parallelTools: true, // 並列ツール実行
  streaming: true, // ストリーミング応答
  timeout: 30000 // 30秒タイムアウト
});
```

## 🔗 TechSapoとの統合ポイント

### 1. Wall-Bounce Analyzerとの連携
```typescript
// 既存のWall-Bounce Analyzerを拡張
class AgentEnhancedWallBounceAnalyzer {
  async executeWithAgents(query: string, taskType: TaskType) {
    const agents = this.selectAgentsForTask(taskType);
    const results = await Promise.all(
      agents.map(agent => run(agent, query))
    );
    return this.buildConsensus(results);
  }
}
```

### 2. MCPプロトコル統合
```typescript
// MCP経由でのエージェント実行
const mcpAgent = new Agent({
  name: 'MCPIntegratedAgent',
  instructions: 'MCP統合エージェント',
  tools: await loadMCPTools(), // MCP toolsの動的読み込み
});
```

### 3. セッション管理統合
```typescript
// 既存のセッションシステムとの連携
const sessionAwareAgent = new Agent({
  name: 'SessionAgent',
  instructions: 'セッション対応エージェント',
  sessionManager: getSessionManager(), // 既存のセッションマネージャー
});
```

## ⚠️ 制限事項・注意点

### API制限
- **モデル制約**: TechSapoプロジェクトではGPT-5専用使用
- **レート制限**: OpenAI APIの制限に従う
- **コスト管理**: トークン使用量の監視が重要

### パフォーマンス考慮事項
- **メモリ使用量**: 複数エージェント実行時の増加
- **ネットワーク遅延**: ハンドオフ時の追加レイテンシ
- **同時実行数**: リソース制限を考慮

### セキュリティ
- **入力検証**: ユーザー入力の適切なサニタイズ
- **出力フィルタリング**: 機密情報の漏洩防止
- **権限管理**: エージェントの実行権限制御

## 🎯 次のステップ

1. **基本実装**: シンプルなエージェント作成
2. **ツール統合**: 既存システムとの連携
3. **マルチエージェント**: 協調ワークフローの構築
4. **監視統合**: 既存のPrometheus監視との連携
5. **本番展開**: パフォーマンス・セキュリティ検証

## 📚 関連ドキュメント

- [OpenAI Agents Integration](./OPENAI_AGENTS_INTEGRATION.md) - 高度な統合ガイド
- [Wall-Bounce System](./WALL_BOUNCE_SYSTEM.md) - 既存システムとの統合
- [MCP Integration](./MCP_INTEGRATION.md) - MCPプロトコル連携

このガイドは、OpenAI Agents JSの基本的な使用方法から、TechSapoプロジェクトでの具体的な統合方法までを網羅しています。