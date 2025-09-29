# MCP Integration Guide

## 🏗️ Enhanced MCP Architecture

### MCP統合処理フロー
1. **クエリ受信** → Claude Code (総司令官)
2. **環境変数取得** → Vault MCP経由で暗号化設定取得
3. **リファレンス準備** → Stash/Context7 MCP並列でドキュメント参照
4. **壁打ち実行** → Wall-Bounce MCP経由で複数LLM協調分析
   - Gemini 2.5 Flash + GPT-5 + Claude Sonnet4 (標準構成)
   - OpenAI GPT-5専用: 技術的問題解決・実用的分析に特化
   - Claude Sonnet4 + OpenRouter MCP (複雑・高品質)
   - Cipher MCP (長期記憶・学習データ永続化専用)
5. **品質統合** → 信頼度・コンセンサス評価、自動エスカレーション
6. **監視記録** → Monitoring MCP経由でメトリクス収集
7. **最終回答生成** → 統合された高品質回答を提示

### MCP Service Hierarchy
- **Tier 0**: Stash/Context7 MCP - リファレンス・ドキュメント参照層
- **Tier 1**: Claude Code - MCP Orchestrator (統合責任者)
- **Tier 2**: Wall-Bounce MCP - 複数LLM協調処理エンジン
  - **GPT-5最適化**: 推論レベル制御、出力詳細度調整
  - **メタプロンプト**: 自動プロンプト最適化機能
  - **制約駆動**: 曖昧性を排除した精密指示
- **Tier 3**: Vault MCP - 環境変数暗号化管理
- **Tier 4**: OpenRouter MCP - 200+モデルAPIゲートウェイ
- **Tier 5**: Cipher MCP - 長期記憶・学習データ永続化サービス
- **Tier 6**: Monitoring MCP - 統合監視・メトリクス収集

## 🔧 MCP統合エンドポイント
- `localhost:3000/mcp` - Model Context Protocol統一API
- 全サービスがMCP v2025-03-26準拠で標準化

## 🚀 OpenAI Responses API統合 + 完全MCP統合

### API構成例
```typescript
// 新しいResponses API標準構成
const response = await openai.responses.create({
  model: 'gpt-5', // GPT-5専用（GPT-4o/GPT-4は使用禁止）
  instructions: 'システム指示...',
  input: userPrompt,
  store: true, // ステートフル対話
  reasoning: { effort: 'medium' }, // 推論品質制御
  tools: [{ type: 'file_search', vector_store_ids: [storeId] }]
});
const content = response.output_text; // 新しい応答形式
```

## 🔐 MCP セキュリティ・ガバナンス

### 多層承認ワークフロー
```typescript
// リスクレベル別承認制御
const approvalPolicies = {
  low: { approvers: 0, auto_approve: ['search', 'read', 'get'] },
  medium: { approvers: 1, roles: ['tech_lead', 'senior_engineer'] },
  high: { approvers: 1, roles: ['security_officer', 'engineering_manager'] },
  critical: { approvers: 2, roles: ['security_officer', 'cto'] }
};
```

### コスト最適化戦略
- **タスクタイプ別ツール選択**: basic(2ツール) → premium(4ツール) → critical(全ツール)
- **予算階層管理**: free($0.01) → standard($0.10) → premium($1.00)
- **リアルタイム監視**: 実行前コスト見積もりと事後分析
- **自動エスカレーション**: 予算超過時の自動制限とアラート

### セキュリティ制御
- **機密データ検出**: 自動PII/PHI/財務情報フィルタリング
- **操作監査ログ**: 全MCP呼び出しの完全トレーサビリティ
- **役割ベース制御**: ユーザー権限による動的ツールフィルタ
- **暗号化通信**: 全MCP通信のTLS1.3+OAuth2.0

## ⚡ MCP開発・運用ガイド

### 環境変数設定
```bash
# MCP基本設定
MCP_BUDGET_TIER=standard          # free/standard/premium
MCP_SECURITY_LEVEL=internal       # public/internal/sensitive/critical

# ツール個別設定
CIPHER_MCP_ENABLED=true
CONTEXT7_MCP_ENABLED=true
CONTEXT7_API_KEY=your_key_here
GOOGLE_DRIVE_MCP_ENABLED=true
GOOGLE_OAUTH_TOKEN=your_token_here
GMAIL_MCP_ENABLED=false           # 本番環境のみ
SHAREPOINT_MCP_ENABLED=false      # 企業環境のみ

# Anthropic設定 - API_KEY使用禁止
ANTHROPIC_SDK_ONLY=true           # SDKのみ使用、API_KEY禁止
```

### 使用例: タスクタイプ別実行
```typescript
// Basic Task - コスト優先
const basicResult = await mcpIntegrationService.executeMCPTools(openai, {
  tools: [], // 自動選択
  context: {
    taskType: 'basic',
    budgetTier: 'standard',
    securityLevel: 'internal'
  }
});

// Critical Task - 品質優先
const criticalResult = await mcpIntegrationService.executeMCPTools(openai, {
  tools: [], // 全ツール利用可能
  context: {
    taskType: 'critical',
    budgetTier: 'premium',
    securityLevel: 'critical'
  }
});
```

## 📊 MCP運用メトリクス

### パフォーマンス指標
- **実行成功率**: 95%以上 (自動復旧機能付き)
- **平均応答時間**: < 2秒 (承認待機除く)
- **コスト効率**: 従来比60-80%削減
- **セキュリティ違反**: ゼロトレランス (即座停止)

### 監視ダッシュボード
- **リアルタイムコスト**: ツール別・時間別使用量
- **承認キュー**: 待機中リクエストとSLA管理
- **セキュリティイベント**: 異常検知とインシデント対応
- **パフォーマンス分析**: レスポンス時間とスループット

## 🎯 実装完了項目 (2025年9月26日)
✅ **Cipher MCP統合**: 壁打ち分析の永続的学習機能
✅ **Google Drive MCP Connector**: 公式コネクタによる効率化
✅ **コスト最適化システム**: 動的ツール選択と予算管理
✅ **エンタープライズ承認ワークフロー**: 多層セキュリティ制御
✅ **統合監視・分析**: リアルタイムメトリクスとコンプライアンス