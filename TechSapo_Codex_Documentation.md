# TechSapo プロジェクト完全ドキュメント

## プロジェクト概要

**TechSapo** は複数のLLM（大規模言語モデル）を協調させる「Wall-Bounce」分析システムを核とした次世代AI技術サポートプラットフォームです。

### 最新コミット状況
```
最新コミット: 2a340c97 "feat(wall-bounce): Replace mock implementations with real LLM API calls"
ブランチ: main  
主要変更: Wall-Bounce実装でモックを実際のAPI呼び出しに置換
```

### アーキテクチャ概要
- **開発環境**: TypeScript + Node.js Express Server
- **本番環境**: CommonJS + Nginx (443) → Express (3000/3001)
- **MCP統合**: Model Context Protocol対応
- **Memory最適化**: 512MB heap制限、Worker Threads対応

## 1. プロジェクト構造詳細

### ディレクトリ階層
```
techsapo/
├── src/                           # TypeScriptソースコード
│   ├── config/                    # 設定管理
│   │   ├── environment.ts         # 環境変数設定
│   │   └── node-deprecation-suppressor.ts
│   ├── controllers/               # コントローラー層
│   │   └── huggingface-controller.ts
│   ├── middleware/                # ミドルウェア層
│   │   ├── error-handler.ts
│   │   ├── metrics-middleware.ts
│   │   ├── openai-auth.ts
│   │   └── validation.ts
│   ├── routes/                    # ルーティング層
│   │   ├── huggingface-routes.ts
│   │   ├── it-support.ts
│   │   ├── it-unified.ts
│   │   ├── rag-endpoint.ts        # RAG API実装
│   │   ├── webhook-endpoints.ts   # GoogleDrive Webhook
│   │   └── webhook-setup.ts
│   ├── services/                  # ビジネスロジック層
│   │   ├── wall-bounce-analyzer.ts  # 【核心】Multi-LLM協調分析
│   │   ├── log-analyzer.ts          # ログ解析サービス
│   │   ├── redis-service.ts         # Redis接続管理
│   │   ├── session-manager.ts       # セッション管理
│   │   ├── cost-tracking.ts         # コスト追跡
│   │   ├── context7-cache.ts        # Context7キャッシュ
│   │   ├── embedding-service.ts     # 埋め込みベクトル
│   │   ├── googledrive-connector.ts # GoogleDrive統合
│   │   ├── googledrive-push-setup.ts
│   │   ├── googledrive-webhook-handler.ts
│   │   ├── huggingface-client.ts    # HuggingFace API
│   │   ├── huggingface-mock.ts
│   │   ├── inference-service.ts
│   │   └── __mocks__/              # テスト用モック
│   ├── metrics/                   # メトリクス・監視
│   │   ├── prometheus-client.ts   # Prometheusメトリクス
│   │   └── prometheus-client-class.ts
│   ├── utils/                     # ユーティリティ
│   │   ├── logger.ts              # ログ管理
│   │   ├── security.ts            # セキュリティ機能
│   │   ├── data-sanitizer.ts      # データサニタイズ
│   │   ├── file-type-detector.ts  # ファイル判定
│   │   ├── mcp-clients.ts         # MCP クライアント
│   │   ├── migrate-to-redis.ts    # Redis移行
│   │   └── punycode-replacement.ts # Punycode対応
│   ├── types/                     # TypeScript型定義
│   │   ├── huggingface.ts
│   │   └── googleapis.d.ts
│   ├── index.ts                   # メインエントリーポイント
│   ├── server.ts                  # Express サーバー設定
│   └── wall-bounce-server.ts      # Wall-Bounce専用サーバー
├── dist/                          # コンパイル済みJavaScript
├── public/                        # 静的ファイル
│   ├── standalone-top.html        # 【重要】メインWebアプリUI
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── test.html
│   └── ...
├── docs/                          # ドキュメント
├── tests/                         # テストスイート
├── docker/                        # Docker設定
├── scripts/                       # 運用スクリプト
└── nginx/                         # Nginx設定
```

### 主要ファイルの役割

| ファイル | 役割 | 技術スタック |
|---------|------|-------------|
| `src/services/wall-bounce-analyzer.ts` | **核心機能**：Multi-LLM協調分析システム | TypeScript, OpenAI API, Gemini API, Claude API |
| `src/server.ts` | Express サーバー、API エンドポイント | TypeScript, Express.js |
| `public/standalone-top.html` | メインWebアプリケーション UI | HTML5, CSS3, JavaScript (Vanilla) |
| `src/routes/rag-endpoint.ts` | RAG (Retrieval Augmented Generation) API | TypeScript, OpenAI Vector Store |
| `src/services/redis-service.ts` | Redis データストア管理 | TypeScript, Redis, Upstash |

