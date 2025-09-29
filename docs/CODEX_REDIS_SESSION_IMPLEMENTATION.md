# Codex Redis Session Implementation Guide

## 🎯 概要

Upstash Redisを使用してCodex MCPサーバーとClaude Codeの複数回やりとり（multi-turn session）を実現する完全な実装が完了しました。

## 🏗️ アーキテクチャ概要

### セッション管理フロー
```
Claude Code (MCP Client)
    ↓
Codex Session API (/api/codex/*)
    ↓
CodexMCPWrapper (セッション制御)
    ↓
CodexSessionManager (Redis管理)
    ↓
Upstash Redis (セッション永続化)
    ↓
Codex CLI (MCP Server)
```

### 主要コンポーネント

#### 1. CodexSessionManager (`src/services/codex-session-manager.ts`)
- **機能**: Redisベースのセッション管理
- **責任**: セッション作成、継続、履歴管理、クリーンアップ
- **特徴**:
  - セッションIDと会話IDの二重管理
  - 自動有効期限設定（1時間）
  - ユーザー別セッション数制限（10セッション）
  - メッセージ履歴の完全保持

#### 2. CodexMCPWrapper (`src/services/codex-mcp-wrapper.ts`)
- **機能**: Codex MCP実行とRedisセッション統合
- **責任**: MCPリクエスト実行、レスポンス処理、セッション更新
- **特徴**:
  - 非同期プロセス管理
  - タイムアウト処理（30秒）
  - コンテキスト構築（過去5メッセージ）

#### 3. Codex Session API (`src/routes/codex-session.ts`)
- **機能**: RESTful API エンドポイント
- **エンドポイント**:
  - `POST /api/codex/session` - 新規セッション作成
  - `POST /api/codex/continue` - セッション継続
  - `GET /api/codex/history/:id` - 履歴取得
  - `GET /api/codex/session/:id` - セッション詳細
  - `DELETE /api/codex/session/:id` - セッション削除
  - `GET /api/codex/stats` - 統計情報

## 🔧 実装詳細

### Redis データ構造

#### セッションデータ
```typescript
interface CodexSessionData {
  sessionId: string;           // 内部セッションID
  conversationId: string;      // 外部会話ID
  createdAt: string;          // 作成日時
  lastUsedAt: string;         // 最終使用日時
  prompt: string;             // 初期プロンプト
  model: string;              // 使用モデル（gpt-5-codex）
  sandbox: string;            // サンドボックス設定
  context: any[];             // コンテキスト情報
  messages: CodexMessage[];    // メッセージ履歴
  status: 'active' | 'completed' | 'failed';
}
```

#### Redis キー構造
```
codex:session:{sessionId}        - セッションデータ
codex:conversation:{conversationId} - 会話ID→セッションIDマッピング
user:sessions:{userId}           - ユーザー別セッション管理
```

### セッション継続ロジック

#### 1. 新規セッション作成
```typescript
async createSession(data: {
  prompt: string;
  model?: string;
  sandbox?: string;
  userId?: string;
}): Promise<CodexSessionData>
```

#### 2. セッション継続
```typescript
async continueSession(request: CodexContinueRequest): Promise<CodexSessionData | null>
```

#### 3. コンテキスト構築
- 過去5メッセージを含むコンテキストプロンプト生成
- ユーザー/アシスタントの会話履歴を構造化

## 📡 API 使用例

### 1. 新規Codexセッション開始

**リクエスト:**
```bash
curl -X POST http://localhost:3000/api/codex/session \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "TypeScriptで計算機クラスを作成して",
    "model": "gpt-5-codex",
    "sandbox": "read-only",
    "userId": "user123"
  }'
```

**レスポンス:**
```json
{
  "success": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "conversationId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "response": "// TypeScript計算機クラス\nclass Calculator { ... }",
  "metadata": {
    "model": "gpt-5-codex",
    "sandbox": "read-only",
    "timestamp": "2025-09-26T02:00:00.000Z"
  }
}
```

