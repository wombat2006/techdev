# TechSapo ドキュメント索引
## 完全なドキュメント体系・ナビゲーションガイド

**最終更新**: 2025-10-12
**バージョン**: 1.5
**ステータス**: Phase 3F (50% SRP) Complete + 運用ドキュメント統合完了

---

## 📚 ドキュメント体系概要

TechSapo プロジェクトの全ドキュメントを目的別・対象者別に整理した包括的な索引です。Single Responsibility Principle (SRP) アーキテクチャ移行の完全な記録と運用ノウハウを体系化しています。

---

## 🎯 対象者別クイックガイド

### 🔰 新規参加者向け（最初に読むべき3文書）
1. **[システム概要](./TEAM_MANUAL.md#システム概要5分で理解)** - TechSapoの基本理解（5分）
2. **[環境セットアップガイド](./ENVIRONMENT_SETUP.md)** - 環境構築の完全ガイド（30分）
3. **[基本的な運用タスク](./TEAM_MANUAL.md#日常運用タスク)** - 日々の作業（15分）

### 👩‍💻 開発者向け
- **メイン**: [Development Guide](./DEVELOPMENT_GUIDE.md)
- **環境構築**: [Environment Setup Guide](./ENVIRONMENT_SETUP.md)
- **LLMプロバイダー**: [LLM Providers Guide](./LLM_PROVIDERS_GUIDE.md)
- **API**: [API Reference](./API_REFERENCE.md)
- **アーキテクチャ**: [Wall-Bounce System](./WALL_BOUNCE_SYSTEM.md)
- **統合**: [MCP Integration](./MCP_INTEGRATION.md)

### 🛠️ 運用者向け
- **メイン**: [Team Manual](./TEAM_MANUAL.md)
- **ベストプラクティス**: [Best Practices Guide](./BEST_PRACTICES_GUIDE.md)
- **監視**: [Monitoring Operations](./MONITORING_OPERATIONS.md)
- **トラブルシューティング**: [Troubleshooting Guide](./TROUBLESHOOTING.md)

### 📊 マネージャー向け
- **成果報告**: [Technical Report](./TECHNICAL_REPORT.md)
- **移行実績**: [SRP Migration Complete Guide](./SRP_MIGRATION_COMPLETE_GUIDE.md)
- **ベストプラクティス**: [Best Practices Guide](./BEST_PRACTICES_GUIDE.md)

---

## 📁 ドキュメント分類

### 🏗️ アーキテクチャ・設計文書

#### [Wall-Bounce System](./WALL_BOUNCE_SYSTEM.md)
**目的**: Multi-LLM統合アーキテクチャの詳細設計
**対象**: 開発者、アーキテクト
**内容**:
- Wall-bounce の仕組み・アルゴリズム
- Provider統合パターン
- Consensus Engine設計
- パフォーマンス特性

#### [MCP Integration](./MCP_INTEGRATION.md)
**目的**: Model Context Protocol統合の実装詳細
**対象**: 開発者、インテグレーションエンジニア
**内容**:
- MCP v2025-03-26 準拠実装
- OpenAI GPT-5 Codex統合
- Context7, Vault MCP活用
- セキュリティ考慮事項

#### [OpenAI Node.js SDK](./OPENAI_NODE_SDK.md)
**目的**: OpenAI API統合の基礎技術
**対象**: 開発者
**内容**:
- SDK基本操作・認証
- エラーハンドリング
- ベストプラクティス
- パフォーマンス最適化

#### [Tiktoken Integration](./TIKTOKEN_INTEGRATION.md)
**目的**: トークン計算・コスト管理
**対象**: 開発者、運用者
**内容**:
- トークン計算手法
- コスト分析・最適化
- 使用量監視・制御

---

### 🚀 移行・実装文書

#### [SRP Migration Complete Guide](./SRP_MIGRATION_COMPLETE_GUIDE.md)
**目的**: 段階的移行プロセスの完全記録
**対象**: 全チームメンバー、意思決定者
**内容**:
- Phase 1 (1%) → Phase 3F (50%) の軌跡
- 50倍スケーリング達成の技術詳細
- フェーズ別設定・成果データ
- アーキテクチャ進化の記録

**🏆 注目ポイント**:
- 実証済み段階的移行手法
- ゼロダウンタイム・ゼロロールバック実績
- 84.4-85.5% コンセンサス品質達成

#### [Technical Report](./TECHNICAL_REPORT.md)
**目的**: 技術的成果・分析の包括的レポート
**対象**: CTO、プロジェクトマネージャー、投資家
**内容**:
- エグゼクティブサマリー・ROI分析
- 詳細パフォーマンス測定結果
- アーキテクチャ深堀り分析
- 将来拡張・改善提案

**💰 ビジネス価値**:
- 70% コスト削減実現
- 96% プロジェクト成功度
- 94% 年間ROI達成

---

### 📖 運用・ガイド文書

#### [Best Practices Guide](./BEST_PRACTICES_GUIDE.md)
**目的**: 運用ベストプラクティスの体系化
**対象**: 運用チーム、新規参加者
**内容**:
- アーキテクチャ設計原則
- 設定管理・監視戦略
- コスト最適化・セキュリティ
- スケーリング・継続改善

**🎯 活用場面**:
- 新環境セットアップ時
- 設定値調整・最適化時
- トラブル予防・品質向上時

#### [Team Manual](./TEAM_MANUAL.md)
**目的**: チーム運用の実践的マニュアル
**対象**: 開発・運用・QA全チーム
**内容**:
- 日常運用タスク・チェックリスト
- トラブルシューティング手順
- アラート対応フロー
- チーム役割・エスカレーション

**⚡ 緊急時必読**:
- Level 3 Emergency対応手順
- 自動ロールバック条件・手順
- エスカレーション連絡先

#### [Monitoring Operations](./MONITORING_OPERATIONS.md)
**目的**: 監視・メトリクス運用の詳細
**対象**: 運用エンジニア、SRE
**内容**:
- Prometheus + Grafana セットアップ
- 重要メトリクス定義・閾値設定
- アラート設定・通知ルール
- ダッシュボード構成

#### [LINE Notification System](./LINE_NOTIFICATION_SYSTEM.md)
**目的**: LINE通知システムのインフラ・運用ガイド
**対象**: 運用エンジニア、インフラ担当
**内容**:
- LINE通知アーキテクチャ (line-notification.com)
- Push Message API仕様・使用方法
- VM監視スクリプトとの統合
- トラブルシューティング・サービス管理

#### [Operational Scripts Guide](./OPERATIONAL_SCRIPTS.md) ⭐ NEW
**目的**: 運用スクリプトの完全リファレンス
**対象**: 運用エンジニア、DevOps、開発者
**内容**:
- 監視・メンテナンススクリプト (vm-monitor.sh)
- デプロイ・本番運用スクリプト
- 開発・テストスクリプト
- MCPサービス管理
- スクリプト開発ガイドライン・ベストプラクティス

---

### 🛠️ 開発・技術文書

#### [Environment Setup Guide](./ENVIRONMENT_SETUP.md) ⭐ NEW
**目的**: 環境構築・設定の完全ガイド
**対象**: 開発者、DevOps、新規参加者
**内容**:
- 環境戦略 (dotenv, AWS Secrets Manager, hybrid)
- 必須・オプション環境変数一覧
- 開発環境 vs 本番環境セットアップ
- systemd設定・ポート構成
- Redis・データベース設定
- シークレットローテーション

#### [LLM Providers Guide](./LLM_PROVIDERS_GUIDE.md) ⭐ NEW
**目的**: LLMプロバイダー統合の詳細ガイド
**対象**: 開発者、AI/LLMエンジニア
**内容**:
- プロバイダー階層・選択ロジック
- GPT-5 Codex (Codex CLI) 完全ガイド
- Gemini CLI 使用方法
- Qwen3-Coder (OpenRouter) 統合
- Claude API 制御ルール
- ヘルスチェック・コスト最適化

#### [GPT-5 Codex Verification Report](./GPT5_CODEX_VERIFICATION.md) ⭐ NEW
**目的**: GPT-5 Codex モデル検証レポート
**対象**: 開発者、AI/LLMエンジニア
**内容**:
- モデル設定検証（llm-providers.json）
- 実行テスト結果（基本応答・コーディング能力）
- Reasoning Effort 設定の正当性確認
- 適応推論（Adaptive Reasoning）の説明
- ドキュメント整合性チェック

#### [GPT-5 vs GPT-5 Codex 実証結果](./GPT5_VS_GPT5_CODEX_実証結果.md) ⭐ NEW
**目的**: 実際のLLM問い合わせによる使い分け実証
**対象**: 開発者、AI/LLMエンジニア、意思決定者
**内容**:
- コーディングタスク → GPT-5 Codex選択実証
- 分析タスク → GPT-5 (標準) 選択実証
- Reasoning effort 動作の違い（詳細 vs ミニマル）
- 自動ルーティングロジックの確認
- Wall-Bounce APIでの使い分け方法

#### [Development Guide](./DEVELOPMENT_GUIDE.md)
**目的**: 開発環境・プロセスの標準化
**対象**: 開発者、新規参加者
**内容**:
- 開発環境セットアップ手順
- コーディング規約・ツール設定
- テスト戦略・CI/CD
- デバッグ・パフォーマンス分析

#### [API Reference](./API_REFERENCE.md)
**目的**: TechSapo API の完全仕様
**対象**: 開発者、インテグレーター
**内容**:
- エンドポイント仕様・パラメータ
- リクエスト・レスポンス例
- エラーコード・ハンドリング
- 認証・セキュリティ

#### [Testing Guide](./TESTING_GUIDE.md)
**目的**: テスト戦略・実装標準
**対象**: 開発者、QAエンジニア
**内容**:
- ユニット・統合・E2E テスト
- テストデータ・モック戦略
- パフォーマンス・負荷テスト
- 品質保証プロセス

#### [Deployment Guide](./DEPLOYMENT_GUIDE.md)
**目的**: 本番デプロイメント手順
**対象**: DevOps、運用チーム
**内容**:
- 本番環境構築・設定
- CI/CD パイプライン
- ロールバック・災害復旧
- セキュリティ・コンプライアンス

#### [Troubleshooting Guide](./TROUBLESHOOTING.md) ⭐ UPDATED
**目的**: 問題解決の実践的ガイド
**対象**: 開発者、運用者、サポート
**内容**:
- ビルド・ランタイムエラー対応
- 認証・デプロイメント問題
- Redis接続・MCP lock問題
- Wall-bounce品質改善
- Gemini/Codex CLI トラブルシューティング
- 環境変数・ポート競合解決

---

### 🧪 専門技術文書

#### [OpenAI Agents Basics](./OPENAI_AGENTS_BASICS.md)
**目的**: OpenAI Agents フレームワーク基礎
**対象**: AI・LLM開発者
**内容**:
- Agents フレームワーク概要
- 基本実装パターン
- 統合・カスタマイゼーション
- パフォーマンス・制限事項

#### [OpenAI Agents Integration](./OPENAI_AGENTS_INTEGRATION.md)
**目的**: Multi-agent ワークフロー構築
**対象**: 上級AI開発者
**内容**:
- 複数エージェント協調設計
- ワークフロー管理・制御
- 状態管理・エラー処理
- 実運用考慮事項

#### [OpenAI Cookbook Integration](./OPENAI_COOKBOOK_INTEGRATION.md)
**目的**: 先進AI技術の実装ガイド
**対象**: AI研究・開発リード
**内容**:
- OpenAI Cookbook活用手法
- 先進プロンプト技術
- ファインチューニング・評価
- 実験・プロトタイピング

---

## 🗺️ ドキュメント依存関係・読み進め順

### 初心者向け学習パス（推奨順序）

```
1. Team Manual (概要) → システム理解
    ↓
2. Development Guide → 環境構築
    ↓
3. Wall-Bounce System → アーキテクチャ理解
    ↓
4. Best Practices Guide → 運用ノウハウ
    ↓
5. SRP Migration Guide → 実装事例学習
```

### 開発者向け技術習得パス

```
1. Development Guide → 基礎環境
    ↓
2. API Reference → インターフェース
    ↓
3. Wall-Bounce System → コア技術
    ↓
4. MCP Integration → 統合技術
    ↓
5. OpenAI Node.js SDK → 外部API
    ↓
6. Testing Guide → 品質保証
```

### 運用者向け実践パス

```
1. Team Manual → 日常業務
    ↓
2. Best Practices Guide → 標準手法
    ↓
3. Monitoring Operations → 監視技術
    ↓
4. Technical Report → 成果理解
    ↓
5. SRP Migration Guide → 事例研究
```

---

## 🔍 キーワード・トピック索引

### アーキテクチャ関連
- **Wall-bounce**: [Wall-Bounce System](./WALL_BOUNCE_SYSTEM.md), [SRP Migration Guide](./SRP_MIGRATION_COMPLETE_GUIDE.md)
- **Consensus Engine**: [Wall-Bounce System](./WALL_BOUNCE_SYSTEM.md#consensus-engine), [Technical Report](./TECHNICAL_REPORT.md#consensus-engine実装)
- **Multi-LLM**: [Wall-Bounce System](./WALL_BOUNCE_SYSTEM.md), [Best Practices Guide](./BEST_PRACTICES_GUIDE.md#provider-diversity)
- **SRP (Single Responsibility)**: [SRP Migration Guide](./SRP_MIGRATION_COMPLETE_GUIDE.md), [Best Practices Guide](./BEST_PRACTICES_GUIDE.md#single-responsibility-principle)

### 技術統合
- **MCP (Model Context Protocol)**: [MCP Integration](./MCP_INTEGRATION.md), [Development Guide](./DEVELOPMENT_GUIDE.md#mcp-services)
- **OpenAI GPT-5**: [OpenAI Node.js SDK](./OPENAI_NODE_SDK.md), [MCP Integration](./MCP_INTEGRATION.md#gpt-5-codex)
- **Gemini 2.5 Pro**: [Wall-Bounce System](./WALL_BOUNCE_SYSTEM.md#provider構成), [Technical Report](./TECHNICAL_REPORT.md#llm-provider統合)
- **Redis/Upstash**: [Development Guide](./DEVELOPMENT_GUIDE.md#redis-setup), [Technical Report](./TECHNICAL_REPORT.md#redis-session管理)

### 運用・監視
- **監視・メトリクス**: [Monitoring Operations](./MONITORING_OPERATIONS.md), [Team Manual](./TEAM_MANUAL.md#監視アラート対応)
- **アラート対応**: [Team Manual](./TEAM_MANUAL.md#アラート対応フロー), [Best Practices Guide](./BEST_PRACTICES_GUIDE.md#アラート階層)
- **トラブルシューティング**: [Team Manual](./TEAM_MANUAL.md#トラブルシューティング), [Best Practices Guide](./BEST_PRACTICES_GUIDE.md#トラブルシューティング)
- **パフォーマンス**: [Technical Report](./TECHNICAL_REPORT.md#パフォーマンス分析), [Best Practices Guide](./BEST_PRACTICES_GUIDE.md#パフォーマンス最適化)

### 設定・構成
- **環境変数**: [Development Guide](./DEVELOPMENT_GUIDE.md#environment-setup), [Team Manual](./TEAM_MANUAL.md#設定変更手順)
- **フェーズ設定**: [SRP Migration Guide](./SRP_MIGRATION_COMPLETE_GUIDE.md#フェーズ別移行プロセス), [Best Practices Guide](./BEST_PRACTICES_GUIDE.md#フェーズ別設定戦略)
- **プロバイダー設定**: [Wall-Bounce System](./WALL_BOUNCE_SYSTEM.md#provider選択), [Best Practices Guide](./BEST_PRACTICES_GUIDE.md#プロバイダー選択戦略)

### 品質・テスト
- **テスト戦略**: [Testing Guide](./TESTING_GUIDE.md), [Technical Report](./TECHNICAL_REPORT.md#テスト品質保証)
- **品質指標**: [Technical Report](./TECHNICAL_REPORT.md#品質指標), [Best Practices Guide](./BEST_PRACTICES_GUIDE.md#品質指標の定義)
- **コンセンサス品質**: [Wall-Bounce System](./WALL_BOUNCE_SYSTEM.md#品質管理), [SRP Migration Guide](./SRP_MIGRATION_COMPLETE_GUIDE.md#コンセンサス品質推移)

---

## 📊 ドキュメント統計

### 文書数・規模
- **総文書数**: 22文書 (Operational Scripts Guide追加)
- **総ページ数**: 約230ページ
- **総文字数**: 約100,000文字
- **最新更新**: 2025-10-12 (運用スクリプトガイド文書化完了)

### 分類別内訳
- **アーキテクチャ・設計**: 4文書
- **移行・実装**: 2文書
- **運用・ガイド**: 6文書 (Operational Scripts Guide追加)
- **開発・技術**: 6文書 (Environment Setup, LLM Providers追加)
- **専門技術**: 3文書

### 対象者別カバレッジ
- **新規参加者**: 100% (入門から実践まで)
- **開発者**: 100% (基礎から高度技術まで)
- **運用者**: 100% (日常から緊急時まで)
- **マネージャー**: 100% (成果から戦略まで)

---

## 🚀 ドキュメント活用シナリオ

### シナリオ1: 新規開発者のオンボーディング

**Week 1**: システム理解
- Day 1-2: [Team Manual - システム概要](./TEAM_MANUAL.md#システム概要5分で理解)
- Day 3-4: [Development Guide - 環境構築](./DEVELOPMENT_GUIDE.md#クイックスタート)
- Day 5: [Wall-Bounce System - アーキテクチャ](./WALL_BOUNCE_SYSTEM.md)

**Week 2**: 実装技術
- Day 1-2: [MCP Integration](./MCP_INTEGRATION.md)
- Day 3-4: [API Reference](./API_REFERENCE.md)
- Day 5: [Testing Guide](./TESTING_GUIDE.md) + 実際のテスト実行

**Week 3**: 運用・品質
- Day 1-2: [Best Practices Guide](./BEST_PRACTICES_GUIDE.md)
- Day 3-4: [SRP Migration Guide](./SRP_MIGRATION_COMPLETE_GUIDE.md) - 事例学習
- Day 5: [Technical Report](./TECHNICAL_REPORT.md) - 全体振り返り

### シナリオ2: 障害発生時の対応

**即座 (5分以内)**:
1. [Team Manual - Level 3 Emergency](./TEAM_MANUAL.md#level-3-emergency緊急)
2. 緊急ロールバック実行
3. エスカレーション連絡

**調査フェーズ (30分以内)**:
1. [Team Manual - トラブルシューティング](./TEAM_MANUAL.md#トラブルシューティング)
2. [Monitoring Operations - メトリクス確認](./MONITORING_OPERATIONS.md)
3. [Best Practices Guide - 問題解決パターン](./BEST_PRACTICES_GUIDE.md#トラブルシューティング)

**復旧・改善フェーズ**:
1. [Development Guide - デバッグ手法](./DEVELOPMENT_GUIDE.md)
2. [Testing Guide - 検証手順](./TESTING_GUIDE.md)
3. [Best Practices Guide - 再発防止](./BEST_PRACTICES_GUIDE.md)

### シナリオ3: 新機能開発プロジェクト

**企画・設計フェーズ**:
1. [Technical Report - 現状分析](./TECHNICAL_REPORT.md)
2. [Wall-Bounce System - アーキテクチャ制約](./WALL_BOUNCE_SYSTEM.md)
3. [Best Practices Guide - 設計原則](./BEST_PRACTICES_GUIDE.md#アーキテクチャ設計原則)

**実装フェーズ**:
1. [Development Guide - 開発プロセス](./DEVELOPMENT_GUIDE.md)
2. [API Reference - インターフェース設計](./API_REFERENCE.md)
3. [MCP Integration - 統合パターン](./MCP_INTEGRATION.md)

**テスト・リリースフェーズ**:
1. [Testing Guide - テスト戦略](./TESTING_GUIDE.md)
2. [Deployment Guide - デプロイ手順](./DEPLOYMENT_GUIDE.md)
3. [Team Manual - 運用引き継ぎ](./TEAM_MANUAL.md)

---

## 🔄 ドキュメント保守・更新

### 更新スケジュール

**週次更新**:
- [Team Manual](./TEAM_MANUAL.md) - 運用手順・チェックリスト
- [Monitoring Operations](./MONITORING_OPERATIONS.md) - メトリクス・アラート設定

**月次更新**:
- [Best Practices Guide](./BEST_PRACTICES_GUIDE.md) - 新しい知見・改善
- [Technical Report](./TECHNICAL_REPORT.md) - パフォーマンス・コスト分析
- [Development Guide](./DEVELOPMENT_GUIDE.md) - ツール・プロセス改善

**リリース時更新**:
- [API Reference](./API_REFERENCE.md) - API変更・追加
- [Wall-Bounce System](./WALL_BOUNCE_SYSTEM.md) - アーキテクチャ変更
- [MCP Integration](./MCP_INTEGRATION.md) - 統合機能変更

**四半期更新**:
- [SRP Migration Guide](./SRP_MIGRATION_COMPLETE_GUIDE.md) - 新フェーズ・事例追加
- 全ドキュメント - 包括的レビュー・改善

### 品質管理

**レビュープロセス**:
1. 著者による初稿作成
2. 技術リードによるレビュー
3. 対象チームによる実用性確認
4. プロジェクトマネージャーによる最終承認

**品質基準**:
- **正確性**: 技術的内容の検証・テスト済み
- **完全性**: 必要情報の網羅・十分性
- **実用性**: 実際の業務での使いやすさ
- **一貫性**: 用語・フォーマットの統一

---

## 📞 ドキュメント関連問い合わせ

### 即座対応（Slack）
- **一般的質問**: #techsapo-docs
- **技術的詳細**: #techsapo-development
- **運用手順**: #techsapo-operations

### 詳細調査・改善提案
- **GitHub Issues**: /techsapo/issues
- **ドキュメント改善要求**: Label: `documentation`
- **新ドキュメント提案**: Label: `enhancement`

### 責任者
- **技術文書**: Claude Code (Technical Lead)
- **運用文書**: 運用チームリード
- **全体統括**: プロジェクトマネージャー

---

## ✅ ドキュメント利用チェックリスト

### 新規参加者向け
```
□ Team Manual - システム概要理解
□ Development Guide - 環境構築完了
□ 関連技術文書 - 必要分野の学習
□ 実際の作業 - メンター同伴実践
□ フィードバック - 理解度・改善点共有
```

### プロジェクト開始時
```
□ 関連アーキテクチャ文書 - 制約・パターン確認
□ Best Practices Guide - 設計原則適用
□ API Reference - インターフェース設計
□ Testing Guide - 品質保証計画
□ Deployment Guide - リリース計画
```

### 運用・保守時
```
□ Monitoring Operations - 監視設定確認
□ Team Manual - 定期タスク実行
□ Best Practices Guide - 最適化実施
□ Technical Report - 傾向分析・改善
□ SRP Migration Guide - 事例参考
```

---

---

## 📝 v1.1 更新内容 (2025-10-07)

### 新規追加文書
1. **[Environment Setup Guide](./ENVIRONMENT_SETUP.md)**
   - 環境構築の完全ガイド (dotenv/AWS Secrets Manager/hybrid)
   - 開発・本番環境の詳細設定
   - systemd、Redis、ポート設定など

2. **[LLM Providers Guide](./LLM_PROVIDERS_GUIDE.md)**
   - LLMプロバイダー統合の詳細ガイド
   - Codex/Gemini/Qwen3/Claude 完全リファレンス
   - CLI使用方法、ヘルスチェック、コスト最適化
   - ⭐ **GPT-5 Codex Prompting Best Practices** (OpenAI Cookbook準拠)
     - "Less is More" 原則
     - 具体例とアンチパターン
     - アダプティブリーズニング活用法

3. **[Troubleshooting Guide](./TROUBLESHOOTING.md)** (大幅更新)
   - クイックリファレンス追加
   - Redis/MCP/Wall-bounce/Gemini/Codex 問題解決
   - 環境変数・ポート競合対応

4. **[Quick Start Guide](./QUICK_START_GUIDE.md)** (新規作成)
   - 初回セットアップ完全ガイド (45-60分)
   - ステップバイステップ手順
   - 最初の壁打ち実行
   - 開発ワークフロー

5. **[GPT-5 Codex Verification Report](./GPT5_CODEX_VERIFICATION.md)** (新規作成)
   - GPT-5 Codex モデル検証レポート
   - 設定検証・実行テスト結果
   - Reasoning Effort 設定の正当性確認
   - 適応推論（Adaptive Reasoning）の詳細説明

### CLAUDE.md リファクタリング
- 詳細情報を専門ガイドへ移動
- 簡潔でナビゲーション重視の構成に変更
- 親ディレクトリ `/ai/prj/CLAUDE.md` も更新
- GPT-5 Codex プロンプティング原則追加

---

## 📝 v1.2 更新内容 (2025-10-07)

### 新規追加文書
1. **[GPT-5 Codex Verification Report](./GPT5_CODEX_VERIFICATION.md)**
   - GPT-5 Codex モデルの動作検証レポート
   - 設定検証: `llm-providers.json` の正当性確認
   - 実行テスト: 基本応答・コーディング能力の検証
   - ⭐ **Reasoning Effort 設定の正当性確認**:
     - `reasoning effort: none` が GPT-5 Codex で正しい理由
     - 適応推論（Adaptive Reasoning）の詳細説明
     - GPT-5 (標準) vs GPT-5 Codex の推論制御の違い
   - ドキュメント整合性チェック（19文書すべて検証済み）

2. **[GPT-5 vs GPT-5 Codex 実証結果](./GPT5_VS_GPT5_CODEX_実証結果.md)** ⭐ NEW
   - 実際のLLM問い合わせによる自動使い分けの実証
   - コーディングタスク → GPT-5 Codex が自動選択されることを確認
   - 分析タスク → GPT-5 (標準) が自動選択されることを確認
   - Reasoning effort の動作の違い（詳細 thinking vs ミニマル）
   - 自動ルーティングロジックの解明
   - Wall-Bounce APIでの実践的な使い分け方法

### v1.1 からの改善点
- GPT-5 Codex の動作検証を実施し、本番環境での利用準備完了
- Reasoning effort 設定に関する誤解を解消する詳細説明を追加
- 適応推論（Adaptive Reasoning）の仕組みを文書化
- ⭐ **実際のLLM問い合わせによる使い分けを実証** (ユーザー要求に対応)
- 総文書数: 18文書 → 20文書に拡張

---

## 📝 v1.3 更新内容 (2025-10-07)

### 新規追加文書
1. **[GPT-5 vs GPT-5 Codex 実証結果](./GPT5_VS_GPT5_CODEX_実証結果.md)** ⭐ NEW
   - ユーザー要求「実際に自動的に使い分けができていることを確認して」に対応
   - **実証1**: コーディングタスク → GPT-5 Codex 自動選択
     - `codex exec --model gpt-5-codex "Write TypeScript email validator"`
     - Model: `gpt-5-codex`, Reasoning: adaptive (minimal thinking)
   - **実証2**: 分析タスク → GPT-5 (標準) 自動選択
     - `codex exec --model gpt-5 "Analyze security implications..."`
     - Model: `gpt-5`, Reasoning: extensive multi-stage thinking
   - **発見**: Reasoning effort "none" の動作の違い
     - GPT-5: 詳細な thinking ブロック (Structuring, Analyzing, Summarizing)
     - GPT-5 Codex: ミニマル thinking ("Drafting...")
   - 自動ルーティングロジックの解明 (`llm-providers.json` capabilities ベース)

### v1.2 からの改善点
- ✅ **実LLM問い合わせによる使い分け実証完了** (ユーザー要求対応)
- ✅ Reasoning effort の動作の違いを実測
- ✅ 設定ファイル (`llm-providers.json`) と実動作の整合性確認
- ✅ Wall-Bounce API での使い分けパターン文書化
- 総文書数: 19文書 → 20文書

---

## 📝 v1.4 更新内容 (2025-10-12)

### 新規追加文書
1. **[LINE Notification System](./LINE_NOTIFICATION_SYSTEM.md)** ⭐ NEW
   - LINE通知システムのインフラ・運用ガイド
   - line-notification.com アーキテクチャ詳細
   - Push Message API 完全リファレンス
   - VM監視スクリプトとの統合方法
   - トラブルシューティング・サービス管理手順

### CLAUDE.md リファクタリング (継続)
- LINE通知関連内容を専用ドキュメントに分離
- CLAUDE.md をさらに簡潔化
- 適切なドキュメントへのリンク追加

### インフラ改善
- VM監視スクリプト (`vm-monitor.sh`) の URL修正完了
- Nginx 設定更新 (`/api/notify` エンドポイント追加)
- LINE通知の実動作確認完了

### v1.3 からの改善点
- ✅ **LINE通知システム完全文書化**
- ✅ インフラ監視の自動通知機能追加
- ✅ 運用ドキュメントの充実化
- 総文書数: 20文書 → 21文書

---

## 📝 v1.5 更新内容 (2025-10-12)

### 新規追加文書
1. **[Operational Scripts Guide](./OPERATIONAL_SCRIPTS.md)** ⭐ NEW
   - 運用スクリプトの完全リファレンス
   - 監視・メンテナンススクリプト (`vm-monitor.sh`) 詳細
   - デプロイ・本番運用スクリプト一覧
   - 開発・テストスクリプト
   - MCPサービス管理
   - スクリプト開発ガイドライン・ベストプラクティス

### CLAUDE.md スリム化 (継続)
- 運用スクリプト詳細を専用ドキュメントに分離
- テストフレームワーク詳細を簡潔化
- CLAUDE.md を 290行 → 270行に削減 (20行削減)
- 適切なドキュメントへのリンク追加

### v1.4 からの改善点
- ✅ **運用スクリプト完全文書化**
- ✅ CLAUDE.md のさらなる簡潔化達成
- ✅ Single Responsibility Principle をドキュメントにも適用
- 総文書数: 21文書 → 22文書

**索引作成者**: Claude Code Technical Documentation Team
**最終レビュー**: 2025-10-12
**次回更新予定**: 2025-11-12
**バージョン管理**: Git tag v1.5-operational-scripts

**📖 Happy Documentation Reading! 🚀**