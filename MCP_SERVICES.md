# 🔗 MCP Services Comprehensive Documentation

## 📋 Overview

TechSapoプラットフォームは7つの専門MCPサーバーによる統合アーキテクチャを採用し、Model Context Protocol v2025-03-26準拠の標準化された通信で高品質なAI支援サービスを提供します。

## 🏓 Wall-Bounce MCP Server

### Purpose
複数LLMによる協調分析を統合管理し、品質スコア・コンセンサス評価による高品質回答生成を実現。

### Core Features
- **Parallel LLM Query**: 最大4つのLLMに同時クエリ送信
- **Quality Assessment**: 信頼度・コンセンサススコア算出
- **Response Synthesis**: 複数回答の統合・品質評価
- **Automatic Escalation**: 品質不足時の上位Tier自動昇格

### Tools
- `wall-bounce-analyze`: メイン分析ツール
- `wall-bounce-status`: システム状態確認
- `wall-bounce-config`: パラメーター設定調整

### Configuration
```typescript
interface WallBounceConfig {
  models: {
    primary: string[];     // ['gemini-2.5-flash', 'claude-3-haiku', 'cursor-mcp']
    fallback: string[];    // ['claude-3-sonnet-20241022', 'gpt-4o-mini', 'openrouter-mcp']
  };
  qualityThresholds: {
    confidence: number;    // 0.7 (minimum confidence score)
    consensus: number;     // 0.6 (minimum consensus score)
  };
  parallelism: {
    maxConcurrent: number; // 4 (max parallel queries)
    timeout: number;       // 30000ms
  };
}
```

### Usage Example
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
        "query": "Kubernetes pod crash analysis",
        "context": {"priority": "high"},
        "priority": "critical"
      }
    }
  }'
```

## 🔐 Vault MCP Server

### Purpose
環境変数・秘密情報のAES-256-GCM暗号化管理、JWT認証、Redis+File hybrid storage実現。

### Security Features
- **AES-256-GCM Encryption**: 最高水準暗号化
- **JWT Authentication**: ロールベースアクセス制御
- **Auto Key Rotation**: 90日サイクル自動鍵更新
- **Audit Logging**: 全アクセスパターン監査
- **Redis+File Hybrid**: 高可用性ストレージ

### Tools
- `vault-set-secret`: 暗号化秘密情報設定
- `vault-get-secret`: 暗号化秘密情報取得
- `vault-rotate-key`: 暗号鍵ローテーション
- `vault-audit-log`: 監査ログ確認
- `vault-health-check`: システム健全性確認

### Storage Architecture
```
├── File Storage (Primary)
│   ├── secrets.encrypted       # AES-256-GCM encrypted secrets
│   ├── keys.encrypted         # Encrypted key material  
│   └── audit.log              # Access audit trail
└── Redis Cache (Secondary)
    ├── active_sessions        # JWT session cache
    ├── key_rotation_schedule  # Rotation timeline
    └── health_metrics         # Performance metrics
```

### Usage Example
```bash
# Set encrypted secret
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "vault-set-secret",
      "arguments": {
        "key": "PRODUCTION_DATABASE_URL",
        "value": "postgresql://user:secret@prod:5432/app",
        "environment": "production",
        "ttl": 86400
      }
    }
  }'
