# Enhanced IT Infrastructure Support with MCP Orchestration

## 🎯 大原則
- **日本語回答**: 基本的に日本語で応答
- **MCP壁打ち**: Model Context Protocol経由での必須壁打ち分析
- **品質向上**: ユーザー入力を鵜呑みにせず、不足要素は追加ヒアリング
- **Property-Testing**: fast-check活用の包括的品質保証

## 🏗️ Enhanced MCP Architecture

### MCP統合処理フロー
1. **クエリ受信** → Claude Code (総司令官)
2. **環境変数取得** → Vault MCP経由で暗号化設定取得
3. **リファレンス準備** → Stash/Context7 MCP並列でドキュメント参照
4. **壁打ち実行** → Wall-Bounce MCP経由で複数LLM協調分析
   - Gemini 2.5 Flash + Claude Haiku 3.5 + cursor-mcp (基本)
   - Claude Sonnet4 + OpenRouter MCP (複雑・高品質)
   - Cipher MCP (セキュリティ・暗号化専用)
5. **品質統合** → 信頼度・コンセンサス評価、自動エスカレーション
6. **監視記録** → Monitoring MCP経由でメトリクス収集
7. **最終回答生成** → 統合された高品質回答を提示

### MCP Service Hierarchy
- **Tier 0**: Stash/Context7 MCP - リファレンス・ドキュメント参照層
- **Tier 1**: Claude Code - MCP Orchestrator (統合責任者)
- **Tier 2**: Wall-Bounce MCP - 複数LLM協調処理エンジン
- **Tier 3**: Vault MCP - 環境変数暗号化管理
- **Tier 4**: OpenRouter MCP - 200+モデルAPIゲートウェイ
- **Tier 5**: Cipher MCP - 高度暗号化・セキュリティサービス
- **Tier 6**: Monitoring MCP - 統合監視・メトリクス収集

## 🔧 MCP統合エンドポイント
- `localhost:3000/mcp` - Model Context Protocol統一API
- 全サービスがMCP v2025-03-26準拠で標準化

### MCP実用コマンド例
```bash
# Wall-Bounce MCP 協調分析
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0", "id": 1,
    "method": "tools/call",
    "params": {
      "name": "wall-bounce-analyze",
      "arguments": {
        "query": "Pacemakerクラスタstonith問題解決",
        "priority": "high",
        "context": {"useContext7": true}
      }
    }
  }'

# Vault MCP 暗号化環境変数管理
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0", "id": 2,
    "method": "tools/call",
    "params": {
      "name": "vault-set-secret",
      "arguments": {
        "key": "PRODUCTION_DATABASE_URL",
        "value": "postgresql://...",
        "environment": "production"
      }
    }
  }'

# Context7 MCP 必須リファレンス参照
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0", "id": 3,
    "method": "tools/call",
    "params": {
      "name": "context7-get-docs",
      "arguments": {
        "libraryId": "/kubernetes/kubernetes",
        "topic": "cluster networking"
      }
    }
  }'
```

## 🔐 セキュリティ・コスト管理
- **予算**: $70/月 - リアルタイム監視・自動最適化
- **データ保護**: GDPR/HIPAA準拠、機密情報マスキング
- **監査**: MySQL全活動ログ、Prometheus監視

## ⚡ 重要実装原則
- **MCP準拠**: すべての通信をModel Context Protocol v2025-03-26準拠
- **Context7必須**: コーディング・ドキュメント参照時は必ずContext7 MCP使用
- **Vault暗号化**: 環境変数はVault MCP経由でAES-256-GCM必須暗号化
- **壁打ち徹底**: Wall-Bounce MCP経由での複数LLM協調処理必須
- **品質閾値**: 信頼度0.7・コンセンサス0.6未満は自動エスカレーション
- **Property-Testing**: fast-check活用の包括的品質保証システム
- **統合監視**: Monitoring MCP経由でのリアルタイム監視必須

## 🚀 Deployment Ready
- **環境変数**: 全API key外部設定対応
- **Docker**: フルコンテナ化サポート + 監視スタック完備
- **PM2**: プロセス自動復旧・スケーリング
- **SSL**: 本番HTTPS証明書統合 + 90日自動更新
- **監視スタック**: Prometheus + Grafana + AlertManager完全統合
- **一発起動**: `./scripts/start-monitoring.sh` で全環境起動
- CLAUDE.mdは更新のたびに必ず日付と時刻をを付与したファイル名でバックアップを取得すること