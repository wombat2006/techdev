# AWS Secrets Manager セットアップガイド

TechSapoアプリケーションでAWS Secrets Managerを使用して環境変数を管理する方法

---

## 📋 概要

### なぜAWS Secrets Managerを使用するのか？

- **セキュリティ**: `.env`ファイルをGitリポジトリから除外し、機密情報を安全に管理
- **自動ローテーション**: APIキーの定期的な自動更新が可能
- **監査ログ**: CloudTrailでシークレットアクセスの完全な監査証跡
- **暗号化**: KMSによる暗号化、転送中・保管中の両方で保護
- **一元管理**: 複数環境（dev/staging/prod）のシークレットを統一的に管理

### アーキテクチャ

```
┌─────────────────┐         ┌──────────────────────┐
│  TechSapo App   │         │  AWS Secrets Manager │
│  (EC2/Lambda)   │──GET───>│  techsapo/production │
│                 │<─JSON──┤  (暗号化済み)        │
└─────────────────┘         └──────────────────────┘
        │                            │
        │                            │ KMS暗号化
        │                            ▼
        │                   ┌──────────────────┐
        └─── Cache ────────>│  メモリキャッシュ │
           (5分TTL)          │  (TTL: 5分)      │
                            └──────────────────┘
```

---

## 🚀 セットアップ手順

### 1. AWS IAM権限設定

TechSapoアプリケーションを実行するEC2インスタンスまたはLambda関数に以下のIAMポリシーをアタッチ:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:techsapo/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/your-kms-key-id"
    }
  ]
}
```

**EC2の場合**: IAMロールをEC2インスタンスにアタッチ
**Lambda の場合**: Lambda実行ロールに上記ポリシーを追加

### 2. .envファイルからシークレットを移行

#### Dry Run（テスト実行）

```bash
npm run migrate-secrets:dry-run
```

出力例:
```
🔐 AWS Secrets Manager Migration Tool

📂 Loading secrets from: /ai/prj/techdev/.env
✅ All required secrets present

📋 Secrets to be migrated:
────────────────────────────────────────────────────────────
  HUGGINGFACE_API_KEY: hf_BVtcG...TjOl
  OPENROUTER_API_KEY: sk-or-v1...8797
  UPSTASH_REDIS_REST_URL: https://k...io
  UPSTASH_REDIS_REST_TOKEN: AS5mAAI...2MTE4Nzg
────────────────────────────────────────────────────────────
Total secrets: 15

🔍 Dry run mode - no actual upload will be performed

Target:
  Secret Name: techsapo/production
  AWS Region:  us-east-1
  Operation:   CREATE

✅ Dry run completed successfully
```

#### 本番実行（新規作成）

```bash
npm run migrate-secrets -- --secret-name techsapo/production --region us-east-1
```

#### 既存シークレット更新

```bash
npm run migrate-secrets:update -- --secret-name techsapo/production --region us-east-1
```

### 3. アプリケーション環境変数設定

アプリケーション起動時に以下の環境変数を設定:

```bash
# AWS Secrets Manager有効化
export USE_AWS_SECRETS_MANAGER=true

# シークレット名
export AWS_SECRET_NAME=techsapo/production

# AWSリージョン
export AWS_REGION=us-east-1

# （オプション）AWS認証情報（EC2 IAMロール使用時は不要）
# export AWS_ACCESS_KEY_ID=AKIA...
# export AWS_SECRET_ACCESS_KEY=...
```

### 4. アプリケーション起動

```bash
npm run build
npm start
```

ログ出力例:
```
2025-01-15T10:30:00.000Z info: AWS Secrets Manager initialized {
  region: 'us-east-1',
  secretName: 'techsapo/production',
  cacheTTL: 300000
}
2025-01-15T10:30:01.234Z info: ✅ Secrets fetched from AWS Secrets Manager {
  secretName: 'techsapo/production',
  keysCount: 15
}
2025-01-15T10:30:01.345Z info: ✅ Secrets loaded into process.env {
  keysCount: 15
}
2025-01-15T10:30:02.000Z info: Server started successfully {
  port: 4000,
  environment: 'production',
  version: '1.0.0',
  secretsSource: 'AWS Secrets Manager'
}
```

---

## 🔄 ハイブリッドモード（推奨開発環境）

開発環境では`.env`ファイル、本番環境ではAWS Secrets Managerを使用:

```bash
# 開発環境
export USE_AWS_SECRETS_MANAGER=false
npm run dev
```

```bash
# 本番環境
export USE_AWS_SECRETS_MANAGER=true
export AWS_SECRET_NAME=techsapo/production
export AWS_REGION=us-east-1
npm start
```

---

## 📚 シークレット構造

AWS Secrets Managerに保存されるJSON構造:

```json
{
  "HUGGINGFACE_API_KEY": "hf_xxx",
  "OPENROUTER_API_KEY": "sk-or-v1-xxx",
  "OPENAI_API_KEY": "sk-proj-xxx",
  "GOOGLE_API_KEY": "AIza-xxx",
  "GEMINI_API_KEY": "AIza-xxx",
  "CONTEXT7_API_KEY": "ctx7sk-xxx",
  "UPSTASH_REDIS_REST_URL": "https://xxx.upstash.io",
  "UPSTASH_REDIS_REST_TOKEN": "AXX_xxx",
  "MYSQL_HOST": "localhost",
  "MYSQL_PORT": "3306",
  "MYSQL_USER": "root",
  "MYSQL_PASSWORD": "secure-password",
  "MYSQL_DATABASE": "techsapo",
  "GOOGLE_CLIENT_ID": "xxx.apps.googleusercontent.com",
  "GOOGLE_CLIENT_SECRET": "GOCSPX-xxx",
  "GOOGLE_REFRESH_TOKEN": "1//xxx",
  "GOOGLE_WEBHOOK_TOKEN": "random-secret-xxx",
  "LOG_LEVEL": "info",
  "MONTHLY_BUDGET_LIMIT": "70",
  "COST_ALERT_THRESHOLD": "0.8"
}
```

---

## 🔧 トラブルシューティング

### エラー: `ResourceNotFoundException`

**原因**: 指定されたシークレットが存在しない

**解決策**:
```bash
# シークレット名を確認
aws secretsmanager list-secrets --region us-east-1 | grep techsapo

