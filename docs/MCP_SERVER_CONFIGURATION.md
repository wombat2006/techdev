# MCP Server Configuration Guide

## 概要

Claude CodeのMCPダイアログで利用可能なMCPサーバの設定・管理ガイドです。context7（ライブラリドキュメント）、serena（AIコーディングエージェント）、codex（GPT-5/Codex統合）の各MCPサーバの設定方法と使用方法を詳細に説明します。

## MCP (Model Context Protocol) とは

MCPは、AI言語モデルとツール・データソース間の標準化された通信プロトコルです。Claude CodeではMCPサーバを通じて外部ツールやサービスにアクセスできます。

### アーキテクチャ概要

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Claude Code   │────│  MCP Protocol   │────│   MCP Servers   │
│   /mcp command  │    │   stdin/stdout  │    │  (tools/data)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Dialog   │    │ Message Exchange│    │   Tool Execution│
│   Server Select │    │   JSON-RPC 2.0  │    │   Data Access   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 設定されたMCPサーバ一覧

### 1. Context7 (自動設定)
- **機能**: ライブラリドキュメント検索・取得
- **コマンド**: 内蔵MCPサーバ
- **用途**: リアルタイムライブラリドキュメント参照

### 2. Serena
- **機能**: AI コーディングエージェントツールキット
- **コマンド**: `uv run serena mcp`
- **用途**: セマンティックコード検索・編集、LSP統合、多言語開発支援

### 3. Codex
- **機能**: OpenAI Codex直接アクセス
- **コマンド**: `codex mcp serve`
- **用途**: GPT-5/Codexモデルでのコード生成・分析

### 4. TechSapo-Codex
- **機能**: TechSapo最適化版Codex
- **コマンド**: `/ai/prj/techdev/scripts/start-codex-mcp.sh`
- **用途**: TechSapo環境でのCodex統合・Wall-Bounce分析

## MCP設定コマンド

### 基本操作

```bash
# MCP サーバ一覧表示
codex mcp list

# MCP サーバ詳細表示
codex mcp get <server-name>

# MCP サーバ追加
codex mcp add <name> -- <command> [args...]

# MCP サーバ削除
codex mcp remove <server-name>
```

### 実際の設定コマンド

```bash
# Serena MCP サーバ追加
codex mcp add serena -- uv run serena mcp

# Codex MCP サーバ追加
codex mcp add codex -- codex mcp serve

# TechSapo-Codex MCP サーバ追加
codex mcp add techsapo-codex -- /ai/prj/techdev/scripts/start-codex-mcp.sh
```

## 各MCPサーバの詳細設定

### Context7 MCP Server

#### 機能概要
- ライブラリ名からContext7互換IDへの変換
- 最新ライブラリドキュメントの取得
- トピック別ドキュメント検索

#### 利用可能ツール
```typescript
// Library ID resolution
resolve-library-id(libraryName: string): string

// Documentation retrieval
get-library-docs(
  context7CompatibleLibraryID: string,
  tokens?: number,
  topic?: string
): DocumentationResult
```

#### 使用例
```bash
# MCPダイアログでcontext7選択後
> resolve library ID for "express"
> get documentation for "/expressjs/express"
```

### Serena MCP Server

#### 機能概要
- AIコーディングエージェント機能強化
- Language Server Protocol (LSP) 統合
- セマンティックコード検索・編集
- 20+ プログラミング言語対応

#### 前提条件
```bash
# UV (Python package manager) インストール確認
which uv
# → /home/wombat/.local/bin/uv

# Serena availability 確認
uv run serena --help
```

#### 設定ファイル
```bash
# Serena設定管理
uv run serena config list
uv run serena config set <key> <value>
uv run serena config get <key>
```

#### 利用可能機能
- セマンティックコード検索（シンボルレベル）
- 精密なコード編集機能
- LSPベースのコード理解
- 複雑プロジェクトでの効率的ナビゲーション
- トークン使用量最適化

### Codex MCP Server

#### 機能概要
- GPT-5/Codex モデル直接アクセス
- ストリーミング応答対応
- セッション管理
- コンテキスト保持

#### 認証要件
```bash
# Codex認証状態確認
codex login status
# → Logged in using ChatGPT

# 認証が必要な場合
codex login
```

