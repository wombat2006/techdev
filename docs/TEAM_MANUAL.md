# TechSapo チーム運用マニュアル
## Multi-LLM Wall-bounce システム 運用・保守ガイド

**対象者**: 開発・運用・QAチーム
**システム**: TechSapo SRP Migration (Phase 3F - 50% Production)
**最終更新**: 2025-09-27

---

## 🎯 このマニュアルについて

TechSapoの Multi-LLM Wall-bounce システムの日常運用、保守、トラブルシューティングを担当するチームメンバー向けの実践的ガイドです。

### 想定読者
- **開発者**: 新機能開発・バグ修正
- **運用エンジニア**: 日常監視・メンテナンス
- **QAエンジニア**: テスト・品質保証
- **プロジェクトマネージャー**: 進捗管理・意思決定

---

## 🚀 システム概要（5分で理解）

### TechSapoとは
複数のLLM（Large Language Model）を統合し、コンセンサス（合意）ベースで高品質な応答を生成するシステム

### 主要コンポーネント
```
ユーザーリクエスト
    ↓
TechSapo Core サーバー
    ↓
Wall-bounce Analyzer（壁打ち分析）
    ↓
┌─────────────┬─────────────┐
│ Gemini 2.5  │ GPT-5 Codex │
│ Pro (Google)│ (MCP経由)   │
└─────────────┴─────────────┘
    ↓
Consensus Engine（合意形成）
    ↓
品質検証済み応答
```

### 現在の設定値
- **SRP Traffic**: 50% (Phase 3F)
- **Error Threshold**: 3%
- **Memory Limit**: 1024MB
- **Consensus Quality**: 84.4% 平均

---

## 🛠️ 日常運用タスク

### 毎日のチェックリスト

#### 朝の健康チェック（AM 9:00）
```bash
# 1. サーバー状態確認
curl http://localhost:4000/health
# 期待値: {"status": "healthy", "uptime": "XXXs"}

# 2. メモリ使用量確認
ps aux | grep "node dist/server.js"
# 期待値: <150MB

# 3. エラーログ確認
tail -50 logs/app-error.log
# 期待値: 新しいERRORログなし

# 4. SRPトラフィック確認
grep "srp_traffic" logs/app.log | tail -5
# 期待値: 50%前後
```

#### 夕方の品質チェック（PM 6:00）
```bash
# 1. コンセンサス品質確認
grep "consensus_confidence" logs/app.log | tail -10
# 期待値: >0.7 (70%)

# 2. プロバイダー応答時間確認
grep "provider_latency" logs/app.log | tail -10
# 期待値: Gemini <120s, GPT-5 <300s

# 3. Redis接続確認
redis-cli -u $UPSTASH_REDIS_URL ping
# 期待値: PONG
```

### 週次メンテナンス（毎週金曜 PM 8:00）

```bash
#!/bin/bash
# weekly-maintenance.sh

echo "=== 週次メンテナンス開始 ==="

# 1. ログローテーション
find logs/ -name "*.log" -mtime +7 -delete
echo "古いログファイルを削除しました"

# 2. npm キャッシュクリーン
npm cache clean --force
echo "npmキャッシュをクリーンしました"

# 3. Git最適化
git gc --auto
echo "Gitリポジトリを最適化しました"

# 4. ディスク使用量確認
df -h /
echo "ディスク使用量を確認してください"

# 5. パフォーマンス分析レポート生成
node scripts/performance-analysis.js > reports/weekly-$(date +%Y%m%d).txt
echo "週次パフォーマンスレポートを生成しました"
```

---

## 📊 監視・アラート対応

### 重要な監視メトリクス

| メトリクス | 正常範囲 | 警告閾値 | 緊急閾値 | 対応アクション |
|------------|----------|----------|----------|----------------|
| SRP Traffic % | 45-55% | <40%, >60% | <20%, >70% | 設定見直し |
| Error Rate | <1% | 1-2% | >3% | 自動ロールバック |
| Memory Usage | <150MB | 150-200MB | >250MB | 再起動検討 |
| Consensus Quality | >80% | 70-80% | <70% | プロバイダー調査 |
| Response Latency | <180s | 180-300s | >300s | プロバイダー確認 |

### アラート対応フロー

