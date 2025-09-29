# 🔒 読み取り専用システム設計

## 📋 基本原則

**重要**: パーミッション444でもシステムがエラーなく動作する設計

## 🗂️ ディレクトリ構成

### 読み取り専用領域
```
/app/techsapo-prod/
├── src/                    # 444 (読み取り専用)
├── dist/                   # 444 (読み取り専用)
├── config/                 # 444 (読み取り専用)
├── package.json            # 444 (読み取り専用)
└── node_modules/           # 444 (読み取り専用)
```

### 書き込み可能領域
```
/var/techsapo/
├── logs/                   # 755 (ログ出力用)
├── tmp/                    # 755 (一時ファイル用)
├── session/                # 755 (セッションデータ用)
└── cache/                  # 755 (キャッシュ用)
```

## 🔧 アプリケーション設計

### 1. ログ出力の分離

```typescript
// src/utils/logger.ts
import winston from 'winston';
import path from 'path';

// 読み取り専用領域外にログ出力
const LOG_DIR = process.env.LOG_DIR || '/var/techsapo/logs';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // コンソール出力（開発用）
    new winston.transports.Console(),

    // ファイル出力（本番用・書き込み可能領域）
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log')
    })
  ]
});
```

### 2. 一時ファイルの処理

```typescript
// src/services/temp-file-manager.ts
import fs from 'fs';
import path from 'path';
import os from 'os';

class TempFileManager {
  private tempDir: string;

  constructor() {
    // 書き込み可能な一時ディレクトリを使用
    this.tempDir = process.env.TEMP_DIR || '/var/techsapo/tmp';

    // 起動時にディレクトリ存在確認（作成はしない）
    if (!fs.existsSync(this.tempDir)) {
      throw new Error(`Temp directory ${this.tempDir} does not exist`);
    }
  }

  createTempFile(content: string): string {
    const tempFile = path.join(this.tempDir, `temp_${Date.now()}.json`);
    fs.writeFileSync(tempFile, content);
    return tempFile;
  }

  cleanup(): void {
    // 古い一時ファイルの削除
    const files = fs.readdirSync(this.tempDir);
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24時間前

    files.forEach(file => {
      const filePath = path.join(this.tempDir, file);
      const stats = fs.statSync(filePath);
      if (stats.mtime.getTime() < cutoff) {
        fs.unlinkSync(filePath);
      }
    });
  }
}
```

### 3. セッション管理の外部化

```typescript
// src/services/session-manager.ts
import fs from 'fs';
import path from 'path';

class ReadOnlySessionManager {
  private sessionDir: string;

  constructor() {
    // セッションデータは書き込み可能領域に保存
    this.sessionDir = process.env.SESSION_DIR || '/var/techsapo/session';
  }

  async saveSession(sessionId: string, data: any): Promise<void> {
    const sessionFile = path.join(this.sessionDir, `${sessionId}.json`);
    await fs.promises.writeFile(sessionFile, JSON.stringify(data));
  }

  async loadSession(sessionId: string): Promise<any> {
    try {
      const sessionFile = path.join(this.sessionDir, `${sessionId}.json`);
      const data = await fs.promises.readFile(sessionFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null; // セッションが存在しない場合
    }
  }
}
```

### 4. キャッシュの外部化

```typescript
// src/services/cache-manager.ts
import fs from 'fs';
import path from 'path';

class FileCache {
  private cacheDir: string;

  constructor() {
    this.cacheDir = process.env.CACHE_DIR || '/var/techsapo/cache';
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    const cacheFile = path.join(this.cacheDir, `${key}.cache`);
    const data = {
      value,
      expires: Date.now() + (ttl * 1000)
    };

    await fs.promises.writeFile(cacheFile, JSON.stringify(data));
  }

  async get(key: string): Promise<any> {
    try {
      const cacheFile = path.join(this.cacheDir, `${key}.cache`);
      const raw = await fs.promises.readFile(cacheFile, 'utf-8');
      const data = JSON.parse(raw);

      if (Date.now() > data.expires) {
        await fs.promises.unlink(cacheFile);
        return null;
      }

      return data.value;
    } catch (error) {
      return null;
    }
  }
}
```

