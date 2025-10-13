# LINE Notification System

TechSapo プロジェクトの LINE 通知システムの完全ガイド

## 📋 目次

1. [概要](#概要)
2. [アーキテクチャ](#アーキテクチャ)
3. [前提条件](#前提条件)
4. [セットアップガイド](#セットアップガイド)
5. [API リファレンス](#api-リファレンス)
6. [VM監視システム](#vm監視システム)
7. [使用例](#使用例)
8. [セキュリティ](#セキュリティ)
9. [トラブルシューティング](#トラブルシューティング)
10. [メンテナンス](#メンテナンス)

---

## 概要

### 目的

LINE Notification System は、TechSapo プラットフォームと関連インフラストラクチャからの重要なアラートをリアルタイムで LINE メッセージとして配信するシステムです。

### 主な機能

- 🚨 **リアルタイム通知**: システムアラートを即座に LINE で受信
- 📊 **VM 監視統合**: CPU、メモリ、ディスク、サービス監視
- 🔒 **セキュアな通信**: HTTPS 経由での暗号化通信
- 🎯 **重要度レベル**: 5段階の通知レベル (critical, error, warning, info, success)
- 🔌 **RESTful API**: シンプルな HTTP API でどこからでも通知可能

### システム構成

```
┌─────────────────┐
│  techdev VM     │
│  (監視スクリプト)│
└────────┬────────┘
         │ HTTPS POST
         │
         ▼
┌─────────────────────────────────┐
│ line-notification.com           │
│ (54.65.178.168)                 │
│                                 │
│  ┌──────────┐  ┌────────────┐  │
│  │  Nginx   │→│ Node.js    │  │
│  │  (443)   │  │ Express    │  │
│  │          │  │ (port 3000)│  │
│  └──────────┘  └─────┬──────┘  │
│                      │          │
└──────────────────────┼──────────┘
                       │ LINE Messaging API
                       ▼
              ┌────────────────┐
              │  LINE Platform │
              │  (Push API)    │
              └────────┬───────┘
                       │
                       ▼
                ┌─────────────┐
                │   管理者の   │
                │   LINE App  │
                └─────────────┘
```

---

## アーキテクチャ

### インフラストラクチャ

**Critical Infrastructure Decision**: `line-notification.com` は **永続的な**専用サーバーです。

| コンポーネント | 詳細 |
|--------------|------|
| **ドメイン** | line-notification.com |
| **IP アドレス** | 54.65.178.168 |
| **OS** | Amazon Linux 2023 |
| **Web サーバー** | Nginx (Reverse Proxy) |
| **アプリケーション** | Node.js Express (port 3000) |
| **SSL/TLS** | Let's Encrypt / Sectigo 証明書 |
| **監視対象** | techdev VM, その他の VM |

### エンドポイント

| エンドポイント | 用途 | プロトコル |
|---------------|------|-----------|
| `https://line-notification.com/webhook/line` | LINE Webhook (受信) | HTTPS POST |
| `https://line-notification.com/api/notify` | Push 通知 API | HTTPS POST |
| `https://line-notification.com/health` | ヘルスチェック | HTTPS GET |

### データフロー

1. **監視スクリプト** (vm-monitor.sh) がメトリクスをチェック
2. しきい値超過時に **HTTPS POST** で通知リクエスト送信
3. **Nginx** がリクエストを受信し、Express アプリに転送
4. **Express** がリクエストを検証し、LINE Push API にメッセージ送信
5. **LINE Platform** が管理者のアプリにメッセージ配信

---

## 前提条件

### LINE Bot の準備

1. **LINE Developers アカウント**
   - https://developers.line.biz/ でアカウント作成

2. **Messaging API チャネル**
   - プロバイダー作成
   - Messaging API チャネル作成
   - Channel Access Token 取得
   - Webhook URL 設定: `https://line-notification.com/webhook/line`

3. **管理者ユーザー ID**
   - LINE アカウントと Bot を友達追加
   - ユーザー ID を取得（例: `Uab2a7efceaf0d9bb7b29c54c8664029b`）

### サーバー要件

- **OS**: Amazon Linux 2023 / Ubuntu 20.04+
- **Node.js**: v18+ (推奨: v22.9.0)
- **Nginx**: 1.20+
- **SSL 証明書**: 有効な SSL/TLS 証明書
- **ポート**: 443 (HTTPS), 3000 (内部)

---

## セットアップガイド

### 1. サーバー初期設定

```bash
# SSH で line-notification.com に接続
ssh wombat@line-notification.com

# システムアップデート
sudo yum update -y

# Node.js インストール (nvm 推奨)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22

# 必要なパッケージ
sudo yum install -y git nginx
```

### 2. アプリケーションセットアップ

```bash
# アプリケーションディレクトリ作成
mkdir -p ~/line-webhook
cd ~/line-webhook

# package.json 作成
cat > package.json <<'EOF'
{
  "name": "line-webhook-server",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "@line/bot-sdk": "^7.5.2",
    "dotenv": "^16.0.3"
  }
}
EOF

# 依存関係インストール
npm install
```

### 3. 環境変数設定

```bash
# .env ファイル作成
cat > .env <<'EOF'
PORT=3000
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
LINE_CHANNEL_SECRET=your_channel_secret_here
ADMIN_USER_ID=Uab2a7efceaf0d9bb7b29c54c8664029b
EOF
```

### 4. アプリケーションコード

```bash
# index.js を作成（サンプル実装）
cat > index.js <<'EOF'
require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// LINE Bot SDK 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new line.Client(config);
const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

// Middleware
app.use(express.json());

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Push 通知 API
app.post('/api/notify', async (req, res) => {
  try {
    const { message, severity = 'info', server = 'unknown', details = '' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 重要度に応じた絵文字
    const severityEmojis = {
      critical: '🚨',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅'
    };

    const emoji = severityEmojis[severity] || 'ℹ️';

    // メッセージ構築
    let lineMessage = `${emoji} [${server.toUpperCase()}] ${message}`;
    if (details) {
      lineMessage += `\n\n${details}`;
    }

    // LINE にプッシュ送信
    await client.pushMessage(ADMIN_USER_ID, {
      type: 'text',
      text: lineMessage
    });

    console.log(`[${new Date().toISOString()}] Notification sent: ${message}`);
    res.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Webhook エンドポイント（受信メッセージ処理）
app.post('/webhook/line', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error(err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  // 簡単なエコーバック（オプション）
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `Received: ${event.message.text}`
  });
}

// サーバー起動
app.listen(PORT, '0.0.0.0', () => {
  console.log(`LINE webhook server listening on port ${PORT}`);
});
EOF
```

### 5. systemd サービス設定

```bash
# systemd unit ファイル作成
sudo tee /etc/systemd/system/line-webhook.service > /dev/null <<'EOF'
[Unit]
Description=LINE Webhook Server
After=network.target

[Service]
Type=simple
User=wombat
WorkingDirectory=/home/wombat/line-webhook
ExecStart=/home/wombat/.nvm/versions/node/v22.9.0/bin/node index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# サービス有効化と起動
sudo systemctl daemon-reload
sudo systemctl enable line-webhook
sudo systemctl start line-webhook
sudo systemctl status line-webhook
```

### 6. Nginx 設定

```bash
# Nginx 設定ファイル作成
sudo tee /etc/nginx/conf.d/line-notification.conf > /dev/null <<'EOF'
server {
    listen 443 ssl http2;
    server_name line-notification.com;

    # SSL 証明書
    ssl_certificate /etc/nginx/ssl/line-notification_com_fullchain.crt;
    ssl_certificate_key /etc/nginx/ssl/line-notification.com.key;

    # SSL 設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # セキュリティヘッダー
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # ログ
    access_log /var/log/nginx/line-notification.access.log;
    error_log /var/log/nginx/line-notification.error.log;

    # Reverse Proxy
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # タイムアウト設定
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# HTTP → HTTPS リダイレクト
server {
    listen 80;
    server_name line-notification.com;
    return 301 https://$server_name$request_uri;
}
EOF

# Nginx 設定テストと再起動
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL 証明書設置

```bash
# 証明書ディレクトリ作成
sudo mkdir -p /etc/nginx/ssl

# 証明書をコピー (証明書ファイルは事前に準備)
sudo cp ~/cert/*.crt /etc/nginx/ssl/
sudo cp ~/cert/*.key /etc/nginx/ssl/

# フルチェーン証明書作成
sudo bash -c 'cat /etc/nginx/ssl/line-notification_com.crt \
    /etc/nginx/ssl/FujiSSLRSADomainValidationSecureServerCA2.crt \
    /etc/nginx/ssl/SectigoPublicServerAuthenticationRootR46_USERTrust.crt \
    /etc/nginx/ssl/USERTrustRSACertificationAuthority.crt \
    > /etc/nginx/ssl/line-notification_com_fullchain.crt'

# パーミッション設定
sudo chmod 644 /etc/nginx/ssl/*.crt
sudo chmod 600 /etc/nginx/ssl/*.key
```

---

## API リファレンス

### POST /api/notify

**説明**: LINE にプッシュ通知を送信

**エンドポイント**: `https://line-notification.com/api/notify`

**メソッド**: POST

**Content-Type**: application/json

#### リクエストボディ

```json
{
  "message": "通知メッセージ（必須）",
  "severity": "重要度レベル（オプション、デフォルト: info）",
  "server": "送信元サーバー名（オプション、デフォルト: unknown）",
  "details": "詳細情報（オプション）"
}
```

#### パラメータ詳細

| パラメータ | 型 | 必須 | 説明 | 例 |
|-----------|---|------|------|---|
| `message` | string | ✅ | 通知のメインメッセージ | `"CPU usage high"` |
| `severity` | string | ❌ | 重要度レベル<br>(`critical`, `error`, `warning`, `info`, `success`) | `"warning"` |
| `server` | string | ❌ | 送信元サーバー識別子 | `"techdev"` |
| `details` | string | ❌ | 追加の詳細情報（改行 `\n` サポート） | `"CPU: 85%\nMemory: 70%"` |

#### 重要度レベルと絵文字

| severity | 絵文字 | 説明 | 使用例 |
|----------|--------|------|--------|
| `critical` | 🚨 | 即座の対応が必要 | サービスダウン、ディスク満杯 |
| `error` | ❌ | エラー状態 | プロセスクラッシュ、API エラー |
| `warning` | ⚠️ | 警告状態 | CPU 高負荷、ディスク残量少 |
| `info` | ℹ️ | 情報通知 | デプロイ完了、バックアップ完了 |
| `success` | ✅ | 成功通知 | テスト成功、復旧完了 |

#### レスポンス

**成功時 (200 OK)**:
```json
{
  "success": true,
  "message": "Notification sent"
}
```

**エラー時 (400 Bad Request)**:
```json
{
  "error": "Message is required"
}
```

**エラー時 (500 Internal Server Error)**:
```json
{
  "error": "Failed to send notification"
}
```

#### cURL 例

```bash
# 基本的な通知
curl -X POST https://line-notification.com/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test notification",
    "severity": "info",
    "server": "techdev"
  }'

# 詳細情報付き警告
curl -X POST https://line-notification.com/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "CPU usage high",
    "severity": "warning",
    "server": "techdev",
    "details": "Current: 85%\nThreshold: 80%\nAction: Investigate processes"
  }'

# クリティカル通知
curl -X POST https://line-notification.com/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Service down: nginx",
    "severity": "critical",
    "server": "production-web-01",
    "details": "Nginx service stopped unexpectedly\nLast check: 2025-10-13 14:30:00\nAttempting restart..."
  }'
```

### GET /health

**説明**: サーバーのヘルスチェック

**エンドポイント**: `https://line-notification.com/health`

**メソッド**: GET

#### レスポンス

```json
{
  "status": "ok",
  "timestamp": "2025-10-13T05:30:00.000Z"
}
```

---

## VM監視システム

### 監視スクリプト概要

**スクリプトパス**: `/ai/prj/techdev/scripts/vm-monitor.sh`

VM監視システムは **2つのモード** で動作します：

#### 1. エラー監視モード (`--mode check`)
- **実行間隔**: 5分ごと
- **通知**: エラー検知時のみ
- **目的**: しきい値超過時の即座な通知

#### 2. 定期ヘルスレポート (`--mode report`)
- **実行間隔**: 2時間ごと
- **通知**: 常に通知（正常時も含む）
- **目的**: 定期的なシステム状態確認

**監視対象**:
- CPU 使用率
- メモリ使用率
- ディスク使用率
- システム負荷 (Load Average)
- サービス稼働状態 (nginx, techsapo)
- システムアップタイム

### しきい値設定

| メトリクス | WARNING | CRITICAL |
|-----------|---------|----------|
| CPU 使用率 | 80% | 95% |
| メモリ使用率 | 85% | 95% |
| ディスク使用率 | 85% | 95% |
| システム負荷 | CPU数 × 2 | N/A |

### 監視フロー

```
┌─────────────────────┐
│  vm-monitor.sh      │
│  (cron / systemd)   │
└──────────┬──────────┘
           │
           ├─→ check_cpu()      ─┐
           ├─→ check_memory()   ─┤
           ├─→ check_disk()     ─┼→ しきい値超過？
           ├─→ check_services() ─┤
           └─→ check_load()     ─┘
                      │
                      │ YES
                      ▼
              send_notification()
                      │
                      ▼
           LINE Notification API
```

### クイックインストール（推奨）

**自動インストールスクリプト**を使用してワンコマンドでセットアップ：

```bash
cd /ai/prj/techdev/scripts
sudo ./install-vm-monitor.sh
```

このスクリプトは自動的に以下を実行します：
1. vm-monitor.sh を `/usr/local/bin/` にインストール
2. ログファイル `/var/log/vm-monitor.log` を作成
3. systemd ユニット（4ファイル）をインストール:
   - `vm-monitor-check.timer` / `.service` (エラー監視: 5分ごと)
   - `vm-monitor-report.timer` / `.service` (ヘルスレポート: 2時間ごと)
4. タイマーを有効化して起動

### 手動実行とテスト

```bash
# エラー監視モード（エラー時のみ通知）
/usr/local/bin/vm-monitor.sh --mode check

# ヘルスレポートモード（常に通知）
/usr/local/bin/vm-monitor.sh --mode report

# タイマー状態確認
sudo systemctl list-timers vm-monitor-*
```

### 通知例

#### エラー検知時の通知
```
⚠️ [TECHDEV] CPU usage high: 85%

Current: 85%
Threshold: 80%
```

#### 定期ヘルスレポート（2時間ごと）
```
✅ [TECHDEV] Periodic Health Report: ✅ Healthy

📊 System Metrics:
CPU: 54% (2 cores)
Memory: 19%
Disk: 44%
Load Avg: 0.16
Uptime: 2 days, 5 hours

🔧 Services:
✅ nginx
✅ techsapo
```

### ログ確認

```bash
# スクリプトログ
sudo tail -f /var/log/vm-monitor.log

# systemd ログ（エラー監視）
sudo journalctl -u vm-monitor-check.service -f

# systemd ログ（ヘルスレポート）
sudo journalctl -u vm-monitor-report.service -f

# タイマー実行履歴
sudo journalctl -u vm-monitor-check.timer
sudo journalctl -u vm-monitor-report.timer
```

### タイマー管理

```bash
# 状態確認
sudo systemctl status vm-monitor-check.timer
sudo systemctl status vm-monitor-report.timer

# 停止
sudo systemctl stop vm-monitor-check.timer vm-monitor-report.timer

# 再開
sudo systemctl start vm-monitor-check.timer vm-monitor-report.timer

# 実行間隔の変更
sudo vi /etc/systemd/system/vm-monitor-check.timer   # 5分を変更
sudo vi /etc/systemd/system/vm-monitor-report.timer  # 2時間を変更
sudo systemctl daemon-reload
sudo systemctl restart vm-monitor-*.timer
```

---

## 使用例

### 1. デプロイ通知

```bash
#!/bin/bash
# deploy-notify.sh

curl -X POST https://line-notification.com/api/notify \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Deployment started\",
    \"severity\": \"info\",
    \"server\": \"$(hostname)\",
    \"details\": \"Branch: main\nCommit: $(git rev-parse --short HEAD)\nUser: $(whoami)\"
  }"

# デプロイ処理
# ...

if [ $? -eq 0 ]; then
  curl -X POST https://line-notification.com/api/notify \
    -H "Content-Type: application/json" \
    -d "{
      \"message\": \"Deployment completed successfully\",
      \"severity\": \"success\",
      \"server\": \"$(hostname)\"
    }"
else
  curl -X POST https://line-notification.com/api/notify \
    -H "Content-Type: application/json" \
    -d "{
      \"message\": \"Deployment failed\",
      \"severity\": \"error\",
      \"server\": \"$(hostname)\",
      \"details\": \"Check logs for details\"
    }"
fi
```

### 2. バックアップ通知

```bash
#!/bin/bash
# backup-notify.sh

BACKUP_DIR="/backup"
BACKUP_FILE="backup-$(date +%Y%m%d).tar.gz"

# バックアップ実行
tar -czf "$BACKUP_DIR/$BACKUP_FILE" /var/www/html

if [ $? -eq 0 ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)

  curl -X POST https://line-notification.com/api/notify \
    -H "Content-Type: application/json" \
    -d "{
      \"message\": \"Backup completed\",
      \"severity\": \"success\",
      \"server\": \"$(hostname)\",
      \"details\": \"File: $BACKUP_FILE\nSize: $BACKUP_SIZE\"
    }"
fi
```

### 3. Node.js からの通知

```javascript
const axios = require('axios');

async function sendLineNotification(message, severity = 'info', details = '') {
  try {
    const response = await axios.post('https://line-notification.com/api/notify', {
      message,
      severity,
      server: require('os').hostname(),
      details
    });

    console.log('Notification sent:', response.data);
    return true;
  } catch (error) {
    console.error('Failed to send notification:', error.message);
    return false;
  }
}

// 使用例
sendLineNotification('Application started', 'info');
sendLineNotification('Database connection failed', 'error', 'Retrying in 30 seconds...');
```

### 4. Python からの通知

```python
import requests
import socket

def send_line_notification(message, severity='info', details=''):
    url = 'https://line-notification.com/api/notify'
    payload = {
        'message': message,
        'severity': severity,
        'server': socket.gethostname(),
        'details': details
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        print(f"Notification sent: {response.json()}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Failed to send notification: {e}")
        return False

# 使用例
send_line_notification('Python script started', 'info')
send_line_notification('Process crashed', 'critical', f'Exit code: 1\nTimestamp: {time.time()}')
```

---

## セキュリティ

### 通信セキュリティ

- ✅ **HTTPS 必須**: すべての通信は TLS 1.2+ で暗号化
- ✅ **SSL 証明書検証**: 有効な証明書を使用
- ✅ **HSTS**: Strict-Transport-Security ヘッダー有効

### アクセス制御

```nginx
# IP ホワイトリスト（オプション）
location /api/notify {
    # 許可する IP アドレス
    allow 10.0.0.0/8;      # プライベート IP
    allow 203.0.113.0/24;  # 特定の IP 範囲
    deny all;

    proxy_pass http://127.0.0.1:3000;
}
```

### レート制限

```nginx
# Nginx でレート制限設定
http {
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    server {
        location /api/notify {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://127.0.0.1:3000;
        }
    }
}
```

### 認証トークン（推奨）

**実装例**:

```javascript
// Express middleware
const API_TOKEN = process.env.API_TOKEN;

app.post('/api/notify', (req, res, next) => {
  const token = req.headers['x-api-token'];

  if (!token || token !== API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
});
```

**使用例**:
```bash
curl -X POST https://line-notification.com/api/notify \
  -H "Content-Type: application/json" \
  -H "X-API-Token: your-secret-token" \
  -d '{"message":"test"}'
```

### 機密情報管理

- ❌ **コミット禁止**: `.env` ファイルは Git にコミットしない
- ✅ **環境変数**: 機密情報は環境変数で管理
- ✅ **AWS Secrets Manager**: 本番環境では Secrets Manager 使用を推奨

---

## トラブルシューティング

### 1. 通知が届かない

#### 診断手順

```bash
# ステップ 1: サーバー疎通確認
curl -v https://line-notification.com/health

# ステップ 2: サービス状態確認
ssh line-notification.com
sudo systemctl status line-webhook
sudo systemctl status nginx

# ステップ 3: ログ確認
sudo journalctl -u line-webhook --since "1 hour ago"
sudo tail -f /var/log/nginx/line-notification.error.log

# ステップ 4: 手動通知テスト
curl -X POST https://line-notification.com/api/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"manual test","severity":"info","server":"test"}'
```

#### 原因と対処

| 症状 | 原因 | 対処 |
|------|------|------|
| `Connection refused` | サービスが停止 | `sudo systemctl start line-webhook` |
| `SSL certificate error` | 証明書期限切れ/無効 | 証明書を更新 |
| `403 Forbidden` | IP制限/認証エラー | Nginx設定確認 |
| `500 Internal Server Error` | アプリケーションエラー | ログを確認し修正 |
| メッセージは送信されるが届かない | LINE API 設定エラー | Channel Access Token 確認 |

### 2. 高負荷・パフォーマンス問題

```bash
# プロセス状態確認
ps aux | grep node
top -p $(pgrep -f "node index.js")

# メモリ使用量
free -h

# ディスク I/O
iostat -x 1 5

# ネットワーク接続
sudo netstat -tlnp | grep :3000
sudo ss -s
```

### 3. Nginx 関連

```bash
# Nginx 設定テスト
sudo nginx -t

# Nginx プロセス確認
sudo systemctl status nginx

# アクセスログ監視
sudo tail -f /var/log/nginx/line-notification.access.log

# エラーログ確認
sudo tail -f /var/log/nginx/line-notification.error.log
```

### 4. SSL 証明書問題

```bash
# 証明書有効期限確認
openssl x509 -in /etc/nginx/ssl/line-notification_com.crt -noout -dates

# 証明書チェーン確認
openssl s_client -connect line-notification.com:443 -showcerts

# 証明書と秘密鍵の整合性確認
openssl x509 -noout -modulus -in /etc/nginx/ssl/line-notification_com.crt | openssl md5
openssl rsa -noout -modulus -in /etc/nginx/ssl/line-notification.com.key | openssl md5
# 両方のMD5ハッシュが一致する必要がある
```

### 5. DNS 問題

```bash
# DNS 解決確認
nslookup line-notification.com
dig line-notification.com

# /etc/hosts 確認
cat /etc/hosts | grep line-notification
```

### 6. ファイアウォール問題

```bash
# Amazon Linux 2023 / RHEL
sudo firewall-cmd --list-all
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Ubuntu
sudo ufw status
sudo ufw allow 443/tcp
```

---

## メンテナンス

### 定期メンテナンス

#### 週次

```bash
# ログローテーション確認
sudo ls -lh /var/log/nginx/line-notification*.log
sudo ls -lh /var/log/vm-monitor.log

# ディスク使用量確認
df -h
```

#### 月次

```bash
# SSL 証明書有効期限確認（3ヶ月前に更新推奨）
openssl x509 -in /etc/nginx/ssl/line-notification_com.crt -noout -dates

# システムアップデート
sudo yum update -y
sudo systemctl restart nginx
sudo systemctl restart line-webhook

# ログアーカイブ
sudo tar -czf ~/logs-backup-$(date +%Y%m).tar.gz /var/log/nginx/line-notification*.log
```

### ログ管理

#### ログローテーション設定

```bash
# /etc/logrotate.d/line-notification 作成
sudo tee /etc/logrotate.d/line-notification > /dev/null <<'EOF'
/var/log/nginx/line-notification*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 nginx nginx
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1
    endscript
}

/var/log/vm-monitor.log {
    weekly
    rotate 12
    compress
    delaycompress
    notifempty
    create 0644 wombat wombat
}
EOF
```

### バックアップ

```bash
# 設定ファイルバックアップ
sudo tar -czf ~/line-notification-backup-$(date +%Y%m%d).tar.gz \
  /home/wombat/line-webhook \
  /etc/nginx/conf.d/line-notification.conf \
  /etc/systemd/system/line-webhook.service \
  /etc/nginx/ssl/*.crt \
  /etc/nginx/ssl/*.key

# バックアップをS3にアップロード（オプション）
aws s3 cp ~/line-notification-backup-$(date +%Y%m%d).tar.gz \
  s3://your-backup-bucket/line-notification/
```

### モニタリング

```bash
# サービス監視スクリプト（line-notification.com 上）
cat > ~/check-services.sh <<'EOF'
#!/bin/bash
services=("nginx" "line-webhook")
for service in "${services[@]}"; do
  if ! systemctl is-active --quiet "$service"; then
    echo "$service is DOWN!"
    # 自己通知は避ける（無限ループ防止）
  fi
done
EOF

chmod +x ~/check-services.sh
# cron: */5 * * * * ~/check-services.sh
```

### アップグレード手順

#### Node.js アップグレード

```bash
# 現在のバージョン確認
node --version

# 新バージョンインストール
nvm install 22
nvm use 22

# 依存関係再インストール
cd ~/line-webhook
npm install

# サービス再起動
sudo systemctl restart line-webhook

# 動作確認
curl https://line-notification.com/health
```

#### アプリケーションアップデート

```bash
# バックアップ作成
cp index.js index.js.backup

# 新しいコードをデプロイ
# (Git pull または ファイル置換)

# 依存関係アップデート
npm update

# サービス再起動
sudo systemctl restart line-webhook

# ログ確認
sudo journalctl -u line-webhook -f
```

---

## 管理者情報

### LINE Bot 設定

- **Channel Access Token**: `LINE_CHANNEL_ACCESS_TOKEN` (環境変数)
- **Channel Secret**: `LINE_CHANNEL_SECRET` (環境変数)
- **Admin User ID**: `Uab2a7efceaf0d9bb7b29c54c8664029b` (ハードコード)

### サーバー情報

- **ホスト名**: line-notification.com
- **IP アドレス**: 54.65.178.168
- **SSH ユーザー**: wombat
- **アプリケーションディレクトリ**: `/home/wombat/line-webhook`

### 重要なファイルパス

| パス | 説明 |
|------|------|
| `/home/wombat/line-webhook/index.js` | メインアプリケーション |
| `/home/wombat/line-webhook/.env` | 環境変数 |
| `/etc/systemd/system/line-webhook.service` | systemd ユニット |
| `/etc/nginx/conf.d/line-notification.conf` | Nginx 設定 |
| `/etc/nginx/ssl/` | SSL 証明書 |
| `/var/log/nginx/line-notification.*.log` | Nginx ログ |
| `/usr/local/bin/vm-monitor.sh` | VM 監視スクリプト |
| `/var/log/vm-monitor.log` | 監視ログ |

---

## 参考リンク

- [LINE Messaging API Documentation](https://developers.line.biz/ja/docs/messaging-api/)
- [LINE Bot SDK for Node.js](https://github.com/line/line-bot-sdk-nodejs)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [systemd Documentation](https://www.freedesktop.org/software/systemd/man/)

---

## 更新履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-10-13 | 2.1 | VM監視システム拡張: 定期ヘルスレポート機能追加、自動インストールスクリプト追加 |
| 2025-10-13 | 2.0 | 完全版ドキュメント作成: 詳細なセットアップガイド、API仕様、トラブルシューティング追加 |
| 2025-10-12 | 1.0 | 初版作成 |