#### Level 1: Warning（警告）
```bash
# 1. 状況確認
curl http://localhost:4000/health
tail -20 logs/app-error.log

# 2. 簡易対処
# メモリ警告の場合
echo "Manual GC trigger"
# → GCは自動実行中

# 3. 15分後再確認
# 改善しない場合はLevel 2へ
```

#### Level 2: Critical（重要）
```bash
# 1. 詳細調査
journalctl -u techsapo -n 50
ps aux | grep node

# 2. ソフト再起動
# 現在実行中のプロセスを確認
sudo systemctl restart techsapo

# 3. 5分後確認
curl http://localhost:4000/health
```

#### Level 3: Emergency（緊急）
```bash
# 緊急ロールバック実行
echo "USE_SRP_WALL_BOUNCE=false" >> .env
sudo systemctl restart techsapo

# エスカレーション
# → 開発チームリード、プロジェクトマネージャーに即座連絡
```

---

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. "コンセンサス品質が低い" (confidence < 0.7)
```bash
# 症状確認
grep "consensus_confidence.*0\.[0-6]" logs/app.log

# 原因調査
# 1. プロバイダー応答時間確認
grep "provider_latency" logs/app.log | tail -10

# 2. プロバイダーエラー確認
grep "provider_error" logs/app.log | tail -10

# 解決策
# A. プロバイダー選択見直し
# B. タイムアウト設定調整
# C. 一時的なプロバイダー除外
```

#### 2. "メモリ使用量が増加傾向"
```bash
# 症状確認
ps aux | grep "node dist/server.js" | awk '{print $6}'

# 原因調査
# 1. セッション数確認
redis-cli -u $UPSTASH_REDIS_URL dbsize

# 2. 長時間実行セッション確認
redis-cli -u $UPSTASH_REDIS_URL keys "session:*"

# 解決策
# A. 手動GC実行（自動実行中）
# B. セッションTTL見直し
# C. Redis接続数制限確認
```

#### 3. "プロバイダー応答が遅い"
```bash
# 症状確認
grep "provider_latency.*[3-9][0-9][0-9]" logs/app.log

# 原因調査
# 1. ネットワーク確認
ping 8.8.8.8
curl -w "%{time_total}" https://generativelanguage.googleapis.com

# 2. API制限確認
# → Google Cloud Console, OpenAI Dashboard確認

# 解決策
# A. プロバイダー重み調整
# B. タイムアウト設定見直し
# C. 代替プロバイダー活用
```

#### 4. "Redis接続エラー"
```bash
# 症状確認
grep "Redis.*error" logs/app-error.log

# 原因調査
redis-cli -u $UPSTASH_REDIS_URL ping

# 解決策
# A. Upstash ダッシュボード確認
# B. 接続情報更新
# C. サービス再起動
sudo systemctl restart techsapo
```

---

## ⚙️ 設定変更手順

### SRP トラフィック調整

#### 増加手順（例: 50% → 60%）
```bash
# 1. 現在の設定バックアップ
cp .env .env.backup-$(date +%Y%m%d)

# 2. 段階的増加（5%ずつ推奨）
echo "SRP_TRAFFIC_PERCENTAGE=55" >> .env

# 3. サービス再起動
sudo systemctl restart techsapo

# 4. 30分間監視
watch -n 60 'curl -s http://localhost:4000/health | jq'

# 5. 問題なければ次段階
echo "SRP_TRAFFIC_PERCENTAGE=60" >> .env
sudo systemctl restart techsapo
```

#### 緊急減少手順
```bash
# 即座実行
echo "SRP_TRAFFIC_PERCENTAGE=35" >> .env
sudo systemctl restart techsapo

# または完全停止
echo "USE_SRP_WALL_BOUNCE=false" >> .env
sudo systemctl restart techsapo
```

### プロバイダー設定調整

```bash
# Gemini重み増加（高速化重視）
echo "GEMINI_WEIGHT=0.6" >> .env
echo "GPT5_WEIGHT=0.4" >> .env

# GPT-5重み増加（品質重視）
echo "GEMINI_WEIGHT=0.3" >> .env
echo "GPT5_WEIGHT=0.7" >> .env

# 変更適用
sudo systemctl restart techsapo
```

---

## 🧪 テスト・QA手順

### 機能テスト

