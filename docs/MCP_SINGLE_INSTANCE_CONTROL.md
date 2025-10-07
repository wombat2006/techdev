# MCP Single Instance Control

## 概要

TechSapo プロジェクトでは、各 MCP サーバは**1用途につき1インスタンスのみ**起動するように制限されています。

## 実装方式

### flock ベースのロックメカニズム

各 MCP サーバの起動スクリプトは、以下の仕組みで単一インスタンスを保証します：

1. **排他ロックファイル**: `/tmp/mcp-<server-type>.lock`
2. **flock システムコール**: ロックファイルへの排他アクセス制御
3. **既存プロセスの強制終了**: ロック取得失敗時、古いプロセスを kill
4. **自動クリーンアップ**: スクリプト終了時に trap でロックファイル削除

## 起動スクリプト

### Cipher MCP

**場所**: `/ai/prj/techdev/scripts/start-cipher-mcp.sh`

**ロックファイル**: `/tmp/mcp-cipher.lock`

**実行コマンド**:
```bash
npx @byterover/cipher --mode mcp --mcp-transport-type stdio
```

**プロセス構成**:
- スクリプトプロセス (bash)
- npm プロセス
- node プロセス (実際の Cipher MCP サーバ)

合計: 3プロセス（正常）

### Serena MCP

**場所**: `/ai/prj/techdev/scripts/start-serena-mcp.sh`

**ロックファイル**: `/tmp/mcp-serena.lock`

**実行コマンド**:
```bash
uv run serena start-mcp-server
```

**プロセス構成**:
- スクリプトプロセス (bash)
- uv プロセス (子プロセス)
- python プロセス (実際の Serena MCP サーバ、子プロセス)

合計: 1メインプロセス + 2子プロセス（正常）

### Context7 MCP

**タイプ**: HTTP Transport (stdio ではない)

**URL**: `https://mcp.context7.com/mcp`

**認証**: API Key ヘッダー (`CONTEXT7_API_KEY`)

**単一インスタンス**: HTTP サーバ側で管理（クライアント側では制御不要）

## Claude Code 設定

### 現在の MCP サーバ構成

`~/.claude.json` (プロジェクト: `/ai/prj/techdev`)

```json
{
  "mcpServers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "ctx7sk-8fca3f75-9da5-4f8b-965f-fe31213e9a8b"
      }
    },
    "cipher": {
      "type": "stdio",
      "command": "/ai/prj/techdev/scripts/start-cipher-mcp.sh",
      "args": [],
      "env": {}
    },
    "serena": {
      "type": "stdio",
      "command": "/ai/prj/techdev/scripts/start-serena-mcp.sh",
      "args": [],
      "env": {}
    }
  }
}
```

## 動作確認

### MCP サーバ状態確認

```bash
claude mcp list
```

**期待される出力**:
```
Checking MCP server health...

context7: https://mcp.context7.com/mcp (HTTP) - ✓ Connected
cipher: /ai/prj/techdev/scripts/start-cipher-mcp.sh  - ✓ Connected
serena: /ai/prj/techdev/scripts/start-serena-mcp.sh  - ✓ Connected
```

### プロセス数確認

```bash
# Cipher インスタンス数
pgrep -c -f 'cipher.*--mode mcp'
# 期待値: 3 (スクリプト + npm + node)

# Serena インスタンス数
pgrep -c -f 'start-serena-mcp.sh'
# 期待値: 1 (スクリプトのみ、uv/python は子プロセス)
```

### ロックファイル確認

```bash
ls -lh /tmp/mcp-*.lock
```

**期待される出力**:
```
-rw-r--r--. 1 wombat wombat 7 Oct  5 05:47 /tmp/mcp-cipher.lock
-rw-r--r--. 1 wombat wombat 7 Oct  5 05:47 /tmp/mcp-serena.lock
```

### 重複起動防止テスト

```bash
# 手動で2つ目のインスタンスを起動しようとする
/ai/prj/techdev/scripts/start-cipher-mcp.sh
```

**期待される動作**:
```
[CIPHER-MCP] Failed to acquire lock
```

既存のインスタンスがロックを保持しているため、2つ目の起動は**失敗**します（正常動作）。

## トラブルシューティング

### ロックファイルが残留している場合

