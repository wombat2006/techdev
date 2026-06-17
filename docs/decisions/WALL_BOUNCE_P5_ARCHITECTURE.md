# Wall-Bounce P5+ アーキテクチャ設計合意

**文書種別**: 内部設計決定（Architecture Decision Record）  
**版**: 1.0  
**日付**: 2026-06-17  
**ステータス**: 採択（P5+ ロードマップ）

---

## 1. 背景と目的

TechSapo は **Wall-Bounce（壁打ち）** を中核としたマルチ LLM オーケストレーション基盤である。単一 LLM の hallucination リスクを、複数プロバイダーの協調と Grounding によって構造的に低減する。

本ドキュメントは、現状（AS-IS）のギャップを踏まえ、採択ロードマップ **P5+** および **固定 Orchestrator + フレキシブル子タスク LLM 選定** の設計合意を記録する。

---

## 2. コア原則（変更なし）

- 合意が必要な子タスクでは **最低 2 プロバイダー**
- LLM 呼び出しは CLI / MCP / Internal SDK（API キー直埋め禁止）
- ユーザー向け回答は原則 **日本語**
- Wall-Bounce 分析は `WallBounceAnalyzer` / 統合 Orchestrator 経由（バイパス禁止）

---

## 3. AS-IS ギャップ（ブロッカー）

| ID | 課題 | 影響 |
|---|---|---|
| B1 | confidence 固定値、Hard gate 未実装 | 低品質回答がそのまま返る |
| B2 | RAG と Wall-Bounce 経路分離 | grounding なき LLM 推論 |
| B3 | Analyzer / SRP 二重実装 | 品質モデル分裂 |
| B4 | Cipher write ポリシーなし | memory pollution リスク |
| B5 | プロンプト解析が regex 主体 | 日本語・専門語 routing 精度低 |
| B6 | 独自 DB 未整備 | 社内正本・版管理不可 |
| B7 | APS（e-Gov / NDL / 判例）未実装 | 法令・文献捏造リスク |
| B8 | `getProviderOrder(taskType)` 固定 | 子タスク最適化不可 |

---

## 4. To-Be: P5+ ロードマップ

| Phase | 期間目安 | 内容 |
|---|---|---|
| **0** | 1〜1.5 ヶ月 | PromptAnalyzer、Hard gate、辞書 v0、confidence 固定値廃止、Orchestrator 統合 |
| **1** | 1.5〜2 ヶ月 | GroundingOrchestrator、Context7 全 LLM 注入、e-Gov 法令 API v2 |
| **2** | 2〜3 ヶ月 | 独自 DB MVP、NDL Search API、hybrid RAG |
| **3** | 1.5〜2 ヶ月 | Cipher verified write、判例 Adapter、法律辞書 |
| **4** | 継続 | スケールアウト、監査、A/B、auto-rollback |

---

## 5. Grounding 優先順位（Tier）

| Tier | ソース | 用途 |
|---|---|---|
| **0a** | e-Gov 法令 API v2 | 条文原文（ファクト固定） |
| **0b** | 独自 DB | 社内 Runbook・規程正本 |
| **1a** | NDL Search API | 書誌・所蔵メタ citation |
| **1b** | Context7 | OSS / フレームワーク公式 docs |
| **1c** | 判例 Adapter | 事件メタ + 原文 snippet（要約は LLM に任せない） |
| **2a** | 専門辞書 | 略語・社内語定義 |
| **2b** | Cipher | verified episodic memory（参考 weight） |
| **3** | LLM 推論 | 最低 weight。Tier 0–2 と矛盾時は abstain |

Aggregator ルール: **Tier 0 と矛盾する claim は出力禁止**。

---

## 6. 固定 Orchestrator + フレキシブル子タスク LLM（採択）

### 6.1 固定（制御面）

- TaskGraph（DAG）の型と実行順序
- Grounding Tier 優先順位
- Hard gate / abstain / 再試行上限
- Wall-Bounce 最低合意ルール（`requiresWallBounce: true` の子タスク）
- citation / PII / MCP approval
- Prometheus・コスト集計

Orchestrator 本体は **TypeScript（deterministic）** に固定。LLM による routing は曖昧時の fallback のみ。

### 6.2 可変（実行面）

子タスク `kind` ごとに `TaskRouter` が provider を選定:

| kind | 例 |
|---|---|
| `grounding_fetch` | e-Gov, Context7, 独自 DB（非 LLM 可） |
| `llm_analyze` | Gemini, Sonnet |
| `llm_codegen` | GPT-5 Codex |
| `llm_agent_edit` | Sonnet `code_with_sonnet45` |
| `llm_cross_critique` | Wall-Bounce（ベンダー分散） |
| `llm_aggregate` | Sonnet 4.5 / Opus 4.1（複雑度で tier 固定） |

Wall-Bounce は **合意が必要な子タスクにスコープ**。全クエリ常時フル実行ではない。

### 6.3 概念型

```typescript
type ChildTaskKind =
  | 'grounding_fetch'
  | 'llm_analyze'
  | 'llm_codegen'
  | 'llm_agent_edit'
  | 'llm_cross_critique'
  | 'llm_aggregate';

interface ChildTask {
  id: string;
  kind: ChildTaskKind;
  input: GroundingBundle | string;
  requiresWallBounce: boolean;
  providerPolicy?: 'auto' | 'pinned' | 'exclude';
  pinnedProviders?: string[];
}
```

---

## 7. 形態素解析の位置づけ

- **採用**: PromptAnalyzer（RAG クエリ生成前）、1 回 parse → 複数 consumer
- **条件付き**: RAG hybrid search の term 抽出
- **非推奨**: Embedding 前処理、consensus 単独、プロンプト本体の形態素置換

---

## 8. コード生成（第二の価値提案）

| モード | 内容 | AS-IS | To-Be |
|---|---|---|---|
| **Assist** | スニペット・実装案をテキスト返却 | Codex + Wall-Bounce | Grounding + gate |
| **Agent** | Write/Edit/Bash | MCP `code_with_sonnet45` 単体 | TaskGraph 統合 |
| **Verified** | 生成 → test/lint → gate → merge | 未実装 | Phase 1–2 + CI |

---

## 9. フォーク可能コア

専門プロジェクトは以下を **載せ替え** てフォーク:

- `forkProfile.yaml`（TaskRouter ルール）
- 専門辞書
- Grounding Provider セット
- disclaimer / UI

**継承**: Wall-Bounce Engine、MCP 統合、SSE API、Redis、Prometheus。

---

## 10. 関連ドキュメント

- 顧客向け提案: [`../proposals/WALL_BOUNCE_PLATFORM_PROPOSAL.md`](../proposals/WALL_BOUNCE_PLATFORM_PROPOSAL.md)
- 提案スライド: [`../proposals/TechSapo_Wall_Bounce_Proposal.pptx`](../proposals/TechSapo_Wall_Bounce_Proposal.pptx)
- 現行 Wall-Bounce: [`../WALL_BOUNCE_SYSTEM.md`](../WALL_BOUNCE_SYSTEM.md)

---

**TechSapo Development Team**
