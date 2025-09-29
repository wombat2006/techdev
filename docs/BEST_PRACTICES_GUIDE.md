# TechSapo ベストプラクティスガイド
## Multi-LLM Wall-bounce システム運用の成功パターン

### 📖 このガイドについて
TechSapo プロジェクトで実証された、Multi-LLM Wall-bounce システムの運用における黄金律とベストプラクティスを体系化したものです。50倍トラフィック拡張の成功実績に基づいています。

---

## 🏗️ アーキテクチャ設計原則

### 1. Single Responsibility Principle (SRP)
```
✅ DO: 各サービスは単一の責任を持つ
❌ DON'T: モノリシックな巨大サービス

例：
- Wall-bounce Analyzer: LLM間調整のみ
- Consensus Engine: 合意形成のみ
- Session Manager: セッション管理のみ
```

### 2. Provider Diversity (プロバイダー多様性)
```
✅ DO: 最低2社、理想的には3社以上のLLM
❌ DON'T: 単一プロバイダーへの依存

推奨構成：
- Primary: Gemini 2.5 Pro (高速・コスト効率)
- Secondary: GPT-5 Codex (高品質・技術特化)
- Fallback: Claude Code Direct (即座応答)
```

### 3. Gradual Migration (段階的移行)
```
✅ DO: 小刻みな段階的移行
❌ DON'T: 一気に100%移行

成功パターン: 1% → 2% → 10% → 20% → 35% → 50%
各段階で十分な検証期間を確保
```

---

## ⚙️ 設定管理ベストプラクティス

### 環境変数の階層化
```bash
# レベル1: 基本設定
USE_SRP_WALL_BOUNCE=true
SRP_TRAFFIC_PERCENTAGE=50

# レベル2: 品質管理
SRP_ERROR_RATE_THRESHOLD=0.015
CONSENSUS_CONFIDENCE_MIN=0.7

# レベル3: 自動制御
AUTO_ROLLBACK_ERROR_RATE=0.03
AUTO_ROLLBACK_LATENCY_MS=10000
```

### フェーズ別設定戦略
```bash
# 保守的フェーズ (1-10%)
AUTO_ROLLBACK_ERROR_RATE=0.008  # 厳格
SRP_ERROR_RATE_THRESHOLD=0.002  # 超厳格

# 成長フェーズ (10-35%)
AUTO_ROLLBACK_ERROR_RATE=0.015  # 緩和
SRP_ERROR_RATE_THRESHOLD=0.005  # 緩和

# 成熟フェーズ (35%+)
AUTO_ROLLBACK_ERROR_RATE=0.03   # プロダクション
SRP_ERROR_RATE_THRESHOLD=0.015  # バランス
```

---

## 🎯 コンセンサス品質管理

### 品質指標の定義
```typescript
interface QualityMetrics {
  confidence: number;    // ≥ 0.7 (70%)
  agreement: number;     // ≥ 0.6 (60%)
  coherence: number;     // ≥ 0.8 (80%)
  relevance: number;     // ≥ 0.9 (90%)
}
```

### プロバイダー選択戦略
```typescript
// タスクタイプ別最適化
const providerSelection = {
  'basic': ['Gemini', 'Claude'],           // 高速処理
  'premium': ['GPT-5', 'Gemini'],          // 高品質
  'critical': ['GPT-5', 'Claude', 'Gemini'] // 最高品質
};
```

### 合意形成アルゴリズム
```typescript
function buildConsensus(results: ProviderResult[]): ConsensusResult {
  // 1. セマンティック類似度計算
  const similarity = calculateSimilarity(results);

  // 2. 重み付け評価 (プロバイダー特性考慮)
  const weighted = applyProviderWeights(results);

  // 3. 信頼度算出
  const confidence = computeConfidence(similarity, weighted);

  return { confidence, reasoning: generateReasoning(results) };
}
```

---

## 📊 監視・メトリクス戦略

### 必須監視項目
```yaml
Critical Metrics:
  - srp_traffic_percentage: 目標値
  - consensus_confidence_avg: ≥ 0.7
  - error_rate_total: ≤ 0.03
  - response_latency_p95: ≤ 10s

Performance Metrics:
  - memory_usage_mb: ≤ 1024
  - cpu_usage_percent: ≤ 80
  - concurrent_requests: 監視のみ
  - provider_availability: ≥ 0.99

Business Metrics:
  - cost_per_request: 最適化目標
  - user_satisfaction: ≥ 4.5/5
  - feature_adoption_rate: 追跡
```

