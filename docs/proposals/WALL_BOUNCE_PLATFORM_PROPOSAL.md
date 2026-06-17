# TechSapo Wall-Bounce Platform
## 技術提案書 — コア実装から専門プロジェクトへフォークする AI オーケストレーション基盤

**文書種別**: 顧客向け技術提案（AS-IS / To-Be 正直開示版）  
**版**: 1.0  
**日付**: 2026-06-17  
**機密区分**: 顧客提出用

---

## エグゼクティブサマリー

TechSapo は **Wall-Bounce（壁打ち）** を中核としたマルチ LLM オーケストレーション基盤です。単一 AI の回答やコード生成に依存せず、複数 LLM の協調と外部根拠（Grounding）により **hallucination リスクを構造的に低減** します。

**3 つの差別化**:

1. **フォーク可能コア** — Wall-Bounce エンジンを維持したまま、InfraOps / LegalTech / DevAssist 等へ専門化
2. **検証付きコード生成** — Codex + Claude Agent + Context7 docs による多視点 codegen
3. **権威ソース grounding（P5+）** — e-Gov 法令 API、NDL、社内 KB による citation 標準化

**現状（AS-IS）**: 多 LLM 協調の骨格は動作。品質 gate・Grounding 統合・権威 API は部分〜未実装。  
**将来（To-Be / P5+）**: 段階導入で根拠付き・ゲート付きの専門支援プラットフォームへ進化。

---

## 1. 課題 — なぜ Wall-Bounce か

| リスク | 単一 LLM | Wall-Bounce |
|---|---|---|
| Hallucination | もっともらしい誤情報 | 多視点 + Grounding + gate |
| 単一バイアス | 1 ベンダー依存 | Antigravity / Codex / Claude 分散 |
| 根拠欠如 | 引用なし断言 | Tier 優先 citation |
| コード品質 | 動くが誤 API | Context7 + 多 LLM review |

---

## 2. プラットフォーム — フォーク可能なコア

```
TechSapo Core（フォーク元）
├── Wall-Bounce Engine（parallel / sequential / Aggregator）
├── 固定 Orchestrator（TaskGraph / gate / 監査）
├── MCP 統合（Context7 / Cipher / Codex）
└── 差し替え可能: Grounding / 辞書 / TaskRouter / 独自 DB
         │
         ├── InfraOps Fork（障害 KB / Runbook）
         ├── LegalTech Fork（e-Gov / 判例 / 規程）
         ├── DevAssist Fork（Context7 / コードベース）
         └── Research Fork（NDL / 社内資料）
```

**フォーク時に継承**: API パターン、Redis、Prometheus、Wall-Bounce 実行エンジン。  
**フォーク時に差し替え**: 辞書、Grounding ソース、TaskRouter ルール、UI・disclaimer。

---

## 3. AS-IS — 正直な現状評価

### 3.1 実装済み

- Wall-Bounce コア（`WallBounceAnalyzer`）— parallel / sequential、Aggregator
- マルチプロバイダー: Antigravity CLI（`agy`）、Codex CLI、Claude Code MCP  
  ※ **実装**: 現行コードは legacy `gemini` spawn。Antigravity CLI への移行は別タスク（[ANTIGRAVITY_CLI_MIGRATION.md](../ANTIGRAVITY_CLI_MIGRATION.md)）
- SSE ストリーミング API、MCP 設定基盤、Context7 Redis キャッシュ
- Google Drive RAG（部分）、Codex MCP、Claude `code_with_sonnet45`

### 3.2 ギャップ（開示）

| 項目 | 設計意図 | AS-IS 実態 |
|---|---|---|
| 品質 gate | 閾値未満で停止 | **未達でも返却** |
| confidence | モデルベース | **固定値** |
| Grounding | RAG + WB 一体 | **経路分離** |
| コード Agent | WB 統合 | **MCP 単体のみ** |
| APS | e-Gov / NDL / 判例 | **未実装** |
| 子タスク LLM 選定 | 最適化 | **taskType 固定リスト** |

### 3.3 現時点の適合ユースケース

| 適合 | 用途 |
|---|---|
| ◎ | 技術検討・ブレスト、実装案の壁打ち |
| ○ | IT ログ分析補助、Drive RAG Q&A |
| △ | コンプライアンス断定、法令解釈 |
| × | 法的効力を要する唯一の根拠 |

---

## 4. To-Be — P5+ ロードマップ

| Phase | 内容 | 顧客価値 |
|---|---|---|
| **0** | Hard gate、PromptAnalyzer、辞書 v0 | 品質契約の開始 |
| **1** | Grounding 統合、Context7、e-Gov 法令 API | 条文・API 正確性 |
| **2** | 独自 DB、NDL、hybrid RAG | 社内手順・文献 citation |
| **3** | Cipher verified、判例 Adapter | 運用記憶・事例 |
| **4** | スケール、監査、SLA | エンタープライズ |

### Grounding 優先順位

1. **e-Gov / 社内 DB**（ファクト）
2. **NDL / Context7 / 判例 snippet**（準ファクト）
3. **辞書 / Cipher**（補助）
4. **LLM 推論**（矛盾時 abstain）

---

## 5. 検証付きコード生成

| モード | 説明 | 状態 |
|---|---|---|
| **Assist** | 多 LLM 実装案・スニペット | AS-IS 利用可 |
| **Agent** | リポジトリ Write/Edit/Bash | MCP 経由、WB 統合は To-Be |
| **Verified** | test/lint/gate 後 merge | To-Be |

**期待効果（To-Be）**: 存在しない API 参照 -40〜70%（Context7）、設計・実装矛盾 -25〜40%。

---

## 6. 固定 Orchestrator + フレキシブル子タスク

- **固定**: フロー、Grounding Tier、gate、監査、合意ルール
- **可変**: 子タスクごとの LLM（codegen→Codex、分析→Antigravity / Gemini 2.5 Pro、編集→Sonnet Agent）
- **Wall-Bounce**: 合意が必要な子タスクのみ（コスト最適化）

---

## 7. 提供パッケージ案

| パッケージ | 内容 |
|---|---|
| **Core** | Wall-Bounce + MCP + API |
| **Core + DevAssist** | Context7 grounding + codegen Assist |
| **Core + InfraOps** | 独自 DB + 辞書 + Cipher |
| **Core + LegalTech** | e-Gov + 判例 + 法律辞書 |
| **Core + P5+ Full** | 上記 + Hard gate + 監査 |

---

## 8. リスクと免責

- LegalTech は **法律助言の代替ではない**
- 判例は公式 API なし — citation はメタ + snippet に限定
- NDL 営利利用は申請が必要な場合あり
- AS-IS PoC と To-Be 本番 SLA を区別してご利用ください

---

## 9. ネクストステップ

1. ユースケース・フォーク方向の選定  
2. AS-IS PoC（現行 Wall-Bounce API）  
3. Phase 0 共同（gate + 辞書）  
4. KPI 合意（citation 率、abstain 率）  
5. NDL / 法務 scope 確認  

---

## 付録

- 内部 ADR: [`../decisions/WALL_BOUNCE_P5_ARCHITECTURE.md`](../decisions/WALL_BOUNCE_P5_ARCHITECTURE.md)
- スライド: [`TechSapo_Wall_Bounce_Proposal.pptx`](./TechSapo_Wall_Bounce_Proposal.pptx)

**TechSapo Development Team**  
*Wall-Bounce Core — Fork Ready for Your Domain*
