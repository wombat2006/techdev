# IT Infrastructure Support Tool with LLM Orchestrator

## 🎯 大原則
- **日本語回答**: 基本的に日本語で応答
- **必須壁打ち**: すべてのクエリで複数LLMによる壁打ち分析を実行
- **品質向上**: ユーザー入力を鵜呑みにせず、不足要素は追加ヒアリング

## 🏗️ Multi-LLM Architecture

### 一時受付窓口処理フロー
1. **クエリ受信** → Claude Code (総司令官)
2. **パラレル壁打ち発行** → 複数LLMに同時クエリ送信
   - Gemini 2.5 Flash + Claude Haiku 3.5 (基本)
   - Claude Sonnet4 + GPT-5 (複雑・高品質)
   - MCPサーバ経由でLlama/Qwen等 (補助)
3. **回答統合・品質評価** → ハルシネーション検証、エスカレーション判定
4. **最終回答生成** → 統合された高品質回答を提示

### LLM階層構成
- **Tier 1**: Claude Code - ルーティング・統合責任者
- **Tier 2**: Gemini 2.5 Flash + Claude Haiku 3.5 - 基本処理
- **Tier 3**: Claude Sonnet4 ($3/MTok入力) - 複雑分析
- **Tier 4**: GPT-5 ($1.25/MTok入力) - 最高品質
- **Tier 5**: Claude Opus4.1 - 緊急時専用

## 🔧 IT運用エンドポイント
- `localhost:4000/analyze-logs` - 技術障害分析
- `localhost:4000/generate` - premium/critical対応

### 実用コマンド例
```bash
# 障害解析 (自動壁打ち)
curl -X POST http://localhost:4000/analyze-logs \
  -H "Content-Type: application/json" \
  -d '{"user_command": "systemctl start mysql", 
       "error_output": "Connection refused on port 3306"}'

# 高品質支援 (強制Sonnet4壁打ち)
curl -X POST http://localhost:4000/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Pacemakerクラスタstonith問題解決", 
       "task_type": "premium"}'

# 緊急対応 (強制Opus4.1壁打ち)
curl -X POST http://localhost:4000/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "本番JobArranger全停止緊急復旧", 
       "task_type": "critical"}'
```

## 🔐 セキュリティ・コスト管理
- **予算**: $70/月 - リアルタイム監視・自動最適化
- **データ保護**: GDPR/HIPAA準拠、機密情報マスキング
- **監査**: MySQL全活動ログ、Prometheus監視

## ⚡ 重要実装原則
- **コーディング**: Claude Code + GPT-5 壁打ち協業必須
- **壁打ち徹底**: 単一LLM処理禁止、常にパラレル複数LLM処理
- **統合ロジック**: 各LLM回答を品質評価・統合して最終回答生成
- **エスカレーション**: 不十分な回答は上位Tierへ自動昇格

## 🚀 Deployment Ready
- **環境変数**: 全API key外部設定対応
- **Docker**: フルコンテナ化サポート
- **PM2**: プロセス自動復旧・スケーリング
- **SSL**: 本番HTTPS証明書統合