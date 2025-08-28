# 🔗 MCP API Documentation

## 📋 Overview

TechSapo MCP Services APIドキュメント - Model Context Protocol v2025-03-26準拠の統一APIインターフェース

## 🌐 Base Configuration

### Endpoint
- **Base URL**: `http://localhost:3000/mcp`
- **Protocol**: JSON-RPC 2.0
- **Content-Type**: `application/json`

### Standard Request Format
```json
{
  "jsonrpc": "2.0",
  "id": <unique_request_id>,
  "method": "tools/call",
  "params": {
    "name": "<tool_name>",
    "arguments": {
      // tool-specific parameters
    }
  }
}
```

### Standard Response Format
```json
{
  "jsonrpc": "2.0",
  "id": <request_id>,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "<response_content>"
      }
    ]
  }
}
```

## 🏓 Wall-Bounce MCP API

### wall-bounce-analyze
複数LLM協調分析を実行

**Parameters:**
- `query` (string, required): 分析対象クエリ
- `context` (object, optional): 追加コンテキスト情報
- `priority` (string, optional): 優先度 (`standard`, `high`, `critical`)

**Example:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "wall-bounce-analyze",
      "arguments": {
        "query": "Kubernetes pod scheduling issues",
        "context": {
          "useContext7": true,
          "includeStashContext": true
        },
        "priority": "high"
      }
    }
  }'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "🏓 Wall-Bounce Analysis Complete\n\n[Synthesized multi-LLM analysis]\n\n📊 ANALYSIS METADATA:\n- Quality Score: 0.847\n- Model Consensus: 0.732\n- Execution Time: 2847ms\n- Recommended Action: ACCEPT\n- Models Consulted: 4"
    }]
  }
}
```

### wall-bounce-status
システム状態とパフォーマンス確認

**Parameters:** None

**Example:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "wall-bounce-status",
      "arguments": {}
    }
  }'
```

### wall-bounce-config
システム設定パラメーター調整

**Parameters:**
- `maxConcurrent` (number, optional): 最大並列クエリ数 (1-10)
- `confidenceThreshold` (number, optional): 最小信頼度閾値 (0.0-1.0)
- `consensusThreshold` (number, optional): 最小コンセンサス閾値 (0.0-1.0)

## 🔐 Vault MCP API

### vault-set-secret
暗号化環境変数設定

**Parameters:**
- `key` (string, required): 環境変数キー名
- `value` (string, required): 暗号化する値
- `environment` (string, required): 環境名 (`development`, `staging`, `production`)
- `ttl` (number, optional): 有効期限（秒）

**Example:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "vault-set-secret",
      "arguments": {
        "key": "DATABASE_URL",
        "value": "postgresql://user:password@host:5432/database",
        "environment": "production",
        "ttl": 86400
      }
    }
  }'
```

### vault-get-secret
暗号化環境変数取得

**Parameters:**
- `key` (string, required): 環境変数キー名
- `environment` (string, required): 環境名

**Example:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "vault-get-secret",
      "arguments": {
        "key": "DATABASE_URL",
        "environment": "production"
      }
    }
  }'
```

### vault-rotate-key
暗号鍵ローテーション実行

**Parameters:**
- `keyType` (string, optional): 鍵タイプ (`master`, `environment`)

### vault-audit-log
監査ログ確認

**Parameters:**
- `startDate` (string, optional): 開始日時 (ISO 8601)
- `endDate` (string, optional): 終了日時 (ISO 8601)
- `user` (string, optional): ユーザーフィルター

### vault-health-check
Vaultシステム健全性確認

**Parameters:** None

## 🗃️ Stash MCP API

### stash-index-project
プロジェクトセマンティックインデックス作成

**Parameters:**
- `projectPath` (string, optional): プロジェクトパス（デフォルト: 現在のディレクトリ）
- `language` (string, optional): 対象言語フィルター
- `includePatterns` (array, optional): インクルードパターン
- `excludePatterns` (array, optional): エクスクルードパターン

**Example:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "stash-index-project",
      "arguments": {
        "projectPath": "/path/to/project",
        "language": "typescript",
        "includePatterns": ["**/*.ts", "**/*.tsx"],
        "excludePatterns": ["node_modules/**", "dist/**"]
      }
    }
  }'
```

### stash-search-code
セマンティックコード検索

**Parameters:**
- `query` (string, required): 検索クエリ
- `language` (string, optional): 言語フィルター
- `maxResults` (number, optional): 最大結果数（デフォルト: 10）

### stash-build-context
コードコンテキストバンドル構築

**Parameters:**
- `targetFile` (string, required): 対象ファイルパス
- `contextDepth` (number, optional): コンテキスト深度（デフォルト: 3）

### stash-update-index
インクリメンタルインデックス更新

**Parameters:**
- `changedFiles` (array, optional): 変更ファイル一覧

## 🚀 OpenRouter MCP API

### openrouter-generate
マルチモデル生成

**Parameters:**
- `model` (string, required): モデル名
- `prompt` (string, required): 生成プロンプト
- `maxTokens` (number, optional): 最大トークン数
- `temperature` (number, optional): 温度パラメータ
- `tier` (string, optional): モデル階層 (`premium`, `standard`, `fallback`)

**Example:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "openrouter-generate",
      "arguments": {
        "model": "anthropic/claude-3-haiku",
        "prompt": "Explain Docker container networking",
        "maxTokens": 1500,
        "temperature": 0.7,
        "tier": "standard"
      }
    }
  }'
```

### openrouter-list-models
利用可能モデル一覧取得

**Parameters:**
- `tier` (string, optional): 階層フィルター
- `provider` (string, optional): プロバイダーフィルター

### openrouter-cost-analysis
コスト分析