### アラート階層
```yaml
Level 1 - Warning (5分):
  - Consensus confidence < 0.8
  - Response latency > 5s
  - Memory usage > 800MB

Level 2 - Critical (1分):
  - Error rate > 2%
  - Consensus confidence < 0.7
  - Memory usage > 1000MB

Level 3 - Emergency (即時):
  - Error rate > 3% (Auto-rollback trigger)
  - System crash
  - All providers down
```

---

## 🔧 運用プロセス

### デプロイメント手順
```bash
# 1. 事前検証
npm test
npm run lint
npm run build

# 2. バックアップ作成
tar -czf backup-$(date +%Y%m%d).tar.gz .

# 3. 段階的デプロイ
# Stage 1: 設定更新
echo "SRP_TRAFFIC_PERCENTAGE=2" >> .env

# Stage 2: サービス再起動
systemctl restart techsapo

# Stage 3: 監視開始
tail -f logs/app.log | grep "consensus_confidence"

# Stage 4: 検証完了後、次段階へ
```

### ロールバック手順
```bash
# 緊急ロールバック (30秒以内)
echo "USE_SRP_WALL_BOUNCE=false" >> .env
systemctl restart techsapo

# 段階的ロールバック
echo "SRP_TRAFFIC_PERCENTAGE=1" >> .env
systemctl restart techsapo

# 設定復旧
cp .env.backup .env
systemctl restart techsapo
```

### 定期メンテナンス
```bash
#!/bin/bash
# 週次メンテナンススクリプト

# 1. ログローテーション
find logs/ -name "*.log" -mtime +7 -delete

# 2. キャッシュクリーン
npm cache clean --force
redis-cli FLUSHDB 1  # 開発用キャッシュのみ

# 3. パフォーマンス分析
node scripts/performance-analysis.js

# 4. セキュリティチェック
npm audit
```

---

## 💰 コスト最適化戦略

### プロバイダー別コスト特性
```
Gemini 2.5 Pro:
  - Input: $0.00125 per 1K tokens
  - Output: $0.005 per 1K tokens
  - 特徴: 高頻度リクエストに最適

GPT-5 Codex:
  - 推定コスト: 高め
  - 特徴: 高品質が必要な場合のみ使用

Claude Code Direct:
  - コスト: 無料 (内蔵)
  - 特徴: フォールバック専用
```

### コスト効率化パターン
```typescript
// 1. Dynamic Provider Selection
function selectCostOptimalProvider(taskType: string, budget: number) {
  if (taskType === 'basic' && budget < 0.01) {
    return ['Gemini'];  // 低コスト
  }
  if (taskType === 'critical') {
    return ['GPT-5', 'Gemini'];  // 品質優先
  }
  return ['Gemini', 'Claude'];  // バランス
}

// 2. Intelligent Caching
const cache = {
  similar_queries: new Map(),  // 類似クエリキャッシュ
  provider_results: new Map(), // プロバイダー結果キャッシュ
  consensus_cache: new Map()   // コンセンサス結果キャッシュ
};
```

---

## 🛡️ セキュリティ・プライバシー

### API Key管理
```bash
# ✅ DO: 環境変数での管理
export GOOGLE_API_KEY="..."
export OPENAI_API_KEY="..."

# ❌ DON'T: ハードコーディング
const apiKey = "sk-...";  // 絶対NG
```

### データ保護
```typescript
// センシティブデータのマスキング
function sanitizeForLogging(data: any): any {
  return {
    ...data,
    api_key: '[REDACTED]',
    user_tokens: '[REDACTED]',
    personal_info: '[REDACTED]'
  };
}

// プロバイダー間でのデータ分離
class ProviderIsolation {
  async callProvider(provider: string, query: string) {
    // クエリの匿名化
    const anonymized = this.anonymizeQuery(query);
    return this.providers[provider].call(anonymized);
  }
}
```

---

## 🧪 テスト戦略

### ユニットテスト
```typescript
// Wall-bounce Analyzer テスト
describe('WallBounceAnalyzer', () => {
  test('should achieve >70% consensus confidence', async () => {
    const result = await analyzer.analyze('test prompt');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  test('should handle provider failures gracefully', async () => {
    mockProvider.mockRejectedValueOnce(new Error('API Error'));
    const result = await analyzer.analyze('test prompt');
    expect(result).toBeDefined();
  });
});
```