## 2. Wall-Bounce実装の詳細

### 核心アーキテクチャ
`src/services/wall-bounce-analyzer.ts` は**TechSapoの中核**を担うMulti-LLM協調分析システムです。

#### 実装方針
- **絶対原則**: すべての解決には2つ以上のLLMによる協調分析が必須
- **実装状況**: 実際のAPI統合完了（2a340c97コミット）
- **対応LLM**: OpenAI GPT-4o, Google Gemini 2.0, Claude 3.5 Sonnet, OpenRouter

#### LLMプロバイダー階層
```typescript
Tier 1: Gemini 2.5 Pro (Primary) - 主分析エンジン
Tier 2: GPT-5 (Secondary) - 実装はGPT-4o使用  
Tier 3: Claude Sonnet4 (Premium) - 構造化分析
Tier 4: OpenRouter Ensemble (Auxiliary) - 補完分析
```

#### API統合の現状

**✅ 実装完了**:
- **OpenAI GPT-4o**: `process.env.OPENAI_API_KEY` 使用
- **Google Gemini 2.0 Flash**: `process.env.GEMINI_API_KEY` 使用  
- **Claude 3.5 Sonnet**: `process.env.ANTHROPIC_API_KEY` 使用
- **Prometheus メトリクス記録**: 完全統合済み

**⚠️ 実装上の不一致**:
- **設定**: GPT-5と表記
- **実装**: GPT-4oを実際に使用（GPT-5は未公開のため）

#### Wall-Bounce実行フロー
```typescript
1. executeWallBounce() 呼び出し
   ↓
2. タスクタイプ別プロバイダー選択
   - basic: Gemini + GPT-4o  
   - premium: Gemini + GPT-4o + Claude
   - critical: 全プロバイダー
   ↓
3. 並列 LLM API呼び出し
   ↓
4. 合意形成アルゴリズム（Jaccard類似度）
   ↓
5. Prometheusメトリクス記録
   ↓
6. 統合結果返却
```

#### コスト計算
- **GPT-4o**: $2.50/1M入力, $10/1M出力トークン
- **Gemini 2.0 Flash**: $0.00000125/入力, $0.00000375/出力トークン  
- **Claude 3.5 Sonnet**: $0.000003/入力, $0.000015/出力トークン

## 3. Webアプリケーション構造

### フロントエンド実装
**メインファイル**: `/ai/prj/techsapo/public/standalone-top.html`

#### UI特徴
- **デザイン**: ダークテーマ、レスポンシブデザイン
- **技術**: Vanilla JavaScript、CSS Grid、Flexbox
- **機能**: リアルタイムWall-Bounce分析UI

#### 主要コンポーネント
```html
<form> 
  ├── <textarea id="demo-query"> - ユーザー入力
  ├── <select id="demo-level"> - 分析レベル選択  
  ├── <button onclick="runDemo()"> - 実行ボタン
  └── <div id="demo-output"> - 結果表示エリア
</form>
```

#### JavaScript API統合
```javascript
// POST /api/v1/generate
fetch('/api/v1/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: query,
    task_type: level  // basic|premium|critical
  })
})
```

### バックエンド実装
**メインファイル**: `/ai/prj/techsapo/src/server.ts`

#### Express サーバー設定
- **Port**: 3000/3001 (現在3001で稼働中)
- **Middleware**: CORS, Helmet, Express.json
- **Static Files**: `/ai/prj/techsapo/public/` サービング

#### 主要API エンドポイント
```typescript
POST /api/v1/generate          // Wall-Bounce分析実行
POST /api/v1/analyze-logs      // ログ分析  
GET  /api/v1/health           // ヘルスチェック
GET  /api/v1/metrics/stream   // リアルタイムメトリクス (SSE)
GET  /api/v1/rag/*            // RAG関連 API
```

## 4. 依存関係とAPIキー設定

### package.json 依存関係

#### 本番依存関係
```json
{
  "@huggingface/hub": "^0.15.1",
  "@huggingface/inference": "^2.8.0",
  "axios": "^1.6.2",
  "express": "^4.18.2",
  "openai": "^4.104.0",
  "googleapis": "^126.0.1",
  "redis": "^4.6.10",
  "winston": "^3.11.0"
}
```

#### 開発依存関係
```json  
{
  "typescript": "^5.3.3",
  "@types/node": "^20.10.4",
  "jest": "^29.7.0",
  "ts-jest": "^29.4.1"
}
```

