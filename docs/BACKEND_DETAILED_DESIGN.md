# TechSapo バックエンド詳細設計書

## 概要

TechSapoは、複数のLLMプロバイダーを活用したWall-Bounce分析システムを核とする次世代IT技術サポートプラットフォームです。

## アーキテクチャ概要

### システム構成図
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │◄──►│   API Gateway   │◄──►│   Services      │
│   (SPA)         │    │   (Express)     │    │   Layer         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Middleware    │    │   Data Layer    │
                       │   Security      │    │   Redis/Cache   │
                       └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────────────────────────────┐
                       │        External Integrations           │
                       │  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
                       │  │ Gemini  │ │ OpenAI  │ │ Google  │   │
                       │  │   CLI   │ │  Codex  │ │  Drive  │   │
                       │  └─────────┘ └─────────┘ └─────────┘   │
                       └─────────────────────────────────────────┘
```

## コアサービス層設計

### 1. Wall-Bounce Analyzer (`wall-bounce-analyzer.ts`)

**責務**: マルチLLMオーケストレーション、コンセンサス分析

**主要クラス**:
```typescript
class WallBounceAnalyzer {
  // 並列実行モード
  async executeParallel(providers: LLMProvider[]): Promise<WallBounceResult>
  
  // 順次実行モード
  async executeSequential(providers: LLMProvider[]): Promise<WallBounceResult>
  
  // プロバイダー呼び出し
  private async invokeProvider(handler: Function, prompt: string, name: string): Promise<LLMResponse>
}
```

**プロバイダー制約**:
- **Anthropic**: 内部API専用 (`INTERNAL_ONLY`)
- **OpenAI/Gemini**: CLI経由専用 (`CLI_ONLY`)
- **最小要求**: 2プロバイダー以上でコンセンサス形成

### 2. LLMプロバイダー統合

#### 2.1 Gemini CLI統合 (`wall-bounce-analyzer.ts:194-220`)
```typescript
private async executeGeminiCLI(prompt: string, version: 'gemini-2.5-pro' | 'gemini-2.5-flash'): Promise<LLMResponse> {
  const args = [prompt, '--model', version, '--output-format', 'json'];
  const child = spawn('gemini', args, {
    timeout: config.wallBounce.enableTimeout ? config.wallBounce.timeoutMs : undefined,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env }  // API_KEY除去済み
  });
}
```

#### 2.2 OpenAI Codex統合 (`codex-gpt5-provider.ts`)
```typescript
class CodexGPT5Provider {
  async executeGPT5Codex(prompt: string, model: 'gpt-5-codex' | 'gpt-5-general'): Promise<LLMResponse>
  async executeWithTimeout(prompt: string, timeoutMs: number): Promise<LLMResponse>
}
```

#### 2.3 Anthropic内部統合
- Claude Opus 4.1 / Sonnet 4
- 内部API経由、直接呼び出し

### 3. セッション管理 (`session-manager.ts`)

**責務**: Redis-backed セッション管理、状態永続化

```typescript
class SessionManager {
  async createSession(userId: string, sessionData: SessionData): Promise<string>
  async getSession(sessionId: string): Promise<SessionData | null>
  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void>
  async deleteSession(sessionId: string): Promise<void>
  async listUserSessions(userId: string): Promise<SessionData[]>
}
```

**Redis設計**:
```
sessions:{sessionId} -> JSON(SessionData)
user_sessions:{userId} -> Set(sessionIds)
session_metrics -> Hash(統計情報)
```

### 4. RAG統合サービス (`googledrive-connector.ts`)

**責務**: Google Drive知識ベース統合、ベクトル検索

```typescript
class GoogleDriveRAGConnector {
  async searchDocuments(query: string, options: SearchOptions): Promise<SearchResult[]>
  async syncFolderToRAG(folderId: string): Promise<SyncResult>
  async indexDocument(fileId: string): Promise<IndexResult>
}
```

**Vector Store設計**:
- OpenAI Embeddings (text-embedding-3-large)
- Vector Store ファイル管理
- メタデータ付きドキュメント検索

### 5. ログ分析エンジン (`log-analyzer.ts`)

**責務**: インテリジェントログ解析、問題診断

```typescript
class LogAnalyzer {
  static async analyzeLogs(input: LogAnalysisInput): Promise<LogAnalysisResult>
  private static buildAnalysisPrompt(input: LogAnalysisInput): string
  private static parseAnalysisResult(content: string): LogAnalysisResult
}
```

**分析カテゴリ**:
- `dependency`: 依存関係問題
- `configuration`: 設定問題  
- `network`: ネットワーク問題
- `permission`: 権限問題
- `resource`: リソース問題

## データ層設計

### Redis Schema設計

#### セッション管理
```
sessions:{sessionId}
├── user_id: string
├── created_at: timestamp
├── last_accessed: timestamp
├── session_data: JSON
└── expires_at: timestamp

