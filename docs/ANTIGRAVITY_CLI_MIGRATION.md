# Antigravity CLI 移行（Google Tier 1 プロバイダー）

**版**: 1.0  
**日付**: 2026-06-18  
**ステータス**: ドキュメント採択（実装移行は別タスク）

---

## 背景

Google は **Gemini CLI** から **Antigravity CLI** への統合を進めている。TechSapo の Tier 1（Google / Gemini 系分析）プロバイダーアクセスは、**Antigravity CLI** を標準とする。

- **CLI コマンド**: `agy`（旧: `gemini`）
- **認証**: `agy auth login`（OAuth。API キー直埋めは引き続き禁止）
- **モデル例**: Gemini 2.5 Pro / Flash（Antigravity ハーネス経由）

参考: [Google Developers Blog — Transitioning Gemini CLI to Antigravity CLI](https://developers.googleblog.com/en/an-important-update-transitioning-gemini-cli-to-antigravity-cli/)

---

## TechSapo での位置づけ

| 項目 | ドキュメント上の標準 | 実装（AS-IS） |
|------|---------------------|---------------|
| Google Tier 1 | Antigravity CLI（`agy`） | `wall-bounce-analyzer.ts` が legacy `gemini` を spawn |
| セキュリティ | CLI spawn のみ、API キー禁止 | 変更なし |
| Wall-Bounce | 多プロバイダー協調 | 変更なし |

**実装移行**（将来）: `spawn('gemini', …)` → `spawn('agy', …)`、引数・認証フローの Antigravity 仕様への合わせ込み。本ドキュメント採択時点では **コード変更は行わない**。

---

## 開発環境セットアップ

```bash
# Antigravity CLI インストール（公式）
curl -fsSL https://antigravity.google/cli/install.sh | bash

# 動作確認
which agy
agy --version
agy auth login
```

---

## 関連ドキュメント

| 文書 | 内容 |
|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | プロバイダー Tier 構成 |
| [SECURITY.md](./SECURITY.md) | CLI spawn セキュリティ |
| [GEMINI_CLI_INTEGRATION_GUIDE.md](./GEMINI_CLI_INTEGRATION_GUIDE.md) | 旧 Gemini CLI ガイド（参照用・Antigravity へ置換予定） |
| [WALL_BOUNCE_SYSTEM.md](./WALL_BOUNCE_SYSTEM.md) | Wall-Bounce プロバイダー構成 |

---

## 用語

| 旧 | 新（ドキュメント標準） |
|----|------------------------|
| Gemini CLI | Antigravity CLI |
| `gemini` コマンド | `agy` コマンド |
| Gemini CLI 経由 | Antigravity CLI 経由 |

モデル名 **Gemini 2.5 Pro / Flash** は Antigravity 上で利用する LLM モデル名として引き続き使用する。