**Parameters:**
- `timeRange` (string, optional): 時間範囲 (`1h`, `24h`, `7d`, `30d`)
- `model` (string, optional): モデルフィルター

### openrouter-health-check
OpenRouter接続状態確認

**Parameters:** None

## 📚 Context7 MCP API

### context7-resolve-library
ライブラリ名からContext7 ID解決

**Parameters:**
- `libraryName` (string, required): ライブラリ名

**Example:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "tools/call",
    "params": {
      "name": "context7-resolve-library",
      "arguments": {
        "libraryName": "react"
      }
    }
  }'
```

### context7-get-docs
ライブラリドキュメント取得

**Parameters:**
- `libraryId` (string, required): Context7ライブラリID
- `topic` (string, optional): 特定トピック
- `version` (string, optional): バージョン指定
- `maxTokens` (number, optional): 最大トークン数

**Example:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 8,
    "method": "tools/call",
    "params": {
      "name": "context7-get-docs",
      "arguments": {
        "libraryId": "/facebook/react",
        "topic": "hooks",
        "maxTokens": 3000
      }
    }
  }'
```

### context7-search-examples
コード例検索

**Parameters:**
- `libraryId` (string, required): Context7ライブラリID
- `searchQuery` (string, required): 検索クエリ
- `maxResults` (number, optional): 最大結果数

### context7-status
Context7サービス状態確認

**Parameters:** None

## 🔒 Cipher MCP API

### cipher-encrypt
高度暗号化

**Parameters:**
- `data` (string, required): 暗号化データ
- `algorithm` (string, optional): 暗号化アルゴリズム (`AES-256-GCM`, `ChaCha20-Poly1305`)
- `keyDerivation` (string, optional): 鍵導出方法 (`PBKDF2`, `Argon2`)

**Example:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 9,
    "method": "tools/call",
    "params": {
      "name": "cipher-encrypt",
      "arguments": {
        "data": "sensitive information",
        "algorithm": "AES-256-GCM",
        "keyDerivation": "Argon2"
      }
    }
  }'
```

### cipher-decrypt
復号化

**Parameters:**
- `encryptedData` (string, required): 暗号化データ
- `key` (string, required): 復号鍵

### cipher-sign
デジタル署名

**Parameters:**
- `data` (string, required): 署名対象データ
- `algorithm` (string, optional): 署名アルゴリズム (`ECDSA`, `EdDSA`)

### cipher-verify
署名検証

**Parameters:**
- `data` (string, required): 原データ
- `signature` (string, required): デジタル署名
- `publicKey` (string, required): 公開鍵

### cipher-generate-keys
鍵ペア生成

**Parameters:**
- `algorithm` (string, required): 鍵アルゴリズム (`RSA-4096`, `ECDSA-P384`, `Ed25519`)

## 📊 Monitoring MCP API

### monitoring-system-status
全体システム状態確認

**Parameters:** None

**Example:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 10,
    "method": "tools/call",
    "params": {
      "name": "monitoring-system-status",
      "arguments": {}
    }
  }'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "result": {
    "content": [{
      "type": "text",
      "text": "🔍 System Status: ✅ OPERATIONAL\n\nSERVICE HEALTH:\n- Wall-Bounce MCP: ✅ Healthy (avg quality: 0.84)\n- Vault MCP: ✅ Healthy (encryption ops: 142/min)\n- Context7 MCP: ✅ Healthy (cache hit: 87%)\n- OpenRouter MCP: ✅ Healthy (200+ models available)\n- Cipher MCP: ✅ Healthy (HSM: connected)\n- Stash MCP: ✅ Healthy (indexed: 1,247 files)"
    }]
  }
}
```

### monitoring-service-health
個別サービス健全性確認

**Parameters:**
- `serviceName` (string, required): サービス名

### monitoring-metrics-query
Prometheusメトリクス照会

**Parameters:**
- `query` (string, required): PromQL クエリ
- `timeRange` (string, optional): 時間範囲

### monitoring-alert-status
アクティブアラート状況

**Parameters:**
- `severity` (string, optional): 重要度フィルター (`critical`, `warning`, `info`)

## 🔧 Error Handling

### Standard Error Response
```json
{
  "jsonrpc": "2.0",
  "id": <request_id>,
  "error": {
    "code": <error_code>,
    "message": "<error_message>",
    "data": {
      "details": "<additional_details>",
      "timestamp": "<iso_timestamp>",
      "service": "<mcp_service_name>"
    }
  }
}
```

### Common Error Codes
- `-32700`: Parse Error (Invalid JSON)
- `-32600`: Invalid Request (Invalid JSON-RPC)
- `-32601`: Method Not Found (Unknown tool)
- `-32602`: Invalid Params (Invalid arguments)
- `-32603`: Internal Error (Server error)
- `-32000`: Authentication Failed
- `-32001`: Permission Denied
- `-32002`: Service Unavailable
- `-32003`: Rate Limited

## 📈 Rate Limiting

### Standard Limits
- **Wall-Bounce**: 60 requests/minute per client
- **Vault**: 100 requests/minute per client
- **Context7**: 120 requests/minute per client
- **OpenRouter**: Model-dependent limits
- **Monitoring**: 200 requests/minute per client

### Rate Limit Headers
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995200
```

## 🔐 Authentication

### JWT Token Format
```json
{
  "iat": 1640995200,
  "exp": 1640998800,
  "sub": "user_123",
  "roles": ["admin", "developer"],
  "services": ["wall-bounce", "vault", "context7"]
}
```

### Authorization Header
```http
Authorization: Bearer <jwt_token>
```

---

**🔗 MCP API v1.0 - Production Ready**
*Model Context Protocol v2025-03-26 compliant unified API*