#### 設定パラメータ
```bash
# モデル設定
codex mcp serve \
  --model gpt-5-codex \
  --sandbox read-only \
  --approval never
```

#### セキュリティ設定
- **Sandbox Mode**: read-only（読み取り専用）
- **Approval Policy**: risk-based（リスクベース承認）
- **Session Timeout**: 10分

### TechSapo-Codex MCP Server

#### 機能概要
- TechSapo環境最適化
- Wall-Bounce システム統合
- パフォーマンス監視連携
- Upstash Redis セッション管理

#### 起動スクリプト詳細
```bash
# スクリプト: /ai/prj/techdev/scripts/start-codex-mcp.sh
# 機能:
# - 環境確認（Codex CLI、認証、設定）
# - TypeScript ビルド
# - Redis 接続確認
# - MCP サーバ起動
# - パフォーマンス監視開始
```

#### 設定ファイル
```toml
# config/codex-mcp.toml
[codex]
model = "gpt-5-codex"
sandbox = "read-only"
auth_file = "/home/wombat/.codex/auth.json"

[mcp]
approval_policy = "risk-based"
max_concurrent_sessions = 15
session_timeout_ms = 600000

[monitoring]
enable_real_time_monitoring = true
metrics_collection_interval_ms = 30000
```

## MCP使用方法

### Claude Code内でのMCP使用

#### 1. MCP ダイアログ起動
```bash
# Claude Code内で実行
/mcp
```

#### 2. サーバ選択
- context7: ライブラリドキュメント検索
- serena: Python開発支援
- codex: Codex直接利用
- techsapo-codex: TechSapo統合Codex

#### 3. インタラクション例

**Context7使用例:**
```
User: /mcp → context7選択
> I need documentation for React hooks
Assistant: I'll help you find React hooks documentation.
[context7 resolve-library-id: "react"]
[context7 get-library-docs: "/facebook/react", topic: "hooks"]
```

**Serena使用例:**
```
User: /mcp → serena選択
> Find all functions that handle user authentication in this codebase
Assistant: I'll search for authentication-related functions using Serena's semantic search.
[serena: LSP-based semantic search for authentication functions]
[serena: Navigate to relevant code locations with precise context]
```

**Codex使用例:**
```
User: /mcp → codex選択
> Write a TypeScript function to validate email addresses
Assistant: I'll create an email validation function.
[codex: "Write a TypeScript function that validates email addresses using regex"]
```

### 高度な使用パターン

#### Wall-Bounce Analysis with TechSapo-Codex
```
User: /mcp → techsapo-codex選択
> Analyze the performance trade-offs between different sorting algorithms
Assistant: I'll perform a Wall-Bounce analysis across multiple LLMs.
[techsapo-codex: Multi-LLM orchestration]
[GPT-5 → Sonnet 4 → Gemini 2.5 Pro → Synthesized Response]
```

#### チェーン実行
```
User: /mcp → context7選択
> Get FastAPI documentation
[context7: FastAPI docs retrieved]

User: /mcp → serena選択
> Refactor the authentication code for better maintainability
[serena: Semantic analysis and precise code editing applied]

User: /mcp → codex選択
> Optimize the generated code
[codex: Code optimization applied]
```

## トラブルシューティング

### 一般的な問題

#### 1. MCP サーバが表示されない
```bash
# 設定確認
codex mcp list

# サーバ追加（例：serena）
codex mcp add serena -- uv run serena mcp
```

#### 2. Serena MCP エラー
```bash
# UV インストール確認
curl -LsSf https://astral.sh/uv/install.sh | sh

# PATH 設定確認
export PATH="$HOME/.local/bin:$PATH"

# Serena 動作確認
uv run serena --help
```

#### 3. Codex MCP 認証エラー
```bash
# 認証状態確認
codex login status

# 再認証
codex login

# 認証ファイル確認
ls -la ~/.codex/auth.json
```

#### 4. TechSapo-Codex 起動エラー
```bash
# スクリプト実行権限確認
chmod +x /ai/prj/techdev/scripts/start-codex-mcp.sh

# 設定ファイル確認
cat /ai/prj/techdev/config/codex-mcp.toml

# Redis 接続確認
node -e "require('./dist/services/redis-service').getRedisService().get('test')"
```

