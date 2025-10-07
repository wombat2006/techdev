# TechSapo Wall-Bounce 次世代アーキテクチャ実装計画

**Document Version:** 1.0.0
**Last Updated:** 2025-10-05
**Author:** TechSapo Development Team
**Status:** Design Approved - Ready for Implementation

---

## 📋 Executive Summary

TechSapoの壁打ちシステムを次世代アーキテクチャに進化させる実装計画。**パラレル・シリアル・ハイブリッド**の3モードに対応し、早期停止、Judge機能、コスト最適化を実現する。

### 🎯 主要目標

1. **品質向上**: k-of-nクオーラム + LLM-as-judgeで高品質な回答を保証
2. **コスト最適化**: 予算制約 + 動的モデル選択で費用対効果を最大化
3. **信頼性向上**: 自動リカバリ + サーキットブレーカーで安定運用
4. **柔軟性**: ハイブリッドモードで重要ステップだけ多視点収集

---

## 🏗️ アーキテクチャ設計

### 壁打ち結果の統合 (GPT-5 + Gemini 2.5 Pro)

#### 1. モジュール構成
```
src/services/
├── orchestrator.ts          # メインオーケストレーター（パラレル・シリアル・ハイブリッド制御）
├── quorum-judge.ts           # k-of-nクオーラム判定 + 早期停止
├── llm-judge.ts              # LLM-as-judge評価システム
├── cost-tracker.ts           # コスト見積 + 予算制約
├── acceptance-rule.ts        # ルール定義 + チェック機構
└── wall-bounce-analyzer.ts  # 既存（拡張）
```

#### 2. 設定外部化
```yaml
# config/wall-bounce-nextgen.yml
quorum:
  k: 2                        # k-of-n
  scoreThreshold: 0.82        # 確定票の閾値
  abstainBelow: 0.5           # 棄権扱いの閾値

judge:
  enabled: true
  model: "gpt-5"
  topN: 3
  weights:
    accuracy: 0.3
    completeness: 0.25
    consistency: 0.2
    rationale: 0.15
    format: 0.1

budget:
  budgetJpy: 200
  hardCap: false              # trueの場合、予算超過で即停止
  degrade: true               # 予算逼迫時に低コストモデルへ自動切替

priceTable:
  "gpt-5": { input: 0.003, output: 0.012 }
  "gemini-2.5-pro": { input: 0.00125, output: 0.005 }
  "gemini-2.5-flash": { input: 0.0003, output: 0.0025 }
  "qwen3-coder": { input: 0.0015, output: 0.006 }
```

---

## 🔧 核心機能の実装設計

### 1. QuorumJudge（早期停止 + k-of-n）

#### 型定義
```typescript
interface QuorumConfig {
  k: number;                  // k-of-n クオーラム
  scoreThreshold?: number;    // 確定票の閾値
  abstainBelow?: number;      // 棄権扱いの閾値
  tieBreaker?: 'median' | 'judge';
}

interface QuorumResult {
  winner?: string;            // 勝者のID
  votes: Record<string, number>;
  achievedQuorum: boolean;
  canReachQuorum: boolean;    // 逆転可能性判定
}

class QuorumJudge {
  async evaluate(
    responses: LLMResponse[],
    config: QuorumConfig,
    abortController: AbortController
  ): Promise<QuorumResult>;
}
```

#### 核心ロジック（GPT-5提案）
```typescript
// ストリーム到着順にスコアリング
for await (const response of responseStream) {
  const score = await scoreFn(response);
  const vote = score >= scoreThreshold ? 'confirm' :
               score >= abstainBelow ? 'abstain' : 'reject';

  if (vote === 'confirm') {
    votes[response.id] = (votes[response.id] || 0) + 1;

    // k達成で即停止
    if (votes[response.id] >= k) {
      abortController.abort();  // 残りをキャンセル
      return { winner: response.id, achievedQuorum: true };
    }
  }

  // 逆転不能判定
  const remaining = totalProviders - completedCount;
  if (remaining + topVotes < k) {
    return { achievedQuorum: false, canReachQuorum: false };
  }
}
```

### 2. LLMJudge（評価システム）

#### 固定テンプレート
```typescript
const JUDGE_TEMPLATE = {
  system: `You are a strict evaluator. Score each candidate from 0.0 to 1.0.
Criteria: (1) task coverage, (2) internal consistency, (3) risk/safety, (4) specificity.
Output JSON: [{"id":"p1","score":0.83,"pros":["..."],"cons":["..."]}, ...]`,

  user: (candidates: string[]) => `
Evaluate the following ${candidates.length} responses and select the best one:

${candidates.map((c, i) => `## Candidate ${i + 1}\n${c}\n`).join('\n')}

Output your evaluation as JSON.`
};
```

