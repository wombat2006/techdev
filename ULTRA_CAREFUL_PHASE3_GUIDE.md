# 🛡️ Ultra-Careful Phase 3 Execution Guide

**重要**: この文書は「proceed much carefully」の指示に基づく超慎重アプローチです

---

## 🎯 修正された段階的アプローチ

### 従来計画: 1% → 5% (5倍増)
❌ **リスクが高すぎる** - 一度に5倍のトラフィック増加

### 新しい超慎重計画: 1% → 2% → 5%
✅ **段階的で安全** - 各ステップでの綿密な検証

```
Phase 3A: 1% → 2% (2倍増)     ← まずここから
   ↓ 8-12時間の安定確認後
Phase 3B: 2% → 5% (2.5倍増)   ← 成功後に実行
```

---

## 📋 Phase 3A: 2%移行（第一段階）

### 🚦 実行前チェックリスト

#### ✅ システム健全性確認
```bash
# 1. 現在の1%システムの状態確認
curl http://localhost:4000/health
curl http://localhost:4000/metrics | grep error_rate

# 2. メモリ・CPU使用率確認
free -h
top -p $(pgrep -f "node.*server")

# 3. ログエラー確認（過去1時間）
tail -n 1000 ./logs/app.log | grep -i error | tail -20

# 4. SRP コンポーネント健全性
grep -i "srp\|consensus\|wall-bounce" ./logs/app.log | tail -10
```

#### ✅ 緊急時準備確認
```bash
# 緊急ロールバックスクリプト実行可能確認
ls -la ./scripts/emergency-rollback-phase3.sh
ls -la ./scripts/gradual-phase3-controller.js

# 設定ファイル確認
ls -la .env.phase3-conservative-2percent
grep "SRP_TRAFFIC_PERCENTAGE=2" .env.phase3-conservative-2percent
```

### 🚀 Phase 3A実行手順（2%移行）

#### Step 1: 基準値記録
```bash
echo "=== Phase 3A Pre-execution Baseline ===" > phase3a-baseline.log
date >> phase3a-baseline.log
curl -s http://localhost:4000/metrics >> phase3a-baseline.log
echo "Baseline captured at $(date)" >> phase3a-baseline.log
```

#### Step 2: 2%設定適用
```bash
# ⚠️ CRITICAL: バックアップ作成
cp .env .env.backup-before-phase3a-$(date +%Y%m%d-%H%M%S)

# 2%設定適用
cp .env.phase3-conservative-2percent .env

# 設定確認
echo "New configuration applied:"
grep -E "(SRP_TRAFFIC_PERCENTAGE|USE_SRP_WALL_BOUNCE)" .env
```

#### Step 3: アプリケーション再起動
```bash
# ビルド実行
npm run build

# 慎重な再起動
npm start

# または PM2 使用時
pm2 restart all
pm2 logs --lines 20
```

#### Step 4: 即座の健全性確認
```bash
# 5分間の集中監視
for i in {1..5}; do
  echo "=== Check $i/5 at $(date) ==="
  curl -s http://localhost:4000/health | jq '.success'
  sleep 60
done

# トラフィック分散確認
tail -f ./logs/app.log | grep -i "srp\|traffic\|distribution" --line-buffered
```

### 📊 2%フェーズ監視基準（厳格）

#### 🟢 健全性指標
- **エラー率**: < 0.5% (従来の半分)
- **レイテンシ**: < 3000ms (従来より厳格)
- **メモリ使用**: < 75% (低い閾値)
- **コンセンサス成功**: > 92% (高い基準)

#### 🟡 警告指標
- **エラー率**: 0.5% - 1.0%
- **レイテンシ**: 3000ms - 4500ms
- **メモリ使用**: 75% - 80%
- **コンセンサス成功**: 85% - 92%

#### 🔴 即座ロールバック指標
- **エラー率**: > 2.0%
- **レイテンシ**: > 6000ms
- **メモリ使用**: > 90%
- **コンセンサス成功**: < 80%

### ⏰ Phase 3A成功基準