#### API動作確認
```bash
# 基本ヘルスチェック
curl -X GET http://localhost:4000/health

# Wall-bounce機能テスト
curl -X POST http://localhost:4000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, test message", "task_type": "basic"}'

# 期待値:
# - HTTP 200
# - consensus.confidence > 0.7
# - providers_used に2つ以上のプロバイダー
```

#### コンセンサス品質テスト
```bash
# 5回連続テスト実行
for i in {1..5}; do
  echo "Test $i:"
  curl -s -X POST http://localhost:4000/api/v1/generate \
    -H "Content-Type: application/json" \
    -d '{"prompt": "Explain quantum computing", "task_type": "premium"}' \
    | jq '.consensus.confidence'
done

# 期待値: 全て > 0.7
```

### 負荷テスト

```bash
# 軽負荷テスト（5並列×10分）
npm run test:load:light

# 期待値:
# - Error rate: 0%
# - Average response time: <180s
# - Memory usage: <200MB
```

### 品質保証チェックリスト

- [ ] 全APIエンドポイントが正常応答
- [ ] エラーログに新しいERRORなし
- [ ] メモリ使用量が安定（±10MB以内）
- [ ] コンセンサス品質 >70%維持
- [ ] 全プロバイダーが応答
- [ ] Redis接続が安定
- [ ] ログファイルが適切にローテーション

---

## 📁 ファイル・ディレクトリ構成

### 重要ファイル

```
/ai/prj/techsapo/
├── .env                          # 環境設定（機密）
├── src/
│   ├── server.ts                 # メインサーバー
│   ├── config/environment.ts     # 設定管理
│   ├── services/
│   │   ├── wall-bounce-analyzer.ts      # Wall-bounce実装
│   │   ├── consensus-engine.ts          # コンセンサス構築
│   │   ├── redis-service.ts             # Redis操作
│   │   └── codex-mcp-wrapper.ts         # MCP統合
│   └── routes/
│       └── it-unified.ts         # API ルーティング
├── logs/
│   ├── app.log                   # アプリケーションログ
│   ├── app-error.log             # エラーログ
│   └── access.log                # アクセスログ
├── docs/                         # ドキュメント類
└── scripts/                      # 運用スクリプト
```

### ログファイルの見方

#### app.log（情報ログ）
```bash
# SRPトラフィック確認
grep "srp_traffic_percentage" logs/app.log

# コンセンサス品質確認
grep "consensus_confidence" logs/app.log

# プロバイダー応答時間
grep "provider_latency" logs/app.log
```

#### app-error.log（エラーログ）
```bash
# エラー件数確認
wc -l logs/app-error.log

# 最新エラー確認
tail -20 logs/app-error.log

# 特定エラー検索
grep "Redis" logs/app-error.log
grep "MCP" logs/app-error.log
```

---

## 👥 チーム役割・責任

### 開発チーム
**責任範囲**:
- 新機能開発・実装
- バグ修正・コード改善
- パフォーマンス最適化
- セキュリティ強化

**日常タスク**:
- PRレビュー
- ユニットテスト作成
- ドキュメント更新
- 技術調査

### 運用チーム
**責任範囲**:
- 日常監視・保守
- アラート対応
- 定期メンテナンス
- 設定変更実施

**日常タスク**:
- 朝・夕の健康チェック
- 週次メンテナンス実行
- トラブル一次対応
- 監視データ分析

### QAチーム
**責任範囲**:
- 機能テスト実施
- 品質保証・検証
- リグレッションテスト
- ユーザー受け入れテスト

**日常タスク**:
- 機能テスト実行
- バグレポート作成
- テストケース更新
- 品質レポート作成

### プロジェクトマネージャー
**責任範囲**:
- 進捗管理・調整
- ステークホルダー報告
- リスク管理
- 意思決定

**日常タスク**:
- 状況確認・レポート
- チーム調整・サポート
- ビジネス要件整理
- 予算・スケジュール管理

---

## 📞 エスカレーション・連絡先

### Level 1: 情報共有・質問
**Slack**: #techsapo-operations
**対象**: 日常の質問、状況共有

### Level 2: 問題・調査要請
**Slack**: #techsapo-alerts
**対象**: 異常検知、調査依頼

### Level 3: 緊急事態
**連絡方法**: 電話・SMS・Slack（@all）
**対象**: システム障害、自動ロールバック

### キーパーソン