```bash
# 手動でロックファイルを削除
rm -f /tmp/mcp-cipher.lock /tmp/mcp-serena.lock

# MCP サーバを再起動
claude mcp list  # 自動的に再接続
```

### プロセスが残留している場合

```bash
# Cipher の強制終了
pkill -f 'cipher.*--mode mcp'

# Serena の強制終了
pkill -f 'serena start-mcp-server'

# ロックファイルのクリーンアップ
rm -f /tmp/mcp-*.lock
```

### MCP サーバが接続できない場合

1. **ロックファイルを削除**:
   ```bash
   rm -f /tmp/mcp-*.lock
   ```

2. **Claude Code を再起動**:
   ```bash
   # Claude Code を終了して再起動
   ```

3. **MCP サーバの状態確認**:
   ```bash
   claude mcp list
   ```

## セキュリティとパフォーマンス

### セキュリティ

- **ロックファイル権限**: 644 (所有者のみ書き込み可)
- **プロセス分離**: 各 MCP サーバは独立したプロセス空間で実行
- **API Key 保護**: Context7 の API Key は `~/.claude.json` に保存（600 権限推奨）

### パフォーマンス

- **メモリ使用量**:
  - Cipher: 約 80-180MB (npm + node)
  - Serena: 約 60-100MB (uv + python)
  - Context7: クライアント側はメモリ消費なし（HTTP クライアント）

- **起動時間**:
  - Cipher: 約 1-2秒
  - Serena: 約 0.5-1秒
  - Context7: 即座（既存サーバへの接続）

## 設計上の利点

1. **重複防止**: flock による確実な排他制御
2. **自動クリーンアップ**: trap による確実なリソース解放
3. **既存プロセス終了**: ロック取得失敗時、古いプロセスを自動的に kill
4. **stdio 互換性**: `exec` による stdio 継承で Claude Code MCP との完全互換性
5. **デバッグ容易性**: ロックファイルと PID により状態確認が容易

## 関連ファイル

- `/ai/prj/techdev/scripts/start-cipher-mcp.sh` - Cipher MCP 起動スクリプト
- `/ai/prj/techdev/scripts/start-serena-mcp.sh` - Serena MCP 起動スクリプト
- `/ai/prj/techdev/scripts/mcp-server-manager.sh` - 旧バージョン（非推奨）
- `/ai/prj/techdev/scripts/ensure-single-mcp-instance.sh` - 未使用
- `~/.claude.json` - Claude Code MCP 設定ファイル
- `/tmp/mcp-cipher.lock` - Cipher ロックファイル
- `/tmp/mcp-serena.lock` - Serena ロックファイル

## 改善内容（2025-10-05 更新）

### ロックファイル削除漏れ対策

以下の機能を追加しました：

1. **ロックファイル内容の検証**
   - PID 書き込み直後に内容を検証
   - 書き込み失敗時はエラーを出力してロックファイルを削除

2. **Stale ロックファイルの自動削除**
   - 起動時に既存ロックファイルのPIDが実行中か確認
   - プロセスが存在しない場合は自動的にロックファイルを削除

3. **堅牢な cleanup 関数**
   - `EXIT`, `INT`, `TERM`, `HUP` シグナルすべてでクリーンアップ実行
   - 自分のPIDが書き込まれている場合のみロックファイルを削除
   - ファイルディスクリプタも確実にクローズ

4. **ロック取得の再試行**
   - Stale ロックを削除した後、自動的に再取得を試みる
   - タイムアウト (5秒) 付きで安全に待機

### 改善後の動作フロー

```bash
1. Stale ロックファイルチェック → 削除
2. 排他ロック取得 (flock)
3. ロックファイルにPID書き込み
4. 書き込み内容を検証 → 失敗時はエラー終了
5. 成功メッセージ出力
6. 古いプロセスを kill
7. exec で MCP サーバ起動
8. 終了時に cleanup 関数でロックファイル削除
```

## 更新履歴

- **2025-10-05 (更新2)**: ロックファイル削除漏れ対策を強化
  - PID 書き込み検証を追加
  - Stale ロックファイル自動削除を追加
  - 複数シグナル対応の cleanup 関数を実装
- **2025-10-05**: 初版作成 - flock ベースの単一インスタンス制御を実装
