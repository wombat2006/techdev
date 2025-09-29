# 🚀 シンプル本番配置戦略

## 📋 基本原則

**制約事項:**
1. 公開システムは自分自身を書き換えてはいけない
2. 追加で学習してはいけない（セッション内反映は可）
3. スケーラビリティ・サニタイズ・可用性は検討対象外

## 🏗️ 最小構成アーキテクチャ

```
[開発環境]          [本番環境]
techdev/            techsapo-prod/
├── 書き換え可能    ├── 読み取り専用
├── ローカルMCP     ├── 外部MCPサーバ
├── 学習・実験      ├── 固定設定
└── フル機能        └── 制限された機能
```

## 🔒 本番環境の制約実装

### 1. ファイルシステム制約

```bash
# 本番デプロイ時
chmod -R 444 /app/src/       # ソースコード読み取り専用
chmod -R 444 /app/dist/      # ビルド成果物読み取り専用
chmod -R 444 /app/config/    # 設定ファイル読み取り専用
```

### 2. 環境変数による制御

```bash
# 本番環境変数
NODE_ENV=production
ALLOW_CODE_MODIFICATION=false
ALLOW_LEARNING=false
ALLOW_FILE_WRITE=false
SESSION_LEARNING_ONLY=true
```

### 3. アプリケーションレベル制御

```typescript
// src/config/production-constraints.ts
export const PRODUCTION_CONSTRAINTS = {
  // 自己変更の禁止
  allowCodeModification: process.env.ALLOW_CODE_MODIFICATION === 'true',
  allowFileWrite: process.env.ALLOW_FILE_WRITE === 'true',

  // 学習の制限
  allowPersistentLearning: process.env.ALLOW_LEARNING === 'true',
  allowSessionLearning: process.env.SESSION_LEARNING_ONLY === 'true',

  // 許可された操作
  allowedOperations: ['read', 'analyze', 'session-memory']
};

// 実行時チェック
function validateOperation(operation: string): boolean {
  if (!PRODUCTION_CONSTRAINTS.allowCodeModification &&
      operation.includes('fs.write')) {
    throw new Error('File modification not allowed in production');
  }

  if (!PRODUCTION_CONSTRAINTS.allowPersistentLearning &&
      operation.includes('persist')) {
    throw new Error('Persistent learning not allowed in production');
  }

  return true;
}
```

## 📁 ディレクトリ構成

### 開発環境 (現在)
```
/ai/prj/techdev/
├── src/                    # 開発可能
├── docs/                   # 更新可能
├── .env                    # ローカル設定
├── package.json            # 依存関係変更可
└── scripts/                # 開発スクリプト
```

### 本番環境 (新規)
```
/app/techsapo-prod/
├── src/                    # 読み取り専用
├── dist/                   # ビルド済み
├── config/
│   ├── production.env      # 固定設定
│   └── mcp-servers.json    # 外部MCPサーバ設定
├── package.json            # 固定依存関係
└── logs/                   # ログのみ書き込み可
```

## 🔄 デプロイプロセス

### 1. ビルド・パッケージング

```bash
# 開発環境でのビルド
npm run build
npm test
npm run lint

# 本番パッケージ作成
tar czf techsapo-prod.tar.gz dist/ config/ package.json
```

### 2. 本番環境デプロイ

```bash
# 本番サーバでの展開
cd /app
tar xzf techsapo-prod.tar.gz
chmod -R 444 dist/ config/
chmod 644 package.json

# 依存関係インストール（本番のみ）
npm ci --only=production

# 読み取り専用で起動
NODE_ENV=production npm start
```

### 3. MCP設定の分離

**開発環境 MCP:**
```json
{
  "servers": {
    "cipher": "npx @byterover/cipher --mode mcp",
    "serena": "uv run serena start-mcp-server",
    "codex": "codex mcp serve"
  }
}
```

**本番環境 MCP:**
```json
{
  "servers": {
    "cipher": "http://mcp-cipher.internal:8001",
    "serena": "http://mcp-serena.internal:8002",
    "codex": "http://mcp-codex.internal:8003"
  },
  "readonly": true,
  "learning_disabled": true
}
```

## 🎯 セッション内学習の実装

```typescript
// セッション内のみの一時的記憶
class SessionMemory {
  private sessionData = new Map<string, any>();

  // セッション内での学習・記憶（永続化なし）
  learn(key: string, value: any): void {
    if (!PRODUCTION_CONSTRAINTS.allowSessionLearning) {
      throw new Error('Session learning disabled');
    }

    this.sessionData.set(key, value);
    // 重要: ファイルやDBには保存しない
  }

  // セッション終了時にクリア
  clearSession(): void {
    this.sessionData.clear();
  }
}

// Wall-Bounce分析での一時反映
class ProductionWallBounce {
  private sessionMemory = new SessionMemory();

  async analyze(input: string): Promise<string> {
    // 1. セッション内記憶を参照
    const context = this.sessionMemory.get('analysis_context') || {};

    // 2. 他のLLMの思考を一時的に反映
    const analysisResult = await this.performAnalysis(input, context);

    // 3. セッション内のみ記憶（永続化しない）
    this.sessionMemory.learn('latest_analysis', analysisResult);

    return analysisResult;
  }
}
```

## 📊 簡易監視

```typescript
// 最小限の監視
const SIMPLE_METRICS = {
  fileWriteAttempts: 0,
  learningAttempts: 0,
  sessionCount: 0
};

function logSecurityEvent(event: string): void {
  console.error(`[SECURITY] ${new Date().toISOString()}: ${event}`);

  if (event.includes('file_write')) {
    SIMPLE_METRICS.fileWriteAttempts++;
  }

  if (event.includes('persistent_learning')) {
    SIMPLE_METRICS.learningAttempts++;
  }
}
```

## 🚀 移行手順

### Step 1: 本番リポジトリ作成
```bash
# 新しい本番用リポジトリ
git clone /ai/prj/techdev /app/techsapo-prod
cd /app/techsapo-prod

# 本番設定に変更
echo "NODE_ENV=production" > .env.production
echo "ALLOW_CODE_MODIFICATION=false" >> .env.production
echo "ALLOW_LEARNING=false" >> .env.production
echo "SESSION_LEARNING_ONLY=true" >> .env.production
```

### Step 2: 制約の適用
```bash
# ファイル権限設定
chmod -R 444 src/ dist/ config/
chmod 644 package.json .env.production

# 本番起動テスト
NODE_ENV=production npm start
```

### Step 3: MCP外部化
- Cipher, Serena, Codex を別サーバに配置
- 本番TechSapoからHTTP API経由でアクセス

## 🎯 成果物

- **開発環境**: 現在の `/ai/prj/techdev` を維持（フル機能）
- **本番環境**: 新規 `/app/techsapo-prod` を作成（制約付き）
- **分離**: 自己変更・永続学習の完全禁止
- **シンプル**: 複雑な仕組みは使わない

この最小構成で、安全な本番運用が可能です。