```

## 🗃️ Stash MCP Server

### Purpose
セマンティックコード検索、プロジェクトコンテキスト管理、開発リファレンス情報統合専用サービス。

### Features
- **Semantic Code Indexing**: プロジェクトファイル意味解析インデックス
- **Context Bundle Building**: 関連コード文脈自動構築
- **Multi-Language Support**: TypeScript, Python, JavaScript, Rust対応
- **Incremental Updates**: 差分更新による高速同期

### Tools
- `stash-index-project`: プロジェクトインデックス作成
- `stash-search-code`: セマンティックコード検索
- `stash-build-context`: コンテキストバンドル生成
- `stash-update-index`: インクリメンタル更新

### Index Structure
```typescript
interface StashIndex {
  project: {
    path: string;
    language: string;
    lastModified: number;
  };
  files: {
    path: string;
    content: string;
    semanticHash: string;
    dependencies: string[];
    exports: string[];
  }[];
  searchIndex: {
    terms: Map<string, string[]>;
    contexts: Map<string, CodeContext>;
  };
}
```

## 🚀 OpenRouter MCP Server

### Purpose
200+のAIモデル統合、コスト最適化、tier-based model selection実現のAPIゲートウェイ。

### Model Tiers
- **Premium Tier**: GPT-4o, Claude Sonnet, Gemini Ultra
- **Standard Tier**: GPT-3.5-turbo, Claude Haiku, Gemini Pro
- **Fallback Tier**: Llama 3, Mixtral, Qwen 2

### Features
- **200+ Models**: 主要プロバイダー統合
- **Cost Tracking**: リアルタイムコスト監視
- **Auto Fallback**: 障害時自動代替モデル選択
- **Rate Limiting**: プロバイダー毎レート制限管理

### Tools
- `openrouter-generate`: マルチモデル生成
- `openrouter-list-models`: 利用可能モデル一覧
- `openrouter-cost-analysis`: コスト分析
- `openrouter-health-check`: 接続状態確認

### Usage Example
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "openrouter-generate",
      "arguments": {
        "model": "anthropic/claude-3-haiku",
        "prompt": "Explain Docker networking concepts",
        "maxTokens": 1000,
        "tier": "standard"
      }
    }
  }'
```

## 📚 Context7 MCP Server

### Purpose
リアルタイムライブラリドキュメント統合、コーディング・ドキュメント参照時の必須リファレンスサービス。

### Core Capabilities
- **Live Documentation**: 最新ライブラリドキュメント取得
- **Library Resolution**: パッケージ名からContext7 ID解決
- **Code Examples**: 実用コードスニペット検索
- **Version Management**: 特定バージョン対応

### Tools
- `context7-resolve-library`: ライブラリID解決
- `context7-get-docs`: ドキュメント取得
- `context7-search-examples`: コード例検索
- `context7-status`: サービス状態確認

### Integration Flow
```mermaid
graph TD
    A[User Query] --> B[Library Name Resolution]
    B --> C[Context7 Library ID]
    C --> D[Documentation Fetch]
    D --> E[Code Examples Search]
    E --> F[Formatted Response]
```

### Usage Example
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "context7-get-docs",
      "arguments": {
        "libraryId": "/microsoft/typescript",
        "topic": "generics",
        "maxTokens": 3000,
        "includeExamples": true
      }
    }
  }'