### 統合テスト
```typescript
// End-to-End テスト
describe('SRP Migration E2E', () => {
  test('should process requests with 50% SRP traffic', async () => {
    // 100リクエスト送信
    const responses = await Promise.all(
      Array(100).fill(0).map(() =>
        request(app).post('/api/v1/generate').send({prompt: 'test'})
      )
    );

    // SRP処理率を確認
    const srpProcessed = responses.filter(r => r.body.srp_processed);
    expect(srpProcessed.length).toBeCloseTo(50, 5);
  });
});
```

### 負荷テスト
```bash
# k6による負荷テスト
k6 run --vus 10 --duration 30s load-test.js

# 期待値:
# - 95%ile response time < 10s
# - Error rate < 1%
# - Consensus confidence > 70%
```

---

## 🔍 トラブルシューティング

### よくある問題と解決策

#### 1. コンセンサス品質の低下
```
症状: consensus_confidence < 0.7
原因: プロバイダー間の応答品質差
解決: プロバイダー重み調整、タイムアウト延長
```

#### 2. レスポンス遅延
```
症状: response_time > 10s
原因: プロバイダーAPI遅延、並行処理不足
解決: タイムアウト最適化、プロバイダー選択見直し
```

#### 3. メモリリーク
```
症状: memory_usage 増加傾向
原因: キャッシュ溢れ、未解放オブジェクト
解決: GC最適化、キャッシュサイズ制限
```

#### 4. コスト急増
```
症状: cost_per_request 増加
原因: 高コストプロバイダー多用
解決: プロバイダー選択ロジック見直し
```

### デバッグ手順
```bash
# 1. ログ確認
tail -f logs/app.log | grep ERROR

# 2. メトリクス確認
curl http://localhost:4000/metrics

# 3. プロバイダー個別テスト
node debug/test-provider.js --provider=gemini

# 4. コンセンサスエンジンテスト
node debug/test-consensus.js --verbose
```

---

## 📈 スケーリング戦略

### 垂直スケーリング
```bash
# メモリ増量
NODE_OPTIONS='--max-old-space-size=2048 --expose-gc'

# CPU最適化
NODE_OPTIONS='--max-old-space-size=1024 --optimize-for-size'
```

### 水平スケーリング
```yaml
# Docker Compose例
version: '3'
services:
  techsapo-1:
    image: techsapo:latest
    environment:
      - SRP_INSTANCE_ID=1
  techsapo-2:
    image: techsapo:latest
    environment:
      - SRP_INSTANCE_ID=2

  load-balancer:
    image: nginx:alpine
    depends_on: [techsapo-1, techsapo-2]
```

### プロバイダー分散
```typescript
// 地理的分散
const providerEndpoints = {
  'gemini-us': 'https://generativelanguage.googleapis.com',
  'gemini-eu': 'https://eu-generativelanguage.googleapis.com',
  'gpt-azure': 'https://your-resource.openai.azure.com'
};

// レイテンシベース選択
function selectOptimalEndpoint(userRegion: string): string {
  return latencyMap[userRegion].fastest;
}
```

---

## 🎓 学習・改善プロセス

### 継続的改善サイクル
```
1. 監視データ収集 (24時間)
   ↓
2. パフォーマンス分析 (週次)
   ↓
3. ボトルネック特定 (月次)
   ↓
4. 改善策実装 (四半期)
   ↓
5. A/Bテスト実施 (継続)
```

### 知識蓄積
```typescript
// 成功パターンの記録
interface SuccessPattern {
  scenario: string;
  config: ConfigSnapshot;
  metrics: PerformanceMetrics;
  lessons: string[];
}

// 失敗事例の学習
interface FailureCase {
  trigger: string;
  impact: string;
  resolution: string;
  prevention: string[];
}
```

---

## 🏆 成功指標 (KPI)

### 技術的KPI
- **可用性**: 99.9%以上
- **コンセンサス品質**: 85%以上
- **レスポンス時間**: P95 < 10秒
- **エラー率**: < 1%

### ビジネスKPI
- **ユーザー満足度**: 4.5/5以上
- **コスト効率**: 従来比70%削減
- **機能採用率**: 80%以上
- **チーム生産性**: 30%向上

---

## 📚 関連リソース

### 内部ドキュメント
- [SRP Migration Complete Guide](./SRP_MIGRATION_COMPLETE_GUIDE.md)
- [Wall-Bounce System](./WALL_BOUNCE_SYSTEM.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)

### 外部リファレンス
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [OpenAI API Best Practices](https://platform.openai.com/docs/guides/best-practices)
- [Redis Performance Tuning](https://redis.io/docs/manual/performance/)

---

**最終更新**: 2025-09-27
**バージョン**: 1.0
**ステータス**: Phase 3F (50%) 運用実績ベース