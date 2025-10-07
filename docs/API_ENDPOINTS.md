# TechSapo API エンドポイント一覧

**バージョン:** 1.0.0
**最終更新:** 2025-10-05
**ベースURL:** `http://localhost:8443` (開発)、`https://techsapo.com` (本番)

---

## 目次

1. [システムエンドポイント](#1-システムエンドポイント)
2. [Wall-Bounce API (マルチLLM分析)](#2-wall-bounce-api-マルチllm分析)
3. [Codex セッション API (GPT-5)](#3-codex-セッション-api-gpt-5)
4. [IT統合支援 API](#4-it統合支援-api)
5. [Gmail API](#5-gmail-api)
6. [HuggingFace API](#6-huggingface-api)
7. [RAG API (Google Drive)](#7-rag-api-google-drive)
8. [Context7 API (ドキュメント検索)](#8-context7-api-ドキュメント検索)
9. [監査ログ API](#9-監査ログ-api)
10. [ヘルスチェック](#10-ヘルスチェック)

---

## 1. システムエンドポイント

### 1.1 ルート

```
GET /
```

**説明:** サービス情報取得

**レスポンス:**
```json
{
  "message": "TechSapo Hugging Face Integration API",
  "version": "1.0.0",
  "status": "running",
  "docs": "/api/docs",
  "health": "/health",
  "timestamp": "2025-10-05T12:00:00.000Z"
}
```

---

### 1.2 Ping (ロードバランサー用)

```
GET /ping
```

**説明:** シンプルなヘルスチェック

**レスポンス:**
```json
{
  "status": "OK",
  "timestamp": "2025-10-05T12:00:00.000Z",
  "service": "techsapo-huggingface-integration"
}
```

---

### 1.3 API ドキュメント

```
GET /api/docs
```

**説明:** 全エンドポイント一覧とAPI仕様

**レスポンス:**
```json
{
  "service": "TechSapo Hugging Face Integration API",
  "version": "1.0.0",
  "description": "Multi-Tier LLM Orchestrator with Japanese embedding models integration",
  "endpoints": {
    "health": "GET /health - Health check",
    "info": "GET /info - System information",
    ...
  }
}
```

---

## 2. Wall-Bounce API (マルチLLM分析)

**ベースパス:** `/api/v1/wall-bounce`

### 2.1 SSEストリーミング分析

```
GET /api/v1/wall-bounce/analyze?query={query}&mode={mode}&session_id={session_id}
```

**説明:** リアルタイムWall-Bounce分析 (Server-Sent Events)

**クエリパラメータ:**
- `query` (必須): 分析クエリ
- `mode` (オプション): `parallel` | `sequential` (デフォルト: `parallel`)
- `session_id` (オプション): セッションID

**SSEイベント:**
- `message`: 接続確立
- `thinking`: 思考プロセス
- `provider_response`: 各プロバイダの応答
- `consensus`: コンセンサススコア更新
- `final_answer`: 最終回答
- `error`: エラー発生
- `close`: 接続終了

**使用例:**
```bash
curl -N "http://localhost:8443/api/v1/wall-bounce/analyze?query=ReactのuseEffectとuseLayoutEffectの違いは？&mode=parallel"
```

**応答例 (SSEストリーム):**
```
event: message
data: {"type":"connected","message":"Wall-Bounce analysis stream connected","mode":"parallel"}

event: thinking
data: {"provider":"gemini-2.5-pro","step":"analyzing","content":"Analyzing query...","timestamp":"2025-10-05T12:00:00.000Z"}

event: provider_response
data: {"provider":"gemini-2.5-pro","response":"useEffectはレンダリング後に非同期で実行されますが...","timestamp":"2025-10-05T12:00:00.000Z"}

event: consensus
data: {"score":0.85,"timestamp":"2025-10-05T12:00:00.000Z"}

event: final_answer
data: {"answer":"useEffectとuseLayoutEffectの主な違いは...",\"metadata\":{...}}

event: close
data: {}
```

---

### 2.2 POST マルチプロバイダ分析 (JSON)

```
POST /api/v1/wall-bounce/analyze
```

**説明:** マルチプロバイダWall-Bounce分析 (parallel/sequential切替可能)

**リクエストボディ:**
```json
{
  "query": "TypeScriptのgenericsとは何ですか？",
  "mode": "parallel",
  "depth": 1,
  "providers": ["gemini-2.5-pro", "gpt-5-codex"],
  "providerOrder": ["gemini", "gpt5", "claude"],
  "customGuidance": {
    "gemini-2.5-pro": "コード例を多く含めてください"
  },
  "timeout": 120000
}
```

**パラメータ:**
- `query` (必須): 分析クエリ
- `mode` (オプション): `parallel` | `sequential` (デフォルト: `parallel`)
- `depth` (オプション): 分析深度 (1-5、デフォルト: 1)
- `providers` (オプション): 使用プロバイダの配列
- `providerOrder` (オプション): プロバイダ順序指定
- `customGuidance` (オプション): プロバイダ別カスタムガイダンス
- `timeout` (オプション): タイムアウト (ms、デフォルト: 120000)

**レスポンス:**
```json
{
  "success": true,
  "mode": "parallel",
  "depth": 1,
  "final_answer": "TypeScriptのgenericsは型の再利用性を高める機能で...",
  "responses": [
    {
      "provider": "gemini-2.5-pro",
      "response": "Genericsは型パラメータを使用して...",
      "confidence": 0.92
    },
    {
      "provider": "gpt-5-codex",
      "response": "ジェネリクスを使うことで...",
      "confidence": 0.88
    }
  ],
  "consensus_score": 0.87,
  "quality_score": 0.91,
  "providers_used": ["gemini-2.5-pro", "gpt-5-codex"],
  "processing_time_ms": 8432,
  "total_cost": 0.002134,
  "timestamp": "2025-10-05T12:00:00.000Z"
}
```

---

### 2.3 単一プロバイダ分析

```
POST /api/v1/wall-bounce/single
```

**説明:** 指定プロバイダのみで分析 (JSON)

**リクエストボディ:**
```json
{
  "query": "Dockerのマルチステージビルドとは？",
  "provider": "gemini-2.5-pro",
  "timeout": 60000
}
```

**利用可能プロバイダ:**
- `gemini-2.5-pro`
- `gemini-2.5-flash`
- `gpt-5-codex`
- `openrouter-qwen3-coder`
- `sonnet-4.5`

**レスポンス:**
```json
{
  "success": true,
  "provider": "gemini-2.5-pro",
  "response": "Dockerのマルチステージビルドは...",
  "metadata": {
    "confidence": 0.89,
    "tokensUsed": 345,
    "processingTimeMs": 4521,
    "timestamp": "2025-10-05T12:00:00.000Z"
  }
}
```

---

### 2.4 シンプル分析 (非推奨)

```
POST /api/v1/wall-bounce/analyze-simple
```

**⚠️ 非推奨:** 代わりに `POST /analyze` を使用してください

---

### 2.5 ヘルスチェック

```
GET /api/v1/wall-bounce/health
```

**レスポンス:**
```json
{
  "success": true,
  "service": "techsapo-wall-bounce-api",
  "status": "operational",
  "endpoints": {
    "GET /analyze": "SSE streaming Wall-Bounce分析",
    "POST /single": "単一プロバイダ分析 (JSON)",
    "POST /analyze": "マルチプロバイダWall-Bounce分析 (JSON)"
  },
  "supported_modes": ["parallel", "sequential"],
  "mode_switching": {
    "description": "ユーザが任意にモード切替可能",
    "parameter": "mode",
    "values": ["parallel", "sequential"],
    "default": "parallel"
  }
}
```

---

## 3. Codex セッション API (GPT-5)

**ベースパス:** `/api/v1/codex`

### 3.1 新規セッション開始

```
POST /api/v1/codex/session
```

**説明:** GPT-5 Codexセッション開始

**リクエストボディ:**
```json
{
  "prompt": "TypeScriptでRESTful APIを作成してください",
  "model": "gpt-5-codex",
  "sandbox": "read-only",
  "userId": "user123"
}
```

**パラメータ:**
- `prompt` (必須): 初期プロンプト
- `model` (オプション): モデル名 (デフォルト: `gpt-5-codex`)
- `sandbox` (オプション): `read-only` | `workspace-write` | `danger-full-access` (デフォルト: `read-only`)
- `userId` (オプション): ユーザーID

**レスポンス:**
```json
{
  "success": true,
  "sessionId": "sess_1728123456789",
  "conversationId": "conv_abc123",
  "response": "TypeScriptでRESTful APIを作成します...",
  "error": null,
  "metadata": {
    "model": "gpt-5-codex",
    "sandbox": "read-only",
    "timestamp": "2025-10-05T12:00:00.000Z"
  }
}
```

---

### 3.2 セッション継続 (Wall-Bounce統合)

```
POST /api/v1/codex/continue
```

**説明:** 既存セッション継続 (2回目以降はWall-Bounceルーティング適用)

**リクエストボディ:**
```json
{
  "prompt": "エラーハンドリングも追加してください",
  "sessionId": "sess_1728123456789",
  "conversationId": "conv_abc123",
  "userId": "user123"
}
```

**パラメータ:**
- `prompt` (必須): 継続プロンプト
- `sessionId` or `conversationId` (必須): セッションID
- `userId` (オプション): ユーザーID

**特徴:**
- **1回目:** GPT-5 Codexのみ使用
- **2回目以降:** マルチLLM Wall-Bounceルーティング適用

**レスポンス:**
```json
{
  "success": true,
  "sessionId": "sess_1728123456789",
  "conversationId": "conv_abc123",
  "response": "エラーハンドリングを追加しました...",
  "error": null,
  "metadata": {
    "continued": true,
    "wallBounce": true,
    "providers": ["gpt-5-codex", "gemini-2.5-pro", "sonnet-4.5"],
    "timestamp": "2025-10-05T12:00:00.000Z"
  }
}
```

---

## 4. IT統合支援 API

**ベースパス:** `/api/v1/it-unified`

### 4.1 統合IT支援

```
POST /api/v1/it-unified
```

**説明:** ログ解析と技術支援を単一エンドポイントで処理 (自動判別)

**リクエストタイプ1: ログ解析 (Wall-Bounce適用)**
```json
{
  "user_command": "sudo systemctl restart nginx",
  "error_output": "Failed to restart nginx.service: Unit nginx.service not found.",
  "system_context": "Ubuntu 22.04, Nginx 1.24",
  "log_type": "systemd",
  "request_type": "log_analysis"
}
```

**リクエストタイプ2: 技術支援**
```json
{
  "prompt": "Kubernetesのデプロイメント戦略を説明してください",
  "task_type": "premium",
  "conversation_id": "conv_xyz789",
  "request_type": "technical_support"
}
```

**リクエストタイプ3: 自動判別**
```json
{
  "error_output": "ECONNREFUSED 127.0.0.1:3306",
  "request_type": "auto_detect"
}
```

**パラメータ:**
- `request_type` (オプション): `log_analysis` | `technical_support` | `auto_detect`
  - 未指定時は自動判別
- **ログ解析用:**
  - `error_output`: エラー出力
  - `user_command` (オプション): 実行コマンド
  - `system_context` (オプション): システム情報
  - `log_type` (オプション): ログタイプ
- **技術支援用:**
  - `prompt`: 質問内容
  - `task_type` (オプション): `basic` | `premium` | `critical`
  - `conversation_id` (オプション): 会話ID

**レスポンス (ログ解析):**
```json
{
  "success": true,
  "request_type": "log_analysis",
  "log_analysis": {
    "type": "log_analysis",
    "analysis": {
      "problem_category": "service_not_found",
      "severity_level": "high",
      "confidence_score": 0.92,
      "solution_steps": [
        "nginxがインストールされているか確認: `dpkg -l | grep nginx`",
        "インストールされていない場合: `sudo apt install nginx`",
        "サービス名を確認: `systemctl list-units --type=service | grep nginx`"
      ],
      "related_services": ["nginx", "systemd"],
      "estimated_fix_time_minutes": 10
    },
    "summary": "service_not_found (信頼度: 92%)",
    "urgent_action_required": true
  },
  "recommendations": [
    "🚨 高優先度の問題です。速やかな対処をお勧めします。",
    "🔧 3つの解決手順が提案されています。順次実行してください。",
    "🔗 関連サービス(nginx, systemd)の状況も確認してください。"
  ],
  "metadata": {
    "processing_time_ms": 3421,
    "timestamp": "2025-10-05T12:00:00.000Z",
    "service": "techsapo-it-unified",
    "version": "1.0.0"
  }
}
```

**レスポンス (技術支援):**
```json
{
  "success": true,
  "request_type": "technical_support",
  "technical_support": {
    "type": "technical_support",
    "response": "Kubernetesのデプロイメント戦略には主に3つあります...",
    "task_type": "premium",
    "model_used": "Claude Sonnet 4",
    "estimated_cost_usd": 0.05,
    "conversation_id": "conv_xyz789",
    "summary": "PREMIUMレベルの技術支援をClaude Sonnet 4で処理"
  },
  "recommendations": [
    "✅ 高品質な分析が完了しました。提案された手順に従って実行してください。",
    "🔍 実行後は結果をモニタリングしてください。",
    "🔄 会話ID: conv_xyz789 - 追加質問時にご利用ください。"
  ],
  "metadata": {
    "processing_time_ms": 5234,
    "timestamp": "2025-10-05T12:00:00.000Z",
    "service": "techsapo-it-unified",
    "version": "1.0.0"
  }
}
```

**タスクタイプ別モデル:**
- `basic`: Gemini 2.5 Flash + Claude Haiku 3.5 ($0.01)
- `premium`: Claude Sonnet 4 ($0.05)
- `critical`: Claude Opus 4.1 ($0.15)

---

### 4.2 ヘルスチェック

```
GET /api/v1/it-unified/health
```

**レスポンス:**
```json
{
  "success": true,
  "service": "techsapo-it-unified",
  "status": "operational",
  "features": {
    "log_analysis": "ログ解析とトラブルシューティング",
    "technical_support": "Multi-LLM技術支援 (basic/premium/critical)",
    "auto_detection": "リクエストタイプの自動判別",
    "unified_endpoint": "単一エンドポイントでの統合処理"
  },
  "usage": {
    "log_analysis": "POST / with error_output field",
    "technical_support": "POST / with prompt field",
    "auto_detection": "POST / with request_type: \"auto_detect\""
  }
}
```

---

## 5. Gmail API

**ベースパス:** `/api/v1/gmail`

### 5.1 OAuth認証URL取得

```
GET /api/v1/gmail/auth
```

**説明:** Gmail OAuth2認証URL生成 (CSRF保護付き)

**レスポンス:**
```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "state": "csrf_9e7d2c1b...",
  "message": "Visit this URL to authorize Gmail access. Keep the state parameter for verification."
}
```

**使用フロー:**
1. この URLにアクセスしてGoogleアカウント認証
2. 認証後、コールバックURL (`/auth/callback`) にリダイレクト
3. `state` パラメータでCSRF検証

---

### 5.2 OAuth コールバック

```
GET /api/v1/gmail/auth/callback?code={code}&state={state}
```

**説明:** OAuth認証完了ハンドラ (CSRF検証付き)

**クエリパラメータ:**
- `code`: Authorization code (Googleから返却)
- `state`: CSRF protection token

**レスポンス (成功):**
```json
{
  "success": true,
  "message": "Gmail authentication successful. You can now send emails."
}
```

**レスポンス (CSRF検証失敗):**
```json
{
  "success": false,
  "error": "CSRF validation failed",
  "message": "Invalid or expired state parameter"
}
```

**HTTPステータス:**
- 200: 成功
- 400: パラメータエラー
- 403: CSRF検証失敗
- 500: 認証エラー

---

### 5.3 メール送信 (プレーンテキスト)

```
POST /api/v1/gmail/send
```

**説明:** プレーンテキストメール送信 (入力検証付き)

**リクエストボディ:**
```json
{
  "to": "recipient@example.com",
  "subject": "テストメール",
  "body": "これはテストメールです。"
}
```

**バリデーション:**
- `to`: 有効なメールアドレス (最大254文字)
- `subject`: 必須、最大998文字
- `body`: 必須、最大1MB

**レスポンス:**
```json
{
  "success": true,
  "messageId": "18c3f2a4b5d6e7f8",
  "message": "Email sent successfully"
}
```

---

### 5.4 HTMLメール送信

```
POST /api/v1/gmail/send-html
```

**説明:** HTMLメール送信 (CC/BCC対応)

**リクエストボディ:**
```json
{
  "to": "recipient@example.com",
  "subject": "HTMLメール",
  "body": "プレーンテキスト版",
  "htmlBody": "<h1>HTMLメール</h1><p>これはHTMLメールです。</p>",
  "cc": ["cc1@example.com", "cc2@example.com"],
  "bcc": ["bcc@example.com"]
}
```

**バリデーション:**
- `htmlBody`: オプション、最大1MB
- `cc`: 最大100件
- `bcc`: 最大100件

**レスポンス:**
```json
{
  "success": true,
  "messageId": "28d4g3b5c6e8f9g0",
  "message": "HTML email sent successfully"
}
```

---

### 5.5 メール一覧取得

```
GET /api/v1/gmail/messages?maxResults={max}&query={query}&labelIds={labels}&pageToken={token}
```

**クエリパラメータ:**
- `maxResults` (オプション): 取得件数 (デフォルト: 100)
- `query` (オプション): 検索クエリ (Gmail検索構文)
- `labelIds` (オプション): ラベルID (カンマ区切り)
- `pageToken` (オプション): ページネーショントークン

**使用例:**
```bash
curl "http://localhost:8443/api/v1/gmail/messages?maxResults=10&query=from:noreply@github.com&labelIds=INBOX"
```

**レスポンス:**
```json
{
  "success": true,
  "count": 10,
  "messages": [
    {
      "id": "18c3f2a4b5d6e7f8",
      "threadId": "18c3f2a4b5d6e7f8",
      "labelIds": ["INBOX", "UNREAD"],
      "snippet": "GitHub notification: New pull request..."
    }
  ]
}
```

---

### 5.6 メール詳細取得

```
GET /api/v1/gmail/messages/:id
```

**パスパラメータ:**
- `id`: メッセージID

**レスポンス:**
```json
{
  "success": true,
  "message": {
    "id": "18c3f2a4b5d6e7f8",
    "threadId": "18c3f2a4b5d6e7f8",
    "labelIds": ["INBOX"],
    "snippet": "GitHub notification...",
    "payload": {
      "headers": [
        {"name": "From", "value": "noreply@github.com"},
        {"name": "Subject", "value": "New pull request"}
      ],
      "body": {
        "size": 1234,
        "data": "base64EncodedContent..."
      }
    }
  }
}
```

---

### 5.7 ラベル一覧取得

```
GET /api/v1/gmail/labels
```

**レスポンス:**
```json
{
  "success": true,
  "count": 15,
  "labels": [
    {
      "id": "INBOX",
      "name": "INBOX",
      "type": "system"
    },
    {
      "id": "Label_123",
      "name": "Work",
      "type": "user"
    }
  ]
}
```

---

### 5.8 トークン更新

```
POST /api/v1/gmail/refresh-token
```

**説明:** Access Token手動更新

**レスポンス:**
```json
{
  "success": true,
  "message": "Access token refreshed successfully",
  "tokenPreview": "ya29.a0AfH6SMBw3..."
}
```

---

## 6. HuggingFace API

**ベースパス:** `/api/v1/huggingface` または `/api/huggingface` または `/`

### 6.1 ヘルスチェック

```
GET /health
```

**レスポンス:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-05T12:00:00.000Z",
  "uptime": 123456
}
```

---

### 6.2 システム情報

```
GET /info
```

**レスポンス:**
```json
{
  "service": "TechSapo HuggingFace Integration",
  "version": "1.0.0",
  "models": {
    "embedding": 5,
    "inference": 3
  }
}
```

---

### 6.3 利用可能モデル一覧

```
GET /models
```

**レスポンス:**
```json
{
  "embedding_models": [
    {
      "id": "intfloat/multilingual-e5-large",
      "name": "Multilingual E5 Large",
      "language": "multilingual",
      "dimensions": 1024
    }
  ],
  "inference_models": [
    {
      "id": "gpt2",
      "name": "GPT-2",
      "type": "text-generation"
    }
  ]
}
```

---

### 6.4 エンベディング生成

```
POST /embeddings
```

**リクエストボディ:**
```json
{
  "texts": ["こんにちは", "Hello, world"],
  "model": "intfloat/multilingual-e5-large"
}
```

**レスポンス:**
```json
{
  "embeddings": [
    [0.123, -0.456, ...],
    [0.789, -0.012, ...]
  ],
  "model": "intfloat/multilingual-e5-large",
  "dimensions": 1024
}
```

---

### 6.5 マルチモデル分析

```
POST /embeddings/analyze
```

**リクエストボディ:**
```json
{
  "texts": ["自然言語処理とは何ですか？"],
  "models": [
    "intfloat/multilingual-e5-large",
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
  ]
}
```

**レスポンス:**
```json
{
  "results": [
    {
      "model": "intfloat/multilingual-e5-large",
      "embeddings": [[...]],
      "processingTimeMs": 234
    },
    {
      "model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
      "embeddings": [[...]],
      "processingTimeMs": 156
    }
  ],
  "comparison": {
    "fastest_model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    "recommended": "intfloat/multilingual-e5-large"
  }
}
```

---

### 6.6 モデル推奨

```
POST /embeddings/recommend
```

**リクエストボディ:**
```json
{
  "task": "semantic-search",
  "language": "ja",
  "performance_priority": "accuracy"
}
```

**レスポンス:**
```json
{
  "recommended_model": "intfloat/multilingual-e5-large",
  "reason": "最高精度、日本語対応、セマンティック検索に最適",
  "alternatives": [
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
  ]
}
```

---

### 6.7 テキスト生成

```
POST /generate
```

**リクエストボディ:**
```json
{
  "prompt": "人工知能の未来について",
  "model": "gpt2-japanese",
  "max_length": 100,
  "temperature": 0.7
}
```

**レスポンス:**
```json
{
  "generated_text": "人工知能の未来については、様々な可能性が考えられます...",
  "model": "gpt2-japanese",
  "tokens_used": 85
}
```

---

### 6.8 会話継続

```
POST /conversation/continue
```

**リクエストボディ:**
```json
{
  "conversationId": "conv_123",
  "message": "もっと詳しく教えてください"
}
```

**レスポンス:**
```json
{
  "response": "詳しく説明すると...",
  "conversationId": "conv_123",
  "turn": 2
}
```

---

### 6.9 会話履歴取得

```
GET /conversation/:conversationId
```

**レスポンス:**
```json
{
  "conversationId": "conv_123",
  "messages": [
    {
      "role": "user",
      "content": "人工知能について教えて",
      "timestamp": "2025-10-05T12:00:00.000Z"
    },
    {
      "role": "assistant",
      "content": "人工知能は...",
      "timestamp": "2025-10-05T12:00:05.000Z"
    }
  ]
}
```

---

### 6.10 コストサマリー

```
GET /cost/summary
```

**レスポンス:**
```json
{
  "totalCost": 12.45,
  "currency": "USD",
  "breakdown": {
    "embeddings": 8.23,
    "inference": 4.22
  },
  "period": "2025-10-01 to 2025-10-05"
}
```

---

### 6.11 予算アラート

```
GET /cost/alerts
```

**レスポンス:**
```json
{
  "alerts": [
    {
      "level": "warning",
      "message": "Monthly budget 80% reached",
      "currentSpend": 80.00,
      "budgetLimit": 100.00
    }
  ]
}
```

---

### 6.12 日次レポート

```
GET /cost/report/daily
```

**レスポンス:**
```json
{
  "date": "2025-10-05",
  "totalCost": 2.34,
  "requests": 1234,
  "models": {
    "multilingual-e5-large": {
      "requests": 800,
      "cost": 1.50
    },
    "gpt2-japanese": {
      "requests": 434,
      "cost": 0.84
    }
  }
}
```

---

### 6.13 コスト予測

```
POST /cost/predict
```

**リクエストボディ:**
```json
{
  "plannedRequests": 10000,
  "model": "intfloat/multilingual-e5-large"
}
```

**レスポンス:**
```json
{
  "predictedCost": 15.67,
  "confidence": 0.85,
  "breakdown": {
    "baseCost": 14.50,
    "bufferCost": 1.17
  }
}
```

---

## 7. RAG API (Google Drive)

**ベースパス:** `/api/v1/rag`

### 7.1 ヘルスチェック

```
GET /api/v1/rag/health
```

**レスポンス:**
```json
{
  "status": "healthy",
  "service": "rag-system",
  "timestamp": "2025-10-05T12:00:00.000Z",
  "configuration": {
    "google_drive_configured": true,
    "openai_configured": true,
    "rag_connector_initialized": true
  }
}
```

---

### 7.2 Google Driveフォルダ同期

```
POST /api/v1/rag/sync-folder
```

**説明:** Google DriveフォルダをOpenAI Vector Storeに同期

**リクエストボディ:**
```json
{
  "folder_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "vector_store_name": "techsapo-docs",
  "batch_size": 5
}
```

**パラメータ:**
- `folder_id` (必須): Google Drive フォルダID
- `vector_store_name` (必須): Vector Store名
- `batch_size` (オプション): バッチサイズ (デフォルト: 5)

**レスポンス:**
```json
{
  "success": true,
  "vectorStoreId": "vs_abc123xyz789",
  "filesProcessed": 45,
  "filesBatched": 9,
  "totalSize": 12345678,
  "processingTimeMs": 123456,
  "details": {
    "folder_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "vector_store_name": "techsapo-docs",
    "files_synced": 45
  }
}
```

---

### 7.3 RAGクエリ実行

```
POST /api/v1/rag/query
```

**説明:** Vector Storeに対してクエリ実行 (Wall-Bounce統合)

**リクエストボディ:**
```json
{
  "query": "TypeScriptのgenericsについて教えてください",
  "vector_store_id": "vs_abc123xyz789",
  "max_results": 5,
  "use_wall_bounce": true
}
```

**パラメータ:**
- `query` (必須): 検索クエリ
- `vector_store_id` (必須): Vector Store ID
- `max_results` (オプション): 最大結果数 (デフォルト: 5)
- `use_wall_bounce` (オプション): Wall-Bounce分析適用 (デフォルト: false)

**レスポンス (Wall-Bounce無効):**
```json
{
  "success": true,
  "query": "TypeScriptのgenericsについて教えてください",
  "results": [
    {
      "content": "TypeScriptのgenericsは型の再利用性を...",
      "score": 0.92,
      "metadata": {
        "filename": "typescript-guide.md",
        "source": "google-drive"
      }
    }
  ],
  "processingTimeMs": 1234
}
```

**レスポンス (Wall-Bounce有効):**
```json
{
  "success": true,
  "query": "TypeScriptのgenericsについて教えてください",
  "retrievalResults": [...],
  "wallBounceAnalysis": {
    "final_answer": "TypeScriptのgenericsは型パラメータを使用して...",
    "consensus_score": 0.87,
    "providers_used": ["gemini-2.5-pro", "gpt-5"],
    "processingTimeMs": 8432
  },
  "processingTimeMs": 9666
}
```

---

## 8. Context7 API (ドキュメント検索)

**ベースパス:** `/api/v1/context7`

### 8.1 ライブラリドキュメント取得

```
GET /api/v1/context7/library?q={libraryName}&topic={topic}&tokens={tokens}
```

**クエリパラメータ:**
- `q` (必須): ライブラリ名 (例: `react`, `typescript`)
- `topic` (オプション): トピック (例: `hooks`, `generics`)
- `tokens` (オプション): 取得トークン数 (デフォルト: 5000)

**使用例:**
```bash
curl "http://localhost:8443/api/v1/context7/library?q=react&topic=hooks&tokens=3000"
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "libraryId": "/facebook/react",
    "libraryName": "react",
    "documentation": "React Hooksはバージョン16.8で導入され...",
    "codeExamples": [
      {
        "title": "useState Example",
        "code": "const [count, setCount] = useState(0);",
        "description": "状態管理の基本例"
      }
    ],
    "metadata": {
      "version": "18.2.0",
      "tokens": 2847,
      "cached": false
    }
  }
}
```

---

### 8.2 ドキュメント取得 (POST)

```
POST /api/v1/context7/docs
```

**リクエストボディ:**
```json
{
  "libraryId": "/facebook/react",
  "topic": "hooks",
  "tokens": 3000
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "libraryId": "/facebook/react",
    "documentation": "...",
    "codeExamples": [...]
  }
}
```

---

### 8.3 キャッシュライブラリ検索

```
GET /api/v1/context7/search?q={query}
```

**クエリパラメータ:**
- `q` (必須): 検索クエリ

**レスポンス:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "libraryId": "/facebook/react",
      "libraryName": "react",
      "lastAccessed": "2025-10-05T12:00:00.000Z"
    },
    {
      "libraryId": "/vercel/next.js",
      "libraryName": "next.js",
      "lastAccessed": "2025-10-04T15:30:00.000Z"
    }
  ]
}
```

---

### 8.4 キャッシュ統計

```
GET /api/v1/context7/stats
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "totalCached": 42,
    "cacheSize": 12345678,
    "hitRate": 0.87,
    "topLibraries": [
      {"library": "react", "hits": 234},
      {"library": "typescript", "hits": 187}
    ]
  }
}
```

---

### 8.5 キャッシュ無効化

```
DELETE /api/v1/context7/cache/:libraryName
```

**パスパラメータ:**
- `libraryName`: ライブラリ名

**レスポンス:**
```json
{
  "success": true,
  "message": "Cache invalidated for library: react"
}
```

---

### 8.6 ヘルスチェック

```
GET /api/v1/context7/health
```

**レスポンス:**
```json
{
  "success": true,
  "healthy": true,
  "service": "Context7 MCP",
  "status": "operational"
}
```

---

## 9. 監査ログ API

**ベースパス:** `/api/v1/audit`

### 9.1 監査ログ取得

```
GET /api/v1/audit/logs/:category?startDate={start}&endDate={end}
```

**パスパラメータ:**
- `category`: `action` | `session` | `change` | `security`

**クエリパラメータ:**
- `startDate` (必須): 開始日 (YYYY-MM-DD)
- `endDate` (オプション): 終了日 (YYYY-MM-DD)

**使用例:**
```bash
curl "http://localhost:8443/api/v1/audit/logs/security?startDate=2025-10-01&endDate=2025-10-05"
```

**レスポンス:**
```json
{
  "success": true,
  "category": "security",
  "startDate": "2025-10-01",
  "endDate": "2025-10-05",
  "count": 12,
  "logs": [
    {
      "timestamp": "2025-10-05T12:00:00.000Z",
      "action": "csrf_validation_failed",
      "user": "user123",
      "details": {
        "ip": "192.168.1.100",
        "path": "/api/v1/gmail/auth/callback"
      },
      "result": "failure",
      "severity": "high"
    }
  ]
}
```

---

### 9.2 日別統計

```
GET /api/v1/audit/stats/:date
```

**パスパラメータ:**
- `date`: 日付 (YYYY-MM-DD)

**レスポンス:**
```json
{
  "success": true,
  "stats": {
    "date": "2025-10-05",
    "categories": {
      "action": {
        "total": 1234,
        "success": 1200,
        "failure": 34
      },
      "session": {
        "total": 456,
        "success": 450,
        "failure": 6
      },
      "security": {
        "total": 12,
        "critical": 2,
        "high": 5,
        "medium": 3,
        "low": 2
      }
    }
  }
}
```

---

### 9.3 手動ログ記録

```
POST /api/v1/audit/log
```

**リクエストボディ:**
```json
{
  "action": "deployment_completed",
  "category": "action",
  "user": "ci-cd-bot",
  "details": {
    "environment": "production",
    "version": "1.2.3",
    "duration": 123
  },
  "result": "success"
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Audit log recorded"
}
```

---

### 9.4 セキュリティアラート取得

```
GET /api/v1/audit/security/alerts?startDate={start}&endDate={end}
```

**レスポンス:**
```json
{
  "success": true,
  "total": 12,
  "criticalCount": 2,
  "alerts": [
    {
      "timestamp": "2025-10-05T12:00:00.000Z",
      "action": "unauthorized_access_attempt",
      "details": {
        "ip": "203.0.113.45",
        "path": "/api/v1/admin",
        "severity": "critical"
      }
    }
  ]
}
```

---

## 10. ヘルスチェック

### 10.1 LLM ヘルスチェック

```
GET /api/v1/llm-health
```

**説明:** 全LLMプロバイダのヘルスチェック

**レスポンス:**
```json
{
  "timestamp": "2025-10-05T12:00:00.000Z",
  "overall_status": "healthy",
  "services": {
    "gemini": {
      "name": "Gemini 2.5 Pro",
      "status": "healthy",
      "latency_ms": 1234,
      "last_check": "2025-10-05T12:00:00.000Z",
      "method": "CLI"
    },
    "gpt5": {
      "name": "GPT-5 (Codex)",
      "status": "healthy",
      "latency_ms": 2345,
      "last_check": "2025-10-05T12:00:00.000Z",
      "method": "MCP",
      "mcp_server": "codex mcp-server",
      "mcp_status": "running"
    },
    "claude": {
      "name": "Claude Sonnet 4",
      "status": "healthy",
      "latency_ms": 0,
      "last_check": "2025-10-05T12:00:00.000Z",
      "method": "SDK"
    },
    "qwen3": {
      "name": "Qwen3-Coder",
      "status": "healthy",
      "latency_ms": 3456,
      "last_check": "2025-10-05T12:00:00.000Z",
      "method": "OpenRouter API",
      "api_endpoint": "https://openrouter.ai/api/v1"
    }
  }
}
```

**ステータス:**
- `healthy`: 正常稼働
- `degraded`: 一部エラー
- `error`: 利用不可
- `unknown`: 確認中

---

### 10.2 MCP ヘルスチェック

```
GET /api/v1/mcp-health
```

**説明:** 全MCPサーバーのヘルスチェック

**レスポンス:**
```json
{
  "timestamp": "2025-10-05T12:00:00.000Z",
  "overall_status": "healthy",
  "mcp_servers": {
    "cipher": {
      "name": "Cipher MCP",
      "type": "stdio",
      "status": "healthy",
      "lock_file": "/tmp/mcp-cipher.lock",
      "process_status": "running",
      "pid": 12345
    },
    "serena": {
      "name": "Serena MCP",
      "type": "stdio",
      "status": "healthy",
      "lock_file": "/tmp/mcp-serena.lock",
      "process_status": "running",
      "pid": 23456
    },
    "context7": {
      "name": "Context7 MCP",
      "type": "http",
      "status": "healthy",
      "endpoint": "https://mcp.context7.com/mcp",
      "latency_ms": 234
    },
    "codex": {
      "name": "Codex MCP",
      "type": "stdio",
      "status": "healthy",
      "process_status": "configured",
      "pid": null
    }
  }
}
```

---

## エンドポイントサマリー

### エンドポイント数

| カテゴリ | エンドポイント数 |
|---------|----------------|
| システム | 3 |
| Wall-Bounce | 5 |
| Codex | 2 |
| IT統合支援 | 2 |
| Gmail | 8 |
| HuggingFace | 13 |
| RAG | 3 |
| Context7 | 6 |
| 監査ログ | 4 |
| ヘルスチェック | 2 |
| **合計** | **48** |

---

## 主要機能マトリックス

| 機能 | エンドポイント | 主要プロバイダ | Wall-Bounce対応 |
|-----|---------------|---------------|----------------|
| マルチLLM分析 | `/api/v1/wall-bounce/analyze` | Gemini, GPT-5, Claude, Qwen3 | ✅ |
| ログ解析 | `/api/v1/it-unified` | Gemini, GPT-5, Claude | ✅ |
| コーディング支援 | `/api/v1/codex/session` | GPT-5 Codex | ✅ (2回目以降) |
| メール送信 | `/api/v1/gmail/send` | Gmail API | ❌ |
| RAG検索 | `/api/v1/rag/query` | OpenAI Vector Store | ✅ (オプション) |
| ドキュメント検索 | `/api/v1/context7/library` | Context7 MCP | ❌ |
| エンベディング | `/embeddings` | HuggingFace | ❌ |

---

## セキュリティ機能

| 機能 | 実装状況 |
|-----|---------|
| CSRF保護 (Gmail OAuth) | ✅ Redis + state parameter |
| 入力バリデーション (Gmail) | ✅ Zod schema validation |
| レート制限 (HuggingFace) | ✅ 60 req/min |
| データサニタイゼーション | ✅ IT統合支援 |
| 監査ログ | ✅ 全エンドポイント |
| Helmet (CSP) | ✅ 全エンドポイント |
| CORS | ✅ 開発/本番分離 |

---

## パフォーマンス指標

| エンドポイント | 平均レスポンス時間 | タイムアウト |
|---------------|-------------------|------------|
| Wall-Bounce (parallel) | 8-12秒 | 300秒 |
| Wall-Bounce (sequential) | 15-25秒 | 300秒 |
| Codex セッション | 10-20秒 | 60秒 |
| IT統合支援 (ログ解析) | 3-5秒 | 120秒 |
| Gmail送信 | 1-2秒 | 30秒 |
| HuggingFace エンベディング | 0.2-0.5秒 | 10秒 |
| RAG クエリ | 1-3秒 | 30秒 |
| Context7 検索 | 0.5-1秒 | 10秒 |

---

## コスト見積もり (1,000リクエスト)

| エンドポイント | 推定コスト |
|---------------|-----------|
| Wall-Bounce (3モデル) | $2.00 - $6.00 |
| Codex セッション | $1.00 - $2.50 |
| IT統合支援 (basic) | $0.10 - $0.50 |
| IT統合支援 (premium) | $0.50 - $1.50 |
| IT統合支援 (critical) | $1.50 - $5.00 |
| Gmail送信 | $0.00 (無料) |
| HuggingFace | $0.05 - $0.20 |
| RAG クエリ | $0.10 - $0.30 |
| Context7 | $0.00 (キャッシュ効果) |

---

## 環境変数

必須環境変数一覧:

```bash
# Core
HUGGINGFACE_API_KEY=hf_xxx
OPENROUTER_API_KEY=sk-or-xxx
PORT=8443
NODE_ENV=production

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=xxx

# Gmail (Optional)
GMAIL_CLIENT_ID=xxx
GMAIL_CLIENT_SECRET=xxx
GMAIL_REDIRECT_URI=https://techsapo.com/api/v1/gmail/auth/callback

# Google Drive RAG (Optional)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REFRESH_TOKEN=xxx

# OpenAI (Optional - for RAG)
OPENAI_API_KEY=sk-xxx
OPENAI_ORGANIZATION=org-xxx

# Context7 (Optional)
CONTEXT7_API_KEY=ctx7sk-xxx
CONTEXT7_CACHE_TTL=86400

# AWS Secrets Manager (Optional)
AWS_SECRET_NAME=techsapo/production
AWS_REGION=us-east-1
USE_AWS_SECRETS_MANAGER=false
```

---

## サポート情報

- **ドキュメント:** `/docs` ディレクトリ
- **Health Check:** `http://localhost:8443/health`
- **API Docs:** `http://localhost:8443/api/docs`
- **Issue Tracker:** GitHub Issues
- **Contact:** support@techsapo.com

---

**ドキュメントバージョン:** 1.0.0
**最終更新日:** 2025-10-05
**メンテナンス:** TechSapo Development Team