```

## 🔒 Cipher MCP Server

### Purpose
高度暗号化処理、デジタル署名、PKI管理などセキュリティ専門機能提供。

### Security Functions
- **Advanced Encryption**: RSA, ECC, Post-Quantum cryptography
- **Digital Signatures**: ECDSA, EdDSA署名・検証
- **Key Management**: HSM統合、鍵ライフサイクル管理
- **Certificate Authority**: 内部CA機能

### Tools
- `cipher-encrypt`: 高度暗号化
- `cipher-decrypt`: 復号化
- `cipher-sign`: デジタル署名
- `cipher-verify`: 署名検証
- `cipher-generate-keys`: 鍵ペア生成

### Cryptographic Standards
- **Symmetric**: AES-256-GCM, ChaCha20-Poly1305
- **Asymmetric**: RSA-4096, ECDSA P-384, Ed25519
- **Hash**: SHA-3, BLAKE3
- **Post-Quantum**: Kyber, Dilithium (experimental)

## 📊 Monitoring MCP Server

### Purpose
全MCPサービス統合監視、メトリクス収集、アラート管理の中央制御システム。

### Monitoring Scope
- **MCP Service Health**: 全サービス稼働状況
- **Wall-Bounce Quality**: 品質スコア・コンセンサス追跡
- **Vault Security**: 暗号化操作・認証監視
- **Performance Metrics**: 応答時間・スループット

### Tools
- `monitoring-system-status`: 全体システム状態
- `monitoring-service-health`: 個別サービス健全性
- `monitoring-metrics-query`: Prometheusメトリクス照会
- `monitoring-alert-status`: アクティブアラート状況

### Metrics Categories
```typescript
interface MCPMetrics {
  system: {
    uptime: number;
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
  };
  services: {
    [serviceName: string]: {
      status: 'healthy' | 'degraded' | 'down';
      responseTime: number;
      errorRate: number;
      requestCount: number;
    };
  };
  business: {
    wallBounceQuality: number;
    vaultOperations: number;
    dailyCost: number;
  };
}
```

## 🔧 MCP Configuration

### Global MCP Settings
```json
{
  "mcpServers": {
    "wall-bounce-orchestrator": {
      "command": "npx",
      "args": ["-y", "ts-node", "src/mcp/wall-bounce-mcp-server.ts"],
      "env": {
        "ORCHESTRATOR_MODE": "enhanced",
        "MAX_PARALLEL_QUERIES": "4",
        "MCP_LOG_LEVEL": "info"
      }
    },
    "vault-management": {
      "command": "npx", 
      "args": ["-y", "ts-node", "src/mcp/vault-mcp-server.ts"],
      "env": {
        "VAULT_ENCRYPTION_KEY": "base64_encoded_key",
        "REDIS_URL": "redis://localhost:6379"
      }
    },
    "stash-indexing": {
      "command": "npx",
      "args": ["-y", "ts-node", "src/mcp/stash-mcp-server.ts"],
      "env": {
        "STASH_INDEX_PATH": "./stash-index",
        "SUPPORTED_LANGUAGES": "typescript,python,javascript,rust"
      }
    },
    "openrouter-gateway": {
      "command": "npx",
      "args": ["-y", "ts-node", "src/mcp/openrouter-mcp-server.ts"],
      "env": {
        "OPENROUTER_API_KEY": "sk-or-...",
        "COST_TRACKING": "enabled"
      }
    },
    "context7-integration": {
      "command": "npx",
      "args": ["-y", "ts-node", "src/mcp/context7-mcp-server.ts"],
      "env": {
        "CONTEXT7_API_BASE": "https://api.context7.io",
        "CACHE_TTL": "3600"
      }
    },
    "cipher-security": {
      "command": "npx",
      "args": ["-y", "ts-node", "src/mcp/cipher-mcp-server.ts"],
      "env": {
        "HSM_ENABLED": "false",
        "POST_QUANTUM": "experimental"
      }
    },
    "monitoring-central": {
      "command": "npx",
      "args": ["-y", "ts-node", "src/mcp/monitoring-mcp-server.ts"],
      "env": {
        "PROMETHEUS_URL": "http://localhost:9090",
        "ALERT_WEBHOOK": "https://hooks.slack.com/..."
      }
    }
  }
}
```

## 🚀 Deployment & Operations

### Service Dependencies
```mermaid
graph TD
    A[Wall-Bounce MCP] --> B[Vault MCP]
    A --> C[Context7 MCP]
    A --> D[OpenRouter MCP]
    
    B --> E[Redis Cache]
    B --> F[File Storage]
    
    C --> G[Context7 API]
    
    D --> H[OpenRouter API]
    
    I[Monitoring MCP] --> A
    I --> B
    I --> C
    I --> D
    I --> J[Prometheus]
```

### Health Check Endpoints
- **Wall-Bounce**: `POST /mcp {"method": "tools/call", "params": {"name": "wall-bounce-status"}}`
- **Vault**: `POST /mcp {"method": "tools/call", "params": {"name": "vault-health-check"}}`
- **Monitoring**: `POST /mcp {"method": "tools/call", "params": {"name": "monitoring-system-status"}}`

### Performance Benchmarks
- **Wall-Bounce Latency**: < 5s (95th percentile)
- **Vault Operations**: < 100ms (99th percentile)
- **Context7 Resolution**: < 2s (95th percentile)
- **Overall System**: 99.9% uptime target

## 📈 Scaling & Optimization

### Horizontal Scaling
- **MCP Server Clustering**: PM2 cluster mode
- **Redis Sentinel**: High availability caching
- **Load Balancing**: Nginx upstream configuration
- **Resource Monitoring**: Auto-scaling triggers

### Performance Optimization
- **Connection Pooling**: MCP client connection reuse
- **Response Caching**: Context7/Stash results caching
- **Batch Processing**: Multiple requests aggregation
- **Circuit Breakers**: Cascade failure prevention

---

**🔗 Enhanced MCP Architecture - Production Ready**
*Standard-compliant, scalable, and enterprise-grade MCP service mesh*