#### Zod検証
```typescript
import { z } from 'zod';

const JudgeOutputSchema = z.object({
  winnerId: z.string(),
  scorecard: z.record(z.number().min(0).max(1)),
  merged: z.string().optional(),
  feedback: z.string()
});

class LLMJudge {
  async evaluate(candidates: LLMResponse[], criteria: JudgeCriteria): Promise<JudgeResult> {
    const rawOutput = await this.llm.invoke(JUDGE_TEMPLATE.user(candidates));
    const parsed = JudgeOutputSchema.safeParse(JSON.parse(rawOutput));

    if (!parsed.success) {
      logger.warn('Judge output validation failed, using fallback aggregator');
      return this.fallbackAggregator(candidates);
    }

    return parsed.data;
  }
}
```

### 3. CostTracker（予算管理）

#### プリフライト見積
```typescript
class CostTracker {
  async estimateStepCost(
    prompt: string,
    providers: string[],
    expectedOutputTokens: number = 500
  ): Promise<number> {
    const inputTokens = this.tokenizer.count(prompt);
    let totalCost = 0;

    for (const provider of providers) {
      const price = this.priceTable[provider];
      totalCost += (inputTokens * price.input) + (expectedOutputTokens * price.output);
    }

    return totalCost;
  }

  async willExceedBudget(estimatedCost: number, budgetJpy: number): Promise<boolean> {
    const spent = await this.getSpent();
    return (spent + estimatedCost) > budgetJpy;
  }

  async adjustProviders(
    providers: string[],
    budgetJpy: number,
    degrade: boolean
  ): Promise<string[]> {
    if (!degrade) return providers;

    // 高コストモデルを低コストモデルに置換
    return providers.map(p => {
      if (this.isExpensive(p) && this.willExceedBudget(budgetJpy)) {
        return this.getCheaperAlternative(p);
      }
      return p;
    });
  }
}
```

### 4. AcceptanceRule（合格基準チェック）

#### ルール定義
```typescript
interface AcceptanceRule {
  id: string;
  description: string;
  level: 'error' | 'warn';
  check: (ctx: StepContext) => Promise<Pass | Fail>;
}

interface Pass { passed: true; }
interface Fail { passed: false; reason: string; hint?: string; }

// 組み込みルール例
const BUILTIN_RULES: AcceptanceRule[] = [
  {
    id: 'non-empty',
    description: 'Output must not be empty',
    level: 'error',
    check: async (ctx) => ctx.output.trim() ?
      { passed: true } :
      { passed: false, reason: 'Empty output', hint: 'Provide detailed response' }
  },
  {
    id: 'json-valid',
    description: 'Output must be valid JSON',
    level: 'error',
    check: async (ctx) => {
      try {
        JSON.parse(ctx.output);
        return { passed: true };
      } catch (e) {
        return { passed: false, reason: 'Invalid JSON', hint: 'Format as valid JSON object' };
      }
    }
  },
  {
    id: 'code-compiles',
    description: 'Generated code must compile',
    level: 'error',
    check: async (ctx) => {
      const result = await this.compiler.check(ctx.output);
      return result.success ?
        { passed: true } :
        { passed: false, reason: result.errors.join(', '), hint: 'Fix syntax errors' };
    }
  }
];
```

### 5. ExecuteOptions拡張

```typescript
interface ExecuteOptions {
  // 既存フィールド（維持）
  taskType?: 'basic' | 'premium' | 'critical';
  domain?: 'coding' | 'analysis' | 'creative' | 'general';
  mode?: 'parallel' | 'sequential';
  minProviders?: number;
  maxProviders?: number;

  // 新規フィールド
  earlyStop?: {
    k: number;                      // k-of-n クオーラム
    scoreThreshold?: number;        // 確定票の閾値（デフォルト: 0.82）
    abstainBelow?: number;          // 棄権扱いの閾値（デフォルト: 0.5）
    tieBreaker?: 'median' | 'judge';
  };

  scoring?: {
    scoreFn?: (output: LLMResponse) => number;
    voteFn?: (score: number) => 'confirm' | 'abstain' | 'reject';
  };

  judge?: {
    enabled: boolean;
    model: string;                  // GPT-5推奨
    topN?: number;                  // 上位N候補を評価（デフォルト: 3）
    weights?: Record<string, number>;
    templateId?: string;
    timeoutMs?: number;
  };

  acceptance?: {
    rules: AcceptanceRule[];
    mode: 'all' | 'any';            // all: すべて合格必要、any: 1つでも合格で可
    timeoutMs?: number;
  };

  retry?: {
    maxAttempts: number;
    backoffMs: number;
    jitter?: boolean;               // ランダムな揺らぎ追加
    hints?: boolean;                // 失敗時にヒント付与
  };

  budget?: {
    budgetJpy: number;
    hardCap?: boolean;              // true: 予算超過で即停止
    degrade?: boolean;              // true: 予算逼迫時に低コストモデルへ
    priceTable?: PriceTable;
    estimateOnly?: boolean;         // true: 見積のみ実行
  };

  hybrid?: {
    multiPerspectiveSteps?: Array<string | number>;  // 重要ステップ
    parallelFanout?: number;                         // 並列実行数
  };
}
```