### 2. セッション継続

**リクエスト:**
```bash
curl -X POST http://localhost:3000/api/codex/continue \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "prompt": "multiply と divide メソッドも追加して"
  }'
```

**レスポンス:**
```json
{
  "success": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "conversationId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "response": "// 計算機クラスに乗除算を追加\nclass Calculator {\n  // ... 既存のメソッド\n  multiply(a: number, b: number) { return a * b; }\n  divide(a: number, b: number) { return b !== 0 ? a / b : null; }\n}",
  "metadata": {
    "continued": true,
    "timestamp": "2025-09-26T02:05:00.000Z"
  }
}
```

### 3. 会話履歴取得

**リクエスト:**
```bash
curl http://localhost:3000/api/codex/history/6ba7b810-9dad-11d1-80b4-00c04fd430c8
```

**レスポンス:**
```json
{
  "success": true,
  "identifier": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "messageCount": 4,
  "messages": [
    {
      "type": "user",
      "content": "TypeScriptで計算機クラスを作成して",
      "timestamp": "2025-09-26T02:00:00.000Z"
    },
    {
      "type": "assistant", 
      "content": "// TypeScript計算機クラス\nclass Calculator { ... }",
      "timestamp": "2025-09-26T02:00:15.000Z"
    },
    {
      "type": "user",
      "content": "multiply と divide メソッドも追加して",
      "timestamp": "2025-09-26T02:05:00.000Z"
    },
    {
      "type": "assistant",
      "content": "// 計算機クラスに乗除算を追加...",
      "timestamp": "2025-09-26T02:05:10.000Z"
    }
  ]
}
```

## 🔐 設定要件

### 環境変数
```bash
# Upstash Redis設定（必須）
UPSTASH_REDIS_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_TOKEN=your_redis_token_here

# OpenAI設定（Codex用）
OPENAI_API_KEY=your_openai_api_key

# サーバー設定
PORT=3000
NODE_ENV=development
```

### Codex CLI設定
```toml
# ~/.codex/config.toml
[server]
host = "localhost"
port = 3001
log_level = "info"

[mcp]
enabled = true
name = "codex-mcp-server"
description = "OpenAI Codex MCP Server for code generation and analysis"
version = "1.0.0"

[providers]
openai_model = "gpt-5"
max_tokens = 4000
temperature = 0.1

[projects."/ai/prj/techsapo"]
trust_level = "trusted"
```

## 🚀 動作フロー

### 1. セッション作成フロー
1. クライアントが`POST /api/codex/session`リクエスト
2. `CodexSessionManager`が新規セッションをRedisに作成
3. `CodexMCPWrapper`がCodex CLIを実行
4. 結果をRedisセッションに保存
5. レスポンスに`sessionId`と`conversationId`を返却

### 2. セッション継続フロー  
1. クライアントが`POST /api/codex/continue`リクエスト
2. `conversationId`でRedisからセッション取得
3. 会話履歴からコンテキストプロンプト構築
4. Codex CLIにコンテキスト付きリクエスト実行
5. 新しいメッセージをセッションに追加保存
6. レスポンスを返却

### 3. セッション管理フロー
- **有効期限**: 1時間の自動有効期限
- **制限**: ユーザー当たり最大10セッション
- **クリーンアップ**: 期限切れセッションの自動削除
- **追跡**: セッション統計とヘルスチェック

## ⚡ パフォーマンス特徴

### スケーラビリティ
- **並行セッション**: 無制限の同時セッション対応
- **メモリ効率**: Redisによる外部セッション管理
- **高速アクセス**: Upstash Redisの低レイテンシ

### 信頼性
- **障害復旧**: プロセス再起動後のセッション復元
- **タイムアウト処理**: 30秒のCodex実行タイムアウト
- **エラーハンドリング**: 包括的エラー処理とログ