#### ⚠️ 不足している依存関係
```bash
npm install @google/generative-ai    # Gemini API用
npm install @anthropic-ai/sdk        # Claude API用  
```

### 環境変数設定

#### 必須APIキー
```bash
# OpenAI (Wall-Bounce実装で使用)
OPENAI_API_KEY=sk-proj-...
OPENAI_ORGANIZATION=org-...

# Google Gemini (Wall-Bounce実装で使用)  
GEMINI_API_KEY=AIza...

# Anthropic Claude (Wall-Bounce実装で使用)
ANTHROPIC_API_KEY=sk-ant-...

# HuggingFace (埋め込み用)
HUGGINGFACE_API_KEY=hf_...

# Redis (Upstash)
UPSTASH_REDIS_URL=redis://...
UPSTASH_REDIS_TOKEN=...
```

#### セキュリティ実装
- **gitignore**: `.env`, `*.key`, `secrets/` 除外設定済み
- **認証**: ヘッダーベースAPIキー認証 (`x-openai-api-key`)
- **CORS**: Express CORS ミドルウェア設定済み

## 5. 実行状況と稼働プロセス

### 現在稼働中のプロセス
```bash
# プロセス確認結果 (2025-09-25 06:23:22)
PID: 203286 - node dist/server.js (Port 3000)
PID: 209863 - node dist/server.js (Port 3001)  

# ヘルスチェック成功
curl http://localhost:3001/health
→ {"status":"ok","uptime":5881.83...}
```

### サーバー稼働設定
```typescript
// メモリ最適化設定
NODE_OPTIONS='--max-old-space-size=512 --expose-gc'

// サーバー起動コマンド  
npm run build && node dist/server.js
```

### 実際のAPI検証状況

#### ✅ 検証済み機能
1. **Express サーバー**: Port 3001で正常稼働
2. **静的ファイルサービング**: `/public/` ディレクトリ
3. **ヘルスチェック**: `/health` エンドポイント応答正常
4. **TypeScript コンパイル**: `dist/` ディレクトリに正常出力

#### ⚠️ 未検証項目  
1. **実際のLLM API呼び出し**: APIキー設定に依存
2. **Redis接続**: Upstashクレデンシャル必要
3. **GoogleDrive Webhook**: HTTPS環境必要

## 6. TypeScript vs CommonJS 使い分け

### 開発環境 (TypeScript)
```typescript
// src/services/wall-bounce-analyzer.ts
export class WallBounceAnalyzer {
  async executeWallBounce(): Promise<WallBounceResult> {
    // 型安全性確保された実装
  }
}
```

### 本番環境 (CommonJS)
```javascript  
// dist/services/wall-bounce-analyzer.js
class WallBounceAnalyzer {
  async executeWallBounce() {
    // コンパイル済みJavaScript
  }
}
```

### ビルド設定
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS", 
    "outDir": "./dist",
    "strict": true
  }
}
```

## 7. 監視・メトリクス実装

### Prometheus統合
```typescript
// src/metrics/prometheus-client.ts
export function recordWallBounceAnalysis(
  taskType: string,
  providers: string[],
  confidence: number,
  processingTime: number,
  cost: number,
  status: string
): void
```

### Docker監視スタック
```yaml
# docker/docker-compose.monitoring.yml
services:
  prometheus:    # メトリクス収集
  grafana:       # 可視化ダッシュボード  
  alertmanager:  # アラート管理
```

## 8. 今後の改善点

### 短期的改善
1. **依存関係解決**: `@google/generative-ai`, `@anthropic-ai/sdk`
2. **APIキー設定**: 本番環境用環境変数
3. **エラーハンドリング**: フォールバック機構強化

### 長期的改善  
1. **キャッシュ戦略**: Redis活用した応答高速化
2. **ストリーミング**: Server-Sent Eventsによるリアルタイム結果
3. **多言語対応**: i18n実装

## 9. Codex開発指針

### 開発時の重要原則
1. **Wall-Bounce必須**: すべての解決に2つ以上のLLM使用
2. **既存ファイル優先**: 新規ファイル作成は最小限
3. **TypeScript First**: 新規開発はTypeScriptで実装
4. **メモリ最適化**: 512MB heap制限遵守

### コード品質基準
```bash
npm run lint       # ESLint検証
npm run build      # TypeScriptコンパイル
npm test          # Jest単体テスト
```

---

**ドキュメント生成日時**: 2025-09-25 06:23:22 UTC  
**対象コミット**: 2a340c97 (feat: Replace mock implementations with real LLM API calls)  
**稼働確認**: Port 3001 正常稼働中