user_sessions:{userId}
├── active_sessions: Set<sessionId>
└── session_count: number
```

#### キャッシュ管理
```
cache:context7:{key}
├── data: JSON
├── created_at: timestamp
└── expires_at: timestamp

cache:embeddings:{hash}
├── vector: Float[]
├── model: string
└── created_at: timestamp
```

#### Vector Store マッピング
```
drive_vector_mapping:{driveFileId}
├── vector_store_file_id: string
├── created_at: timestamp
├── file_name: string
└── file_size: number
```

### 設定管理 (`environment.ts`)

```typescript
interface EnvironmentConfig {
  server: {
    port: number;
    nodeEnv: string;
  };
  
  wallBounce: {
    enableFallback: boolean;
    enableTimeout: boolean;
    timeoutMs: number;
    minProviders: number;
  };
  
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  
  openai: {
    apiKey: string;
    organization?: string;
  };
  
  google: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  };
}
```

## セキュリティ設計

### 1. API Key管理
- **Gemini**: CLI専用、環境変数除去
- **OpenAI**: Codex経由、直接API使用禁止
- **Google**: OAuth2 Refresh Token方式

### 2. 入力検証
```typescript
// リクエスト検証
const validateGenerateRequest = (req: Request): ValidationResult => {
  const { prompt, task_type } = req.body;
  
  if (!prompt || typeof prompt !== 'string') {
    return { valid: false, error: 'Prompt is required' };
  }
  
  if (task_type && !['basic', 'premium', 'critical'].includes(task_type)) {
    return { valid: false, error: 'Invalid task_type' };
  }
  
  return { valid: true };
};
```

### 3. レート制限
- Wall-Bounce: 1分間10リクエスト/IP
- RAG検索: 1分間30リクエスト/IP
- ログ分析: 1分間20リクエスト/IP

## エラーハンドリング設計

### 1. エラー分類
```typescript
enum ErrorType {
  VALIDATION_ERROR = 'validation_error',
  PROVIDER_ERROR = 'provider_error',
  TIMEOUT_ERROR = 'timeout_error',
  SYSTEM_ERROR = 'system_error'
}

interface ApiError {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: string;
}
```

### 2. フォールバック戦略
- Provider失敗時: 代替プロバイダー自動選択
- タイムアウト時: 部分結果返却
- システム障害時: キャッシュ済み結果提供

## 監視・ロギング設計

### 1. 構造化ログ
```typescript
interface LogEntry {
  level: 'info' | 'warn' | 'error';
  service: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
```

### 2. メトリクス収集
- リクエスト数/レスポンス時間
- Provider成功率/エラー率  
- Cache hit率
- セッション統計

### 3. ヘルスチェック
```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    redis: ServiceHealth;
    wall_bounce: ServiceHealth;
    rag_system: ServiceHealth;
  };
  timestamp: string;
}
```

## パフォーマンス最適化

### 1. 並列処理
- Wall-Bounce: 複数Provider同時実行
- RAG検索: 埋め込み生成と検索の並列化
- ログ分析: バッチ処理対応

### 2. キャッシュ戦略
- Context7: 5分間キャッシュ
- Embeddings: 24時間キャッシュ
- セッション: Redis TTL自動管理

### 3. リソース管理
- Node.js: `--max-old-space-size=1024 --expose-gc`
- Timeout制御: 設定ベース可変
- Connection Pool: Redis接続最適化

## 今後の拡張設計

### 1. マイクロサービス分割
- Wall-Bounce Service
- RAG Service  
- Session Service
- Analytics Service

### 2. 新Provider統合
- Anthropic Claude 3.5 Sonnet
- Google Gemini 3.0
- Meta Llama 3

### 3. 高可用性対応
- Redis Cluster
- Load Balancer
- Circuit Breaker Pattern

---

**更新履歴**:
- 2025-09-27: 初版作成
- API Key依存性排除完了
- Configuration-based制御実装