### ログ確認

#### MCP サーバログ
```bash
# Codex MCP ログ
tail -f ~/.codex/log/codex-mcp.log

# TechSapo-Codex ログ
tail -f /ai/prj/techdev/logs/codex-mcp.log

# Claude Code ログ (MCP関連)
# Claude Code内部ログ確認
```

#### デバッグモード
```bash
# Codex詳細ログ
export RUST_LOG=debug
codex mcp serve

# Serena詳細ログ
uv run serena mcp --verbose

# TechSapo詳細ログ
export MCP_DEBUG_LEVEL=debug
/ai/prj/techdev/scripts/start-codex-mcp.sh
```

## パフォーマンス最適化

### MCPサーバパフォーマンス

#### Context7最適化
```typescript
// 大きなドキュメント取得時のトークン制限
context7.getLibraryDocs(libraryId, {
  tokens: 10000,        // 適切なトークン数制限
  topic: "specific"     // 特定トピックに絞る
});
```

#### Codex最適化
```toml
# config/codex-mcp.toml
[performance]
initial_response_timeout = 30000      # 30秒
max_concurrent_sessions = 10          # 並列セッション制限
enable_response_caching = true        # レスポンスキャッシュ
cache_ttl_ms = 300000                # 5分キャッシュ
```

#### Serena最適化
```bash
# LSP サーバパフォーマンス最適化
export SERENA_LSP_TIMEOUT=30000
export SERENA_SEMANTIC_CACHE=true

# Serena設定最適化
uv run serena config set lsp.enabled true
uv run serena config set semantic_search.max_results 50
uv run serena config set code_analysis.depth deep
```

### メモリ管理

#### セッション管理
```bash
# アクティブセッション監視
codex mcp list | grep -c "running"

# メモリ使用量確認
ps aux | grep "mcp\|serena\|codex"

# セッションクリーンアップ
# 一定時間後に自動タイムアウト
```

## 設定ファイル管理

### 設定バックアップ

#### MCP設定バックアップ
```bash
# Codex MCP設定
cp ~/.codex/config.toml ~/.codex/config.toml.backup

# Serena設定
uv run serena config export > serena-config-backup.json

# TechSapo設定
cp /ai/prj/techdev/config/codex-mcp.toml \
   /ai/prj/techdev/config/codex-mcp.toml.backup
```

#### 設定復元
```bash
# MCP サーバ設定復元
codex mcp remove serena
codex mcp remove codex
codex mcp remove techsapo-codex

# 再設定
codex mcp add serena -- uv run serena mcp
codex mcp add codex -- codex mcp serve
codex mcp add techsapo-codex -- /ai/prj/techdev/scripts/start-codex-mcp.sh
```

### 環境別設定

#### 開発環境
```bash
# 開発用MCP設定
export MCP_ENV=development
export MCP_DEBUG=true
export CODEX_SANDBOX=read-only
```

#### 本番環境
```bash
# 本番用MCP設定
export MCP_ENV=production
export MCP_DEBUG=false
export CODEX_SANDBOX=read-only
export CODEX_APPROVAL_POLICY=risk-based
```

## 高度な設定

### カスタムMCPサーバ

#### 新しいMCPサーバ追加
```bash
# カスタムツール追加例
codex mcp add my-tool -- /path/to/my/mcp/server

# Python MCPサーバ例
codex mcp add python-tools -- python -m my_mcp_server

# Node.js MCPサーバ例
codex mcp add node-tools -- node /path/to/mcp-server.js
```

#### MCPサーバ開発

##### Python MCP Server Template
```python
#!/usr/bin/env python3
import asyncio
from mcp.server import Server
from mcp.types import Tool, TextContent

server = Server("my-mcp-server")

@server.list_tools()
async def list_tools():
    return [
        Tool(
            name="my_tool",
            description="Description of my tool",
            inputSchema={
                "type": "object",
                "properties": {
                    "input": {"type": "string"}
                }
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "my_tool":
        result = f"Processed: {arguments.get('input', '')}"
        return [TextContent(type="text", text=result)]

if __name__ == "__main__":
    asyncio.run(server.run())
```