| 役割 | 担当者 | 連絡方法 | 対応時間 |
|------|-------|----------|----------|
| 技術リード | Claude Code | Slack DM | 24/7 |
| 運用リード | （チーム依存） | Slack/Phone | 平日9-18時 |
| プロジェクトマネージャー | （チーム依存） | Email/Slack | 平日9-18時 |
| セキュリティ責任者 | （チーム依存） | Phone/Slack | 緊急時のみ |

---

## 📋 運用チェックシート

### 日次運用チェック

```
□ AM サーバー健康状態確認
□ AM エラーログ確認（0件確認）
□ AM メモリ使用量確認（<150MB）
□ PM コンセンサス品質確認（>70%）
□ PM SRPトラフィック確認（~50%）
□ PM プロバイダー応答時間確認
□ Slack #techsapo-operations に日次レポート投稿
```

### 週次運用チェック

```
□ ログローテーション実行
□ キャッシュクリーニング実行
□ パフォーマンス分析レポート生成
□ ディスク使用量確認・対処
□ セキュリティ更新確認
□ バックアップ状況確認
□ 週次運用レポート作成・共有
```

### 月次運用チェック

```
□ 設定値見直し・最適化
□ パフォーマンス傾向分析
□ コスト分析・最適化提案
□ セキュリティ監査実施
□ ドキュメント更新
□ チーム運用振り返り・改善
□ 月次運用レポート作成
```

---

## 🎓 学習・スキルアップ

### 必要な技術知識

#### 初級（新メンバー向け）
- **Node.js基礎**: JavaScript/TypeScript, npm, プロセス管理
- **HTTP API**: REST API, JSON, curl操作
- **Linux基礎**: ファイル操作, プロセス確認, ログ確認
- **Git基礎**: clone, commit, push, pull

#### 中級（運用メンバー向け）
- **システム監視**: メトリクス理解, アラート対応
- **データベース**: Redis基礎, Upstash操作
- **ネットワーキング**: API通信, DNS, SSL/TLS
- **セキュリティ**: 環境変数管理, APIキー保護

#### 上級（開発リード向け）
- **LLM統合**: OpenAI API, Google AI API, MCP
- **分散システム**: コンセンサス, 障害処理, スケーリング
- **パフォーマンス**: メモリ管理, 並行処理, 最適化
- **アーキテクチャ**: マイクロサービス, SRP, 設計パターン

### 推奨学習リソース

```markdown
# 社内リソース
- [TechSapo開発ガイド](./DEVELOPMENT_GUIDE.md)
- [Wall-bounce システム詳細](./WALL_BOUNCE_SYSTEM.md)
- [MCP統合ガイド](./MCP_INTEGRATION.md)

# 外部リソース
- Node.js: [Node.js公式ドキュメント](https://nodejs.org/docs/)
- OpenAI API: [OpenAI Platform](https://platform.openai.com/docs)
- Google AI: [AI Studio](https://aistudio.google.com/)
- Redis: [Redis University](https://university.redis.com/)
```

---

## ✅ 運用開始チェックリスト

### 新メンバーオンボーディング

```
□ アカウント・権限設定完了
  □ Slack チャンネル参加
  □ GitHub リポジトリアクセス
  □ サーバーSSHアクセス
  □ 監視ツールアクセス

□ 環境セットアップ完了
  □ 開発環境構築
  □ テスト実行確認
  □ ローカル環境動作確認

□ ドキュメント理解
  □ 本マニュアル完読
  □ システム概要理解
  □ 緊急時対応手順理解

□ 実地研修完了
  □ 先輩メンバーとペア運用
  □ トラブル対応シミュレーション
  □ レビュー・承認取得
```

### 本番運用開始前チェック

```
□ システム状態確認
  □ 全サービス正常稼働
  □ 監視・アラート設定済み
  □ バックアップ設定済み

□ チーム体制確認
  □ 役割・責任明確化
  □ エスカレーション体制確立
  □ 緊急連絡先設定済み

□ ドキュメント整備
  □ 運用手順書最新化
  □ トラブルシューティング完備
  □ 設定情報ドキュメント化

□ 最終承認
  □ 開発チームリード承認
  □ 運用チームリード承認
  □ プロジェクトマネージャー承認
```

---

**作成者**: TechSapo Development Team
**承認者**: Claude Code (Technical Lead)
**次回レビュー**: 2025-10-27
**バージョン**: 1.0

**緊急時連絡**: Slack @channel #techsapo-alerts