## 🚀 起動スクリプト

### 本番環境用起動スクリプト

```bash
#!/bin/bash
# scripts/start-production.sh

# 必要なディレクトリの作成
mkdir -p /var/techsapo/logs
mkdir -p /var/techsapo/tmp
mkdir -p /var/techsapo/session
mkdir -p /var/techsapo/cache

# 権限設定
chown -R techsapo:techsapo /var/techsapo
chmod -R 755 /var/techsapo

# 環境変数設定
export NODE_ENV=production
export LOG_DIR=/var/techsapo/logs
export TEMP_DIR=/var/techsapo/tmp
export SESSION_DIR=/var/techsapo/session
export CACHE_DIR=/var/techsapo/cache

# アプリケーション起動
cd /app/techsapo-prod
node dist/index.js
```

### 設定の検証

```typescript
// src/config/readonly-validation.ts
import fs from 'fs';

export function validateReadOnlyEnvironment(): void {
  const checks = [
    // 読み取り専用領域への書き込み試行
    {
      name: 'Source directory readonly',
      test: () => {
        try {
          fs.writeFileSync('/app/techsapo-prod/test.txt', 'test');
          return false; // 書き込めてしまった場合はエラー
        } catch {
          return true; // 書き込めないことを確認
        }
      }
    },

    // 書き込み可能領域の確認
    {
      name: 'Log directory writable',
      test: () => {
        try {
          const logDir = process.env.LOG_DIR || '/var/techsapo/logs';
          fs.writeFileSync(`${logDir}/test.log`, 'test');
          fs.unlinkSync(`${logDir}/test.log`);
          return true;
        } catch {
          return false;
        }
      }
    }
  ];

  checks.forEach(check => {
    if (!check.test()) {
      throw new Error(`Environment validation failed: ${check.name}`);
    }
  });

  console.log('✅ Read-only environment validation passed');
}
```

## 📋 デプロイ手順

### 1. ファイル配置

```bash
# アプリケーションファイル（読み取り専用）
sudo cp -r /build/techsapo-prod /app/
sudo chown -R root:root /app/techsapo-prod
sudo chmod -R 444 /app/techsapo-prod/src
sudo chmod -R 444 /app/techsapo-prod/dist
sudo chmod -R 444 /app/techsapo-prod/config
sudo chmod 444 /app/techsapo-prod/package.json

# 実行権限は維持
sudo chmod 555 /app/techsapo-prod/scripts/start-production.sh
```

### 2. 作業領域作成

```bash
# 書き込み可能領域の作成
sudo mkdir -p /var/techsapo/{logs,tmp,session,cache}
sudo chown -R techsapo:techsapo /var/techsapo
sudo chmod -R 755 /var/techsapo
```

### 3. サービス起動

```bash
# 環境検証を含む起動
sudo -u techsapo /app/techsapo-prod/scripts/start-production.sh
```

## 🔍 監視・確認

### ファイルシステム監視

```typescript
// src/monitoring/filesystem-monitor.ts
import fs from 'fs';

export class FilesystemMonitor {
  static checkReadOnlyIntegrity(): boolean {
    const protectedPaths = [
      '/app/techsapo-prod/src',
      '/app/techsapo-prod/dist',
      '/app/techsapo-prod/config'
    ];

    return protectedPaths.every(path => {
      try {
        const stats = fs.statSync(path);
        // 書き込み権限がないことを確認
        return (stats.mode & 0o200) === 0;
      } catch {
        return false;
      }
    });
  }
}
```

## 🎯 成果

- ✅ 444パーミッションでもエラーなし
- ✅ ログ・一時ファイル・セッション・キャッシュは外部領域
- ✅ アプリケーションコードは完全保護
- ✅ 起動時の環境検証
- ✅ シンプルで確実な運用

この設計により、読み取り専用制約下でも安定動作する本番システムを実現できます。