---

## 🚀 実装優先順位（段階的アプローチ）

### Phase 1: 早期停止 + クオーラム（2-3日）
✅ **目標**: 最小実装でk-of-n判定と早期停止を実現

- [ ] `quorum-judge.ts` 実装
- [ ] `AbortController`統合
- [ ] 基本的なスコアリング関数
- [ ] 逆転不能判定

### Phase 2: コスト管理（2-3日）
✅ **目標**: 予算制約と費用見積を追加

- [ ] `cost-tracker.ts` 実装
- [ ] `priceTable`設定外部化
- [ ] プリフライト見積
- [ ] 動的モデル選択（degrade機能）

### Phase 3: Judge機能（3-4日）
✅ **目標**: LLM-as-judgeで高品質マージ

- [ ] `llm-judge.ts` 実装
- [ ] 固定テンプレート作成
- [ ] Zod検証追加
- [ ] フォールバック機構

### Phase 4: Acceptance Rule + 自動リカバリ（3-4日）
✅ **目標**: ステップごとの合格基準チェックと自動リカバリ

- [ ] `acceptance-rule.ts` 実装
- [ ] 組み込みルール追加
- [ ] リトライ戦略（指数バックオフ + ジッター）
- [ ] ヒント生成機能

### Phase 5: ハイブリッドモード + 最適化（3-4日）
✅ **目標**: 重要ステップだけparallelで多視点収集

- [ ] `orchestrator.ts` 拡張
- [ ] ハイブリッドモード実装
- [ ] Redisキャッシュ統合
- [ ] 動的最適化ロジック

---

## 📊 成功メトリクス

### KPI
- **品質向上**: consensus_score ≥ 0.8（現在: ~0.7）
- **コスト削減**: 平均コスト -30%（早期停止 + 動的選択）
- **応答時間**: 平均レイテンシ -20%（早期停止効果）
- **信頼性**: エラー率 < 1%（自動リカバリ効果）

### モニタリング
```typescript
interface WallBounceMetrics {
  earlyStopRate: number;        // 早期停止率
  quorumAchievedRate: number;   // クオーラム達成率
  averageCost: number;          // 平均コスト（JPY）
  budgetComplianceRate: number; // 予算遵守率
  judgeSuccessRate: number;     // Judge成功率
  acceptancePassRate: number;   // Acceptance合格率
  retryRate: number;            // リトライ率
}
```

---

## 🔐 セキュリティ・運用考慮事項

### セキュリティ
- [ ] PII検出フック（入力マスク）
- [ ] 外部送信ブロック（機密情報）
- [ ] 監査ログ（全判定履歴）

### 運用
- [ ] /why-routed エンドポイント追加（判定理由の説明）
- [ ] ダッシュボード（勝率・コスト・品質）
- [ ] アラート設定（予算超過・品質劣化）

---

## 📝 次のアクション

### 即座に着手すべきタスク
1. **Phase 1の開始**: `quorum-judge.ts` の実装
2. **設定ファイル作成**: `config/wall-bounce-nextgen.yml`
3. **型定義追加**: `src/types/wall-bounce-nextgen.ts`
4. **テストケース作成**: 早期停止のユニットテスト

### 承認待ちの決定事項
- ✅ **アーキテクチャ設計**: 承認済み（GPT-5 + Gemini壁打ち結果）
- ✅ **実装優先順位**: 承認済み（段階的アプローチ）
- ⏳ **予算配分**: Phase 1-5の実装期間決定
- ⏳ **リリース計画**: 各Phaseのリリーススケジュール

---

## 📚 参考資料

### 内部ドキュメント
- [CLAUDE.md](/ai/prj/CLAUDE.md) - 絶対的原則
- [WALL_BOUNCE_SYSTEM.md](/ai/prj/techdev/docs/WALL_BOUNCE_SYSTEM.md) - 現行システム
- [ARCHITECTURE.md](/ai/prj/techdev/docs/ARCHITECTURE.md) - システムアーキテクチャ

### 壁打ち結果
- GPT-5提案: 詳細な実装アプローチ、型定義、サービス設計
- Gemini 2.5 Pro: アーキテクチャレビュー、実装改善提案

---

**Status**: ✅ Ready for Implementation
**Next Review**: 2025-10-12 (Phase 1完了後)
**Maintained By**: TechSapo Development Team
