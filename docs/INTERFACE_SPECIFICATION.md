# TechSapo インターフェース仕様書

## API仕様概要

TechSapo APIは、RESTful設計に基づく統一的なインターフェースを提供します。すべてのエンドポイントはJSON形式でのデータ交換を行い、適切なHTTPステータスコードを返却します。

## 共通仕様

### Base URL
```
http://localhost:4001
```

### 共通ヘッダー
```http
Content-Type: application/json
Accept: application/json
```

### 共通レスポンス形式

#### 成功レスポンス
```json
{
  "success": true,
  "data": {}, 
  "timestamp": "2025-09-27T22:39:44.735Z"
}
```

#### エラーレスポンス
```json
{
  "success": false,
  "error": {
    "type": "validation_error",
    "message": "詳細なエラーメッセージ",
    "code": "INVALID_REQUEST"
  },
  "timestamp": "2025-09-27T22:39:44.735Z"
}
```

### HTTPステータスコード

| コード | 意味 | 用途 |
|-------|------|------|
| 200 | OK | 正常処理完了 |
| 201 | Created | リソース作成成功 |
| 400 | Bad Request | リクエスト形式エラー |
| 401 | Unauthorized | 認証エラー |
| 403 | Forbidden | 権限エラー |
| 404 | Not Found | リソース未発見 |
| 429 | Too Many Requests | レート制限 |
| 500 | Internal Server Error | サーバー内部エラー |
| 503 | Service Unavailable | サービス利用不可 |

## 1. Wall-Bounce生成API

### エンドポイント
```http
POST /api/v1/generate
```

### リクエストスキーマ
```typescript
interface GenerateRequest {
  prompt: string;              // 必須: 分析対象の質問・タスク
  task_type?: 'basic' | 'premium' | 'critical';  // オプション: タスク重要度
  user_id?: string;            // オプション: ユーザー識別子
  session_id?: string;         // オプション: セッション識別子
  options?: {
    max_tokens?: number;       // 最大トークン数
    temperature?: number;      // 創造性パラメータ (0.0-1.0)
    timeout_ms?: number;       // タイムアウト (ms)
  };
}
```

### レスポンススキーマ
```typescript
interface GenerateResponse {
  response: string;                    // Wall-Bounce分析結果
  confidence: number;                  // 信頼度 (0.0-1.0)
  reasoning: string;                   // 分析根拠
  session_id: string;                  // セッション識別子
  task_type: string;                   // 実行されたタスクタイプ
  total_cost: number;                  // 総コスト (USD)
  processing_time_ms: number;          // 処理時間 (ms)
  providers_used: string[];            // 使用されたプロバイダー一覧
  wall_bounce_verified: boolean;       // Wall-Bounce検証フラグ
  consensus: {
    method: 'parallel' | 'sequential'; // 実行モード
    provider_count: number;            // 参加プロバイダー数
    agreement_score: number;           // 合意スコア (0.0-1.0)
  };
  debug?: {
    provider_responses: Array<{
      provider: string;
      response: string;
      confidence: number;
      cost: number;
      processing_time_ms: number;
    }>;
    errors?: string[];
  };
  timestamp: string;
}
```

### リクエスト例
```bash
curl -X POST http://localhost:4001/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "TypeScriptでのエラーハンドリングのベストプラクティスを教えてください",
    "task_type": "basic",
    "user_id": "user123",
    "options": {
      "max_tokens": 2000,
      "temperature": 0.7
    }
  }'
```

### レスポンス例
```json
{
  "response": "TypeScriptでのエラーハンドリングには以下のベストプラクティスがあります：\n1. 型安全なError クラスの定義\n2. Result型パターンの活用\n3. 適切な例外境界の設定...",
  "confidence": 0.92,
  "reasoning": "3つのLLMプロバイダーからの高品質な回答を統合",
  "session_id": "sess_1759012784735",
  "task_type": "basic",
  "total_cost": 0.003,
  "processing_time_ms": 32456,
  "providers_used": ["gemini-2.5-flash", "gemini-2.5-pro", "opus-4.1"],
  "wall_bounce_verified": true,
  "consensus": {
    "method": "parallel",
    "provider_count": 3,
    "agreement_score": 0.89
  },
  "timestamp": "2025-09-27T22:39:44.735Z"
}
```

## 2. ログ分析API

### エンドポイント
```http
POST /api/v1/analyze-logs
```

### リクエストスキーマ
```typescript
interface LogAnalysisRequest {
  user_command: string;        // 必須: 実行したコマンド
  error_output: string;        // 必須: エラー出力
  system_context?: string;     // オプション: システム情報
  analysis_options?: {
    include_solutions: boolean;   // 解決策を含める
    severity_filter: 'low' | 'medium' | 'high';  // 重要度フィルタ
    related_services: string[];   // 関連サービス指定
  };
}
```