# または新規作成
npm run migrate-secrets -- --secret-name techsapo/production --region us-east-1
```

### エラー: `AccessDeniedException`

**原因**: IAM権限不足

**解決策**:
```bash
# IAMロールのポリシーを確認
aws iam get-role-policy --role-name TechSapoEC2Role --policy-name SecretsManagerAccess

# 権限付与
aws iam put-role-policy --role-name TechSapoEC2Role \
  --policy-name SecretsManagerAccess \
  --policy-document file://secrets-manager-policy.json
```

### エラー: `DecryptionFailure`

**原因**: KMSキーへのアクセス権限なし

**解決策**:
```bash
# KMSキーポリシーに以下を追加
{
  "Sid": "Allow TechSapo to decrypt",
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::123456789012:role/TechSapoEC2Role"
  },
  "Action": "kms:Decrypt",
  "Resource": "*"
}
```

### キャッシュクリア

シークレットを更新した場合、アプリケーションを再起動するかキャッシュTTL（5分）を待つ:

```bash
# 再起動
systemctl restart techsapo

# または、キャッシュTTLを短縮
export SECRETS_CACHE_TTL=60000  # 1分
```

---

## 💰 コスト試算

### AWS Secrets Manager料金

- **シークレット保存**: $0.40/月/シークレット
- **API呼び出し**: $0.05/10,000回

### TechSapo 試算

- **シークレット数**: 1個（`techsapo/production`）
- **API呼び出し**: 約8,640回/月（5分キャッシュ、24時間稼働）

**月額コスト**: $0.40 + ($0.05 × 0.864) = **$0.44/月**

---

## 🔐 セキュリティベストプラクティス

### 1. 最小権限の原則

```json
{
  "Effect": "Allow",
  "Action": [
    "secretsmanager:GetSecretValue"
  ],
  "Resource": "arn:aws:secretsmanager:*:*:secret:techsapo/production-*"
}
```

### 2. VPCエンドポイント使用（推奨）

```bash
# VPCエンドポイント作成
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxx \
  --service-name com.amazonaws.us-east-1.secretsmanager \
  --route-table-ids rtb-xxx \
  --subnet-ids subnet-xxx
```

### 3. 自動ローテーション設定

```bash
# Lambda関数でローテーション
aws secretsmanager rotate-secret \
  --secret-id techsapo/production \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:xxx:function:TechSapoRotate \
  --rotation-rules AutomaticallyAfterDays=30
```

### 4. CloudTrail監査

すべてのシークレットアクセスがCloudTrailに記録されます:

```json
{
  "eventName": "GetSecretValue",
  "eventSource": "secretsmanager.amazonaws.com",
  "requestParameters": {
    "secretId": "techsapo/production"
  },
  "userIdentity": {
    "arn": "arn:aws:sts::123456789012:assumed-role/TechSapoEC2Role/i-xxx"
  }
}
```

---

## 📖 API リファレンス

### `AWSSecretsManagerService`

#### `getSecrets(): Promise<TechSapoSecrets>`

すべてのシークレットを取得（キャッシュ付き）

```typescript
import { getSecretsManager } from './services/aws-secrets-manager';

const secretsManager = getSecretsManager();
const secrets = await secretsManager.getSecrets();
console.log(secrets.HUGGINGFACE_API_KEY);
```

#### `getSecret(key): Promise<string | undefined>`

特定キーのシークレットを取得

```typescript
const apiKey = await secretsManager.getSecret('OPENROUTER_API_KEY');
```

#### `updateSecret(secrets): Promise<void>`

シークレットを更新

```typescript
await secretsManager.updateSecret({
  HUGGINGFACE_API_KEY: 'hf_new_key_xxx'
});
```

#### `invalidateCache(): void`

キャッシュを無効化

```typescript
secretsManager.invalidateCache();
```

---

## 🔗 関連リンク

- [AWS Secrets Manager公式ドキュメント](https://docs.aws.amazon.com/secretsmanager/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/secrets-manager/)
- [IAM Policies for Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html)
- [Secrets Manager Pricing](https://aws.amazon.com/secrets-manager/pricing/)

---

**最終更新**: 2025年1月
**対象バージョン**: TechSapo v1.0+
