# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 Core Principles

- **Japanese Response**: 基本的に日本語で応答
- **MCP Wall-Bounce**: Model Context Protocol経由での必須壁打ち分析
- **Quality Enhancement**: ユーザー入力を検証し、不足要素は追加ヒアリング
- **No Anthropic API**: Never use Anthropic API_KEY - use SDK instead for MAX x5 Plan cost avoidance

## 🛠️ Essential Commands

```bash
# Development
npm run dev              # Hot reload development with ts-node-dev
npm run build           # Build TypeScript to dist/
npm start               # Production server (requires build first)

# Testing
npm test                # All tests (Jest, 120s timeout)
npm run test:watch      # Watch mode testing
npm run test:coverage   # Coverage report with lcov/html
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only
npm run lint            # ESLint check

# MCP Services
npm run cipher-mcp      # Cipher MCP memory service
npm run cipher-api      # Cipher API mode on port 3002
./scripts/start-monitoring.sh  # Full monitoring stack
```

## 🏗️ Core Architecture

### Primary Services
- **Wall-Bounce Analyzer** (`src/services/wall-bounce-analyzer.ts`) - Multi-LLM orchestration
- **MCP Integration** (`src/services/mcp-*.ts`) - Model Context Protocol services
- **RAG System** (`src/services/googledrive-connector.ts`) - Google Drive knowledge retrieval

### API Endpoints
- `POST /api/v1/generate` - Multi-LLM generation with wall-bounce
- `POST /api/v1/analyze-logs` - Log analysis with consensus
- `POST /api/v1/rag/search` - RAG search
- `GET /api/v1/health` - Service health check

## ⚡ Critical Requirements

### LLM Provider Rules - 絶対的命令
- **OpenAI**: 必ずcodex経由で呼び出し（直接API使用禁止）
- **Anthropic**: Claude Code直接呼び出しのみ（API使用絶対禁止）
- **Google**: Gemini 2.5 Flash/Pro via official SDK
- **Wall-Bounce**: Minimum 2 providers, consensus required

### MCP Integration
- All services via Model Context Protocol v2025-03-26
- Context7 MCP mandatory for technical documentation
- Vault MCP for encrypted environment variables
- Quality thresholds: Confidence ≥ 0.7, Consensus ≥ 0.6

## 📚 Documentation

See detailed documentation in:
- [Development Guide](./docs/DEVELOPMENT_GUIDE.md) - Commands, architecture, testing
- [MCP Integration](./docs/MCP_INTEGRATION.md) - Model Context Protocol services
- [Wall-Bounce System](./docs/WALL_BOUNCE_SYSTEM.md) - Multi-LLM orchestration
- [OpenAI Node.js SDK](./docs/OPENAI_NODE_SDK.md) - OpenAI SDK fundamentals & best practices
- [Tiktoken Integration](./docs/TIKTOKEN_INTEGRATION.md) - Token counting & cost management
- [OpenAI Agents Basics](./docs/OPENAI_AGENTS_BASICS.md) - OpenAI Agents JS fundamentals
- [OpenAI Agents Integration](./docs/OPENAI_AGENTS_INTEGRATION.md) - Multi-agent workflows
- [OpenAI Cookbook Integration](./docs/OPENAI_COOKBOOK_INTEGRATION.md) - Advanced AI techniques
- [Monitoring Operations](./docs/MONITORING_OPERATIONS.md) - Prometheus/Grafana setup
- [API Reference](./docs/API_REFERENCE.md) - Endpoints and schemas
- [Testing Guide](./docs/TESTING_GUIDE.md) - Test strategy and implementation
- [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md) - Production deployment

## 🔒 Security & Environment

- Environment config: `src/config/environment.ts`
- TypeScript: ES2022, strict mode, CommonJS
- Testing: Jest, 30s timeout, Node environment
- Redis required for caching and sessions

## 🚨 Review Feedback (Codex)

- `src/services/redis-service.ts:216` でセッション/キャッシュの `set` に素のオブジェクトを渡すように変更されていますが、Upstash SDK は `string | number | boolean` しか扱えず、Redis には `"[object Object]"` が保存されてしまいます。元の `JSON.stringify`/`JSON.parse` を維持してください。→ **修正済み**（シリアライズ復旧 + パースエラーハンドリング追加）
- `src/services/wall-bounce-analyzer.ts:207` で `executeGeminiCLI` の引数が常に `gemini-2.5-pro` になっており、`gemini-2.5-flash` パスでも Pro モデルが呼ばれてしまいます。`version` を使って CLI の `--model` を切り替える必要があります。→ **修正済み**（version引数を追加し、Pro/FlashでCLIモデル・表示ラベル・コストを切替）
- TODO の方向性確認:
  - `src/wall-bounce-server.ts:337` の「GoogleDriveファイル情報を追加」は正しい次ステップです。→ **実装済み**：Drive メタデータを取得し、検索結果の `sources` に反映しました。
  - `src/routes/webhook-endpoints.ts:296` の `ragConnector` 連携未実装は、同期機能が空振りになるため早めの実装が必要です。→ **実装済み**：手動同期エンドポイントで RAG コネクタを初期化し、実際に `syncFolderToRAG` を実行します。
  - `src/services/googledrive-webhook-handler.ts:520` の OpenAI Files API での削除処理も、重複データ防止のため実装予定通り進めてください。→ **実装済み**：Drive ファイルIDと Vector Store ファイルID を Redis/In-memory で管理し、削除通知時に OpenAI Vector Store からファイルを削除します。