### レスポンススキーマ
```typescript
interface LogAnalysisResponse {
  analysis_result: {
    issue_identified: string;           // 特定された問題
    problem_category: 'dependency' | 'configuration' | 'network' | 'permission' | 'resource' | 'unknown';
    root_cause: string;                 // 根本原因
    solution_steps: string[];           // 解決手順
    related_services: string[];         // 関連サービス
    severity_level: 'low' | 'medium' | 'high';  // 重要度
    confidence_score: number;           // 信頼度 (0.0-1.0)
    additional_checks: string[];        // 追加確認事項
    collaboration_trace: string;        // Wall-Bounce分析トレース
    estimated_fix_time: string;         // 推定修復時間
    prevention_tips: string[];          // 予防策
  };
  metadata: {
    analysis_duration_ms: number;
    providers_consulted: string[];
    log_patterns_detected: string[];
  };
  timestamp: string;
}
```

### リクエスト例
```bash
curl -X POST http://localhost:4001/api/v1/analyze-logs \
  -H "Content-Type: application/json" \
  -d '{
    "user_command": "npm start",
    "error_output": "Error: Cannot find module '\''react'\''\n    at Function.Module._resolveFilename (internal/modules/cjs/loader.js:636:15)",
    "system_context": "Node.js v18.0.0, npm 8.6.0, Windows 11",
    "analysis_options": {
      "include_solutions": true,
      "severity_filter": "medium"
    }
  }'
```

## 3. RAG検索API

### 3.1 ドキュメント検索

#### エンドポイント
```http
POST /api/v1/rag/search
```

#### リクエストスキーマ
```typescript
interface RAGSearchRequest {
  query: string;                 // 必須: 検索クエリ
  options?: {
    max_results?: number;        // 最大結果数 (デフォルト: 5)
    threshold?: number;          // 類似度閾値 (0.0-1.0, デフォルト: 0.7)
    include_metadata?: boolean;  // メタデータを含める
    file_types?: string[];       // ファイルタイプフィルタ
    date_range?: {
      start: string;             // 開始日 (ISO 8601)
      end: string;               // 終了日 (ISO 8601)
    };
  };
}
```

#### レスポンススキーマ
```typescript
interface RAGSearchResponse {
  results: Array<{
    id: string;                  // ドキュメントID
    title: string;               // ドキュメントタイトル
    content: string;             // マッチした内容
    similarity_score: number;    // 類似度スコア
    metadata: {
      file_type: string;
      file_size: number;
      created_at: string;
      modified_at: string;
      author?: string;
      tags?: string[];
    };
    source: {
      drive_file_id: string;
      drive_file_name: string;
      drive_folder_path: string;
    };
  }>;
  query_metadata: {
    original_query: string;
    processed_query: string;
    embedding_model: string;
    search_duration_ms: number;
    total_documents_searched: number;
  };
  timestamp: string;
}
```

### 3.2 RAGシステム状態確認

#### エンドポイント
```http
GET /api/v1/rag/health
```

#### レスポンススキーマ
```typescript
interface RAGHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: 'rag-system';
  configuration: {
    google_drive_configured: boolean;
    openai_configured: boolean;
    rag_connector_initialized: boolean;
  };
  metrics: {
    total_documents: number;
    last_sync_time: string;
    index_size_mb: number;
    average_query_time_ms: number;
  };
  timestamp: string;
}
```

## 4. セッション管理API

### 4.1 セッション作成

#### エンドポイント
```http
POST /api/codex/session
```

#### リクエストスキーマ
```typescript
interface CreateSessionRequest {
  user_id: string;             // 必須: ユーザーID
  session_name?: string;       // オプション: セッション名
  context?: {
    project_id?: string;
    workspace_path?: string;
    preferences?: Record<string, any>;
  };
}
```

#### レスポンススキーマ
```typescript
interface CreateSessionResponse {
  session_id: string;
  user_id: string;
  session_name: string;
  created_at: string;
  expires_at: string;
  context: Record<string, any>;
}
```

### 4.2 セッション一覧取得

#### エンドポイント
```http
GET /api/codex/sessions?user_id={user_id}
```

#### レスポンススキーマ
```typescript
interface ListSessionsResponse {
  sessions: Array<{
    session_id: string;
    session_name: string;
    created_at: string;
    last_accessed: string;
    status: 'active' | 'inactive' | 'expired';
  }>;
  total_count: number;
  timestamp: string;
}
```