**最低条件**:
- ✅ 8時間連続での健全性維持
- ✅ エラー率 < 1%を6時間維持
- ✅ レイテンシ増加 < 20%
- ✅ ゼロ件の緊急アラート

**推奨条件** (5%移行前):
- ✅ 12時間連続での安定性
- ✅ エラー率 < 0.8%を維持
- ✅ システムリソース安定
- ✅ 全4 LLMプロバイダー正常

---

## 📋 Phase 3B: 5%移行（第二段階）

**重要**: Phase 3Aが完全に成功した場合のみ実行

### 🚦 Phase 3B実行条件

#### 必須条件
1. **Phase 3A**: 12時間以上の安定稼働
2. **エラー率**: 連続6時間 < 1%
3. **チーム承認**: 明示的な進行許可
4. **システムリソース**: 十分な余裕確認

#### 実行手順（Phase 3Aと同様、ただし5%設定使用）
```bash
# Phase 3B設定適用
cp .env.phase3-5percent .env

# より厳格な監視開始
node ./scripts/monitor-srp-phase3.js &
```

### 📊 5%フェーズ監視基準（最厳格）

#### 🟢 健全性指標（最高基準）
- **エラー率**: < 0.3%
- **レイテンシ**: < 2500ms
- **メモリ使用**: < 65%
- **コンセンサス成功**: > 95%

#### 🔴 即座ロールバック指標（厳格）
- **エラー率**: > 1.5%
- **レイテンシ**: > 5500ms
- **メモリ使用**: > 85%
- **システム異常**: 任意の複数指標異常

---

## 🚨 緊急時対応プロシージャ

### レベル1: 警告（継続監視）
```bash
echo "WARNING: Increased monitoring activated"
# 監視間隔を短縮、追加ログ有効化
```

### レベル2: クリティカル（準備態勢）
```bash
echo "CRITICAL: Rollback preparation initiated"
# ロールバックスクリプト準備、チーム通知
```

### レベル3: 緊急（即座実行）
```bash
echo "EMERGENCY: Executing immediate rollback"
./scripts/emergency-rollback-phase3.sh
```

### 自動ロールバック設定
- 設定ファイルで `AUTO_ROLLBACK_ON_ERROR_SPIKE=true`
- エラー率 > 2%で自動実行
- レイテンシ > 6000msで自動実行
- メモリ使用 > 90%で自動実行

---

## 📞 コミュニケーション計画

### 実行開始時
```
🚀 Phase 3A (2%) starting at [timestamp]
📊 Baseline: [error_rate]% errors, [latency]ms avg
⏰ Evaluation in 2 hours
```

### 2時間後評価
```
📈 Phase 3A 2-hour status:
✅/⚠️/❌ Error rate: [current]%
✅/⚠️/❌ Latency: [current]ms
✅/⚠️/❌ Memory: [current]%
Decision: [CONTINUE/ROLLBACK/EXTEND_MONITORING]
```

### 8時間後判定
```
🎯 Phase 3A completion assessment:
[SUCCESS/PARTIAL_SUCCESS/FAILURE]
Next action: [PROCEED_TO_3B/EXTEND_MONITORING/ROLLBACK]
Team decision required: [YES/NO]
```

---

## 🏁 成功基準まとめ

### Phase 3A (2%) 成功条件
- ✅ 8時間安定稼働
- ✅ エラー率 < 1%
- ✅ パフォーマンス劣化 < 20%
- ✅ ゼロ緊急事態

### Phase 3B (5%) 成功条件
- ✅ 24時間安定稼働
- ✅ エラー率 < 0.8%
- ✅ パフォーマンス劣化 < 15%
- ✅ ゼロ自動ロールバック

### 全体成功条件
- ✅ 段階的移行完全成功
- ✅ システム安定性証明
- ✅ チーム信頼性確立
- ✅ 次フェーズ準備完了

---

**🛡️ 最重要原則: "Proceed much carefully"**

1. **段階的**: 1% → 2% → 5%
2. **検証的**: 各段階で厳格評価
3. **可逆的**: 即座ロールバック対応
4. **協調的**: チーム判断重視

**📞 緊急連絡: development-team**