##### Node.js MCP Server Template
```javascript
#!/usr/bin/env node
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');

const server = new Server('my-mcp-server', '1.0.0');

server.setRequestHandler('tools/list', async () => ({
  tools: [{
    name: 'my_tool',
    description: 'Description of my tool',
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string' }
      }
    }
  }]
}));

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'my_tool') {
    return {
      content: [{
        type: 'text',
        text: `Processed: ${request.params.arguments.input || ''}`
      }]
    };
  }
});

server.connect();
```

### セキュリティ強化

#### アクセス制御
```toml
# config/codex-mcp.toml
[security]
risk_assessment = true
audit_logging = true
sensitive_data_detection = true
auto_approve_read_only = true
auto_approve_isolated = false
auto_approve_full_access = false
```

#### ネットワーク制限
```bash
# ファイアウォール設定（必要に応じて）
# MCPサーバは通常localhost通信のみ

# プロセス分離
# 各MCPサーバは独立プロセスで実行
```

## 監視とメトリクス

### MCP使用状況監視

#### 使用頻度トラッキング
```bash
# MCPサーバ使用統計
grep "mcp.*server" ~/.claude/logs/* | \
  awk '{print $1}' | sort | uniq -c

# 人気MCPサーバランキング
codex mcp list | while read server; do
  echo "$server: $(grep "$server" ~/.claude/logs/* | wc -l)"
done
```

#### パフォーマンスメトリクス
```bash
# 応答時間測定
time codex mcp get context7

# メモリ使用量測定
ps aux | grep mcp | awk '{sum+=$6} END {print "Total RSS:", sum/1024 "MB"}'

# プロセス数監視
pgrep -f "mcp" | wc -l
```

### アラート設定

#### 基本アラート
```bash
# MCPサーバ停止検出
if ! pgrep -f "codex mcp serve" > /dev/null; then
  echo "ALERT: Codex MCP server is down"
fi

# 高メモリ使用量検出
MCP_MEMORY=$(ps aux | grep mcp | awk '{sum+=$6} END {print sum/1024}')
if (( $(echo "$MCP_MEMORY > 1000" | bc -l) )); then
  echo "ALERT: MCP servers using ${MCP_MEMORY}MB memory"
fi
```

## 付録

### MCPサーバ対応表

| サーバ名 | プロトコル | 言語 | 機能 | メンテナンス |
|---------|----------|------|------|------------|
| context7 | MCP 1.0 | - | ドキュメント検索 | 自動更新 |
| serena | MCP 1.0 | Multi | AIコーディングエージェント | UV管理 |
| codex | MCP 1.0 | Rust | Codexアクセス | OpenAI管理 |
| techsapo-codex | MCP 1.0 | TypeScript | TechSapo統合 | 手動管理 |

### 設定ファイルパス

```bash
# Codex関連
~/.codex/config.toml          # Codex CLI設定
~/.codex/auth.json           # 認証情報
~/.codex/log/                # ログディレクトリ

# TechSapo関連
/ai/prj/techdev/config/codex-mcp.toml    # TechSapo-Codex設定
/ai/prj/techdev/logs/                    # ログディレクトリ
/ai/prj/techdev/.env                     # 環境変数

# Serena関連
~/.config/serena/            # Serena設定ディレクトリ
~/.cache/uv/                 # UVキャッシュ
```

### コマンドリファレンス

#### MCP管理コマンド
```bash
codex mcp list                           # サーバ一覧
codex mcp get <name>                     # サーバ詳細
codex mcp add <name> -- <command>        # サーバ追加
codex mcp remove <name>                  # サーバ削除
```

#### Serenaコマンド
```bash
uv run serena --help                     # ヘルプ
uv run serena config list                # 設定一覧
uv run serena mcp                        # MCP サーバ起動
```

#### Codexコマンド
```bash
codex --help                             # ヘルプ
codex login status                       # 認証状態
codex mcp serve                          # MCP サーバ起動
```

#### TechSapo統合コマンド
```bash
npm run codex-mcp                        # TechSapo-Codex起動
npm run codex-mcp-test                   # 設定テスト
npm run mcp-performance                  # パフォーマンス監視
```

---

**作成日**: 2024年9月29日
**対象**: Claude Code MCP Configuration
**バージョン**: 1.0
**メンテナンス**: MCPサーバ更新時に随時更新