## 5. ヘルスチェックAPI

### 5.1 システム全体の状態

#### エンドポイント
```http
GET /api/v1/health
```

#### レスポンススキーマ
```typescript
interface SystemHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime_seconds: number;
  services: {
    redis: {
      status: 'connected' | 'disconnected';
      response_time_ms: number;
      memory_usage_mb: number;
    };
    wall_bounce: {
      status: 'operational' | 'degraded' | 'failed';
      providers_available: number;
      last_successful_analysis: string;
    };
    rag_system: {
      status: 'ready' | 'syncing' | 'error';
      documents_indexed: number;
      last_sync: string;
    };
    external_services: {
      gemini_cli: {
        status: 'ok' | 'error' | 'unknown';
        version: string;
        last_checked: string;
      };
      openai_codex: {
        status: 'available' | 'rate_limited' | 'unavailable';
        last_response_time_ms: number;
      };
    };
  };
  metrics: {
    requests_per_minute: number;
    average_response_time_ms: number;
    error_rate_percent: number;
    cache_hit_rate_percent: number;
  };
  timestamp: string;
}
```

### 5.2 簡易ヘルスチェック

#### エンドポイント
```http
GET /health
```

#### レスポンススキーマ
```typescript
interface SimpleHealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
}
```

## 6. リアルタイムメトリクスAPI

### エンドポイント
```http
GET /api/v1/metrics/stream
```

### Server-Sent Events形式

#### 接続確立
```
event: connected
data: {"type":"connected","timestamp":"2025-09-27T22:39:44.735Z","message":"メトリクスストリーム接続完了"}
```

#### メトリクスデータ
```
event: metrics
data: {"type":"metrics","timestamp":"2025-09-27T22:39:44.735Z","data":{"requests_count":157,"active_sessions":12,"response_time_avg":245,"wall_bounce_success_rate":0.94}}
```

#### エラー通知
```
event: error
data: {"type":"error","timestamp":"2025-09-27T22:39:44.735Z","error":{"service":"wall-bounce","message":"Provider timeout"}}
```

## エラーコード一覧

### 共通エラーコード

| コード | HTTPステータス | 説明 |
|-------|---------------|------|
| INVALID_REQUEST | 400 | リクエスト形式エラー |
| MISSING_REQUIRED_FIELD | 400 | 必須フィールド欠如 |
| INVALID_PARAMETER | 400 | パラメータ値エラー |
| RATE_LIMIT_EXCEEDED | 429 | レート制限超過 |
| INTERNAL_ERROR | 500 | 内部処理エラー |
| SERVICE_UNAVAILABLE | 503 | サービス利用不可 |

### Wall-Bounce専用エラーコード

| コード | HTTPステータス | 説明 |
|-------|---------------|------|
| INSUFFICIENT_PROVIDERS | 500 | プロバイダー不足 |
| WALL_BOUNCE_TIMEOUT | 500 | Wall-Bounce処理タイムアウト |
| CONSENSUS_FAILED | 500 | コンセンサス形成失敗 |
| PROVIDER_ERROR | 500 | プロバイダー個別エラー |

### RAG専用エラーコード

| コード | HTTPステータス | 説明 |
|-------|---------------|------|
| RAG_NOT_CONFIGURED | 500 | RAG設定未完了 |
| SEARCH_INDEX_ERROR | 500 | 検索インデックスエラー |
| EMBEDDING_GENERATION_FAILED | 500 | 埋め込み生成失敗 |
| DRIVE_ACCESS_ERROR | 500 | Google Driveアクセスエラー |

## レート制限

### 制限値

| エンドポイント | 制限値 | 時間窓 |
|--------------|-------|--------|
| `/api/v1/generate` | 10リクエスト | 1分間 |
| `/api/v1/analyze-logs` | 20リクエスト | 1分間 |
| `/api/v1/rag/search` | 30リクエスト | 1分間 |
| `/api/v1/health` | 無制限 | - |
| `/api/v1/metrics/stream` | 5接続 | 同時 |

### レート制限ヘッダー

レスポンスには以下のヘッダーが含まれます：

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 60
```

## 認証・認可 (将来実装)

### JWT トークン形式
```typescript
interface JWTPayload {
  user_id: string;
  role: 'user' | 'admin' | 'service';
  permissions: string[];
  exp: number;
  iat: number;
}
```

### APIキー認証
```http
Authorization: Bearer <api_key>
X-API-Key: <api_key>
```

---

**更新履歴**:
- 2025-09-27: 初版作成
- API エンドポイント詳細仕様定義
- エラーハンドリング仕様策定
- レート制限実装仕様確定