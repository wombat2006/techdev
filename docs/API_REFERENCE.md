# 🔌 API Reference

Google Drive RAG システムのREST API仕様

## 📋 目次
- [認証](#authentication)
- [エラーハンドリング](#error-handling)
- [レート制限](#rate-limiting)
- [エンドポイント](#endpoints)
  - [壁打ち分析](#wall-bounce-analysis)
  - [ログ解析](#log-analysis)
  - [RAG検索](#rag-search)
  - [ファイル管理](#file-management)
  - [システム情報](#system-info)

## 🔐 認証 {#authentication}

### APIキー認証
全てのAPIリクエストは以下のヘッダーが必要：

```bash
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

### 環境変数設定
```bash
export OPENAI_API_KEY="sk-..."
export GOOGLE_CLIENT_ID="your_client_id"
export GOOGLE_CLIENT_SECRET="your_client_secret"
```

## ❌ エラーハンドリング {#error-handling}

### ステータスコード
- `200` - 成功
- `400` - 不正なリクエスト
- `401` - 認証エラー
- `403` - 権限不足
- `429` - レート制限超過
- `500` - サーバーエラー

### エラーレスポンス形式
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "リクエストパラメータが不正です",
    "details": {
      "field": "query",
      "issue": "必須パラメータが不足"
    }
  }
}
```

## 🚦 レート制限 {#rate-limiting}

- **基本プラン**: 100リクエスト/分
- **プレミアム**: 1000リクエスト/分
- **クリティカル**: 5000リクエスト/分

レスポンスヘッダー：
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```

## 🔗 エンドポイント {#endpoints}

### 🏓 壁打ち分析 {#wall-bounce-analysis}

複数LLMによる協調分析で高品質回答を生成

#### `POST /api/v1/generate`

**リクエスト:**
```json
{
  "prompt": "Dockerコンテナが起動しない問題を解決したい",
  "task_type": "basic|premium|critical",
  "user_id": "engineer-001",
  "models": ["gpt-4", "claude-3", "gemini-pro"],
  "temperature": 0.7,
  "max_tokens": 2000,
  "wall_bounce_config": {
    "consensus_strategy": "weighted_voting",
    "min_confidence": 0.7,
    "parallel_execution": true
  }
}
```

**レスポンス:**
```json
{
  "success": true,
  "result": {
    "answer": "Docker コンテナ起動の問題解決手順...",
    "confidence": 0.95,
    "consensus": {
      "strategy": "weighted_voting",
      "models_used": ["gpt-4", "claude-3", "gemini-pro"],
      "individual_scores": {
        "gpt-4": 0.92,
        "claude-3": 0.96,
        "gemini-pro": 0.97
      }
    },
    "metadata": {
      "total_tokens": 1843,
      "processing_time_ms": 2341,
      "cost_usd": 0.0234
    }
  }
}
```

### 📊 ログ解析 {#log-analysis}

システムログとエラー出力を自動解析

#### `POST /api/v1/analyze-logs`

**リクエスト:**
```json
{
  "user_command": "systemctl start mysql",
  "error_output": "Job for mysql.service failed. Connection refused on port 3306",
  "system_context": "Ubuntu 20.04, MySQL 8.0",
  "log_level": "ERROR",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**レスポンス:**
```json
{
  "success": true,
  "analysis": {
    "problem_category": "service_startup_failure",
    "severity": "high",
    "root_cause": "MySQL サービス起動失敗 - ポート3306での接続拒否",
    "solution_steps": [
      "MySQL サービス状態確認: sudo systemctl status mysql",
      "ポート使用状況確認: sudo netstat -tlnp | grep 3306",
      "MySQL 設定ファイル確認: sudo cat /etc/mysql/mysql.conf.d/mysqld.cnf",
      "MySQL ログ確認: sudo tail -f /var/log/mysql/error.log"
    ],
    "confidence": 0.89,
    "estimated_resolution_time": "15-30分"
  }
}
```

### 🔍 RAG検索 {#rag-search}

Google Drive統合による文書検索と回答生成

#### `POST /api/v1/rag/search`

**リクエスト:**
```json
{
  "query": "過去のサーバー移行手順書を検索",
  "user_drive_folder_id": "1BxYz...",
  "top_k": 5,
  "include_metadata": true,
  "file_types": ["pdf", "docx", "txt"],
  "date_range": {
    "start": "2023-01-01",
    "end": "2024-01-01"
  }
}
```

**レスポンス:**
```json
{
  "success": true,
  "results": [
    {
      "document": {
        "id": "doc_001",
        "title": "AWS EC2サーバー移行手順書_v2.3.pdf",
        "content": "サーバー移行の詳細手順...",
        "file_type": "pdf",
        "similarity_score": 0.94
      },
      "metadata": {
        "created_date": "2023-06-15T09:00:00Z",
        "size_bytes": 524288,
        "page_count": 12
      }
    }
  ],
  "answer": "AWS EC2サーバー移行には以下の手順が推奨されます...",
  "total_documents": 847,
  "search_time_ms": 234
}
```

### 📁 ファイル管理 {#file-management}

#### `GET /api/v1/files/formats`

サポートされているファイル形式一覧を取得

**レスポンス:**
```json
{
  "success": true,
  "supported_formats": {
    "office_documents": [
      {
        "extension": ".pdf",
        "mime_type": "application/pdf",
        "encoding": "base64",
        "magic_numbers": ["25", "50", "44", "46"]
      },
      {
        "extension": ".docx",
        "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "encoding": "binary",
        "magic_numbers": ["50", "4B", "03", "04"]
      }
    ],
    "programming_files": [
      {
        "extension": ".py",
        "mime_type": "text/x-python",
        "encoding": "utf8",
        "detection_patterns": ["def ", "import ", "if __name__"]
      }
    ]
  },
  "total_formats": 42,
  "categories": {
    "office_documents": 15,
    "archives": 8,
    "media": 6,
    "programming": 10,
    "security": 3
  }
}
```

#### `POST /api/v1/files/detect`

ファイル形式検出API

**リクエスト:**
```json
{
  "file_data": "base64_encoded_file_content",
  "filename": "document.pdf",
  "enable_security_scan": true
}
```

**レスポンス:**
```json
{
  "success": true,
  "detection_result": {
    "extension": ".pdf",
    "mime_type": "application/pdf",
    "encoding": "base64",
    "is_supported": true,
    "confidence": 0.99,
    "security_scan": {
      "is_safe": true,
      "threats_detected": [],
      "file_integrity": "verified"
    }
  }
}
```

#### `POST /api/v1/vector-store/add`

Vector Storeにドキュメント追加

**リクエスト:**
```json
{
  "vector_store_id": "vs_abc123...",
  "document": {
    "id": "doc_001",
    "name": "technical_spec.pdf",
    "content": "技術仕様書の内容...",
    "metadata": {
      "created_date": "2024-01-15T10:30:00Z",
      "file_type": "pdf",
      "size": 1024000
    }
  }
}
```

**レスポンス:**
```json
{
  "success": true,
  "file_id": "file_xyz789",
  "message": "ドキュメントが正常に追加されました",
  "processing_time_ms": 3421
}
```

### ℹ️ システム情報 {#system-info}

#### `GET /api/v1/health`

システムヘルスチェック

**レスポンス:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "vector_store": "healthy",
    "llm_providers": {
      "openai": "healthy",
      "anthropic": "healthy",
      "google": "healthy"
    }
  },
  "metrics": {
    "uptime_seconds": 86400,
    "total_requests": 15420,
    "avg_response_time_ms": 234,
    "success_rate": 0.997
  }
}
```

#### `GET /api/v1/metrics`

Prometheusメトリクス（Prometheus形式）

**レスポンス:**
```
# HELP techsapo_wallbounce_success_rate 壁打ち分析成功率
# TYPE techsapo_wallbounce_success_rate gauge
techsapo_wallbounce_success_rate 0.997

# HELP techsapo_http_requests_total HTTP リクエスト総数
# TYPE techsapo_http_requests_total counter
techsapo_http_requests_total{method="POST",endpoint="/api/v1/generate"} 1542

# HELP techsapo_llm_response_time_seconds LLM応答時間
# TYPE techsapo_llm_response_time_seconds histogram
techsapo_llm_response_time_seconds_bucket{provider="openai",le="0.5"} 834
techsapo_llm_response_time_seconds_bucket{provider="openai",le="1.0"} 1241
```

## 📚 使用例

### JavaScript/TypeScript
```typescript
const client = new TechSapoClient({
  apiKey: process.env.TECHSAPO_API_KEY,
  baseUrl: 'http://localhost:4000/api/v1'
});

// 壁打ち分析実行
const result = await client.generate({
  prompt: "Docker Swarmクラスタの負荷分散設定方法",
  taskType: "premium",
  models: ["gpt-4", "claude-3"]
});

console.log(result.answer);
```

### Python
```python
import requests

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

response = requests.post(
    'http://localhost:4000/api/v1/generate',
    headers=headers,
    json={
        'prompt': 'Kubernetesのネットワーク問題をデバッグしたい',
        'task_type': 'basic'
    }
)

data = response.json()
print(data['result']['answer'])
```

### cURL
```bash
curl -X POST http://localhost:4000/api/v1/rag/search \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "システム監視のベストプラクティス",
    "user_drive_folder_id": "1FWaeY0DRv_fb4fA8RrKk0WbIk-TMK3qb",
    "top_k": 3
  }'
```

## 🔧 SDK と統合

### 公式SDK
- **Node.js**: `npm install @techsapo/client`
- **Python**: `pip install techsapo-client`
- **Go**: `go get github.com/techsapo/go-client`

### Webhook統合
システムイベントの通知にWebhookを使用可能

```json
{
  "event_type": "analysis_completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "request_id": "req_123",
    "success": true,
    "confidence": 0.95
  }
}
```

---

**📖 関連ドキュメント**
- [テストガイド](./TESTING_GUIDE.md)
- [デプロイメントガイド](./DEPLOYMENT_GUIDE.md)
- [アーキテクチャ概要](./ARCHITECTURE_OVERVIEW.md)