### 監視・運用
- **セッション統計**: アクティブセッション数、会話数
- **ヘルスチェック**: Redis接続状態の監視
- **コスト追跡**: トークン使用量とAPI課金の追跡

## 🎯 利用シナリオ

### 1. 長時間の開発セッション
```javascript
// 1. プロジェクト作成開始
POST /api/codex/session
{ "prompt": "新しいWebアプリプロジェクトを作成" }

// 2. 機能追加
POST /api/codex/continue  
{ "prompt": "ユーザー認証機能を追加" }

// 3. テスト追加
POST /api/codex/continue
{ "prompt": "単体テストを書いて" }

// 4. デバッグ支援
POST /api/codex/continue
{ "prompt": "認証エラーを修正して" }
```

### 2. コードレビュー・リファクタリング
```javascript
// 1. コード分析開始
POST /api/codex/session
{ "prompt": "このReactコンポーネントをレビューして", "context": "..." }

// 2. 改善提案
POST /api/codex/continue
{ "prompt": "パフォーマンスを改善する方法は？" }

// 3. リファクタリング実行
POST /api/codex/continue  
{ "prompt": "提案された改善を適用して" }
```

### 3. 学習・チュートリアル
```javascript
// 1. 概念説明
POST /api/codex/session
{ "prompt": "TypeScript decoratorsについて教えて" }

// 2. 実践例
POST /api/codex/continue
{ "prompt": "実際のコード例を書いて" }

// 3. 応用問題
POST /api/codex/continue
{ "prompt": "これを使ったミドルウェアパターンを実装して" }
```

## 🔧 故障診断・トラブルシューティング

### 一般的な問題

#### 1. セッションが見つからない
**症状**: `Session not found for conversation_id: xxx`
**原因**: セッションの有効期限切れまたは削除
**対策**: 
- セッション有効期限の確認（デフォルト1時間）
- `GET /api/codex/session/:id` でセッション状態確認

#### 2. Redis接続エラー
**症状**: `Upstash Redis URL and TOKEN are required`
**原因**: 環境変数未設定
**対策**:
```bash
export UPSTASH_REDIS_URL=https://your-instance.upstash.io
export UPSTASH_REDIS_TOKEN=your_token
```

#### 3. Codex実行タイムアウト
**症状**: `Codex execution timeout`
**原因**: OpenAI API認証または通信問題
**対策**: 
- `OPENAI_API_KEY`の確認
- `codex login status`でCodex認証確認

### デバッグコマンド

#### セッション統計確認
```bash
curl http://localhost:3000/api/codex/stats
```

#### セッション詳細確認
```bash
curl http://localhost:3000/api/codex/session/SESSION_ID
```

#### 手動クリーンアップ
```bash
curl -X POST http://localhost:3000/api/codex/cleanup
```

## 🎉 実装完了サマリー

✅ **Redis セッション管理**: Upstash Redis完全統合  
✅ **マルチターン会話**: 会話履歴の永続化と継続  
✅ **MCP プロトコル**: Codex CLI MCPサーバー連携  
✅ **RESTful API**: 完全なセッション管理API  
✅ **スケーラビリティ**: 並行セッション対応  
✅ **信頼性**: タイムアウト・エラーハンドリング  
✅ **監視機能**: 統計・ヘルスチェック・ログ  
✅ **ドキュメント**: 完全な実装・運用ガイド  

## 🔮 今後の拡張可能性

### 短期的改善
- セッション共有機能（チーム開発用）
- セッションのインポート/エクスポート
- カスタムタイムアウト設定

### 長期的発展
- 音声入力対応セッション
- WebSocketリアルタイム通信
- セッション分析・インサイト機能
- 他MCPサーバーとの統合

---

**実装完了日**: 2025年9月26日  
**実装者**: Claude Code + Codex MCP Integration  
**バージョン**: v1.0.0 (Redis Session Management)

この実装により、Claude CodeとCodexのシームレスな複数回やりとりが実現され、継続的な開発セッションが可能になりました。