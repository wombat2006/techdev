# 💾 ストレージ増設計画

## 📊 現在の使用状況

### ディスク使用率
```
Filesystem        Size  Used Avail Use% Mounted on
/dev/nvme0n1p1    8.0G  7.6G  401M  96% /     (ルートパーティション)
/dev/nvme2n1       15G  6.6G  8.4G  45% /ai   (プロジェクト領域)
/dev/nvme3n1       10G  5.3G  4.7G  54% /data (データ領域)
```

### 主要な使用内訳

#### /ai ディレクトリ (10GB中6.6GB使用)
```
総使用量: 10GB
├── TechSapo関連プロジェクト: 1.3GB
│   ├── /ai/prj/techdev: 666MB
│   ├── /ai/prj/techsapo-prod: 9.6MB (本番環境)
│   └── /ai/prj/techsapo: 566MB
├── その他プロジェクト: 8.7GB
│   ├── claude-code-webui: 2.1GB
│   ├── tech-helper: 1.8GB
│   ├── wall-bounce-tech-support-helper: 666MB
│   └── その他: 4.2GB
```

#### Node.js依存関係の大容量化
```
node_modules 使用量:
├── techdev: 566MB
├── techsapo: 566MB
├── techsapo-devel: 124MB
├── claude-code-webui: 350MB (client) + 108MB (server) + 723MB (cipher)
├── tech-helper: 380MB + 65MB (cipher)
└── その他: 合計約300MB
```

### ⚠️ 問題点

1. **ルートパーティション逼迫** (96%使用)
   - システム動作に支障をきたす可能性
   - ログファイル、一時ファイルの書き込み制限

2. **重複する依存関係**
   - 同じnode_modulesが複数プロジェクトに存在
   - 特にCipher関連で大容量の重複

3. **本番環境のリスク**
   - 本番環境用の書き込み可能領域 `/var/techsapo` の確保が困難

## 📈 必要容量の算出

### 短期的需要 (3ヶ月)
```
現在の使用量: 15.1GB (/ai: 10GB + /data: 5.1GB)
想定される増加:
├── 本番環境の運用データ: 2GB
│   ├── /var/techsapo/logs: 500MB
│   ├── /var/techsapo/session: 200MB
│   ├── /var/techsapo/cache: 300MB
│   └── /var/techsapo/tmp: 1GB
├── 開発環境の拡張: 3GB
│   ├── 新規MCP実装: 1GB
│   ├── テストデータ: 1GB
│   └── ビルド成果物: 1GB
├── バックアップ領域: 2GB
└── 安全マージン: 3GB
---
必要総容量: 25GB
```

### 中期的需要 (1年)
```
短期需要: 25GB
追加要求:
├── 複数環境対応: 5GB
│   ├── ステージング環境: 2GB
│   ├── テスト環境: 2GB
│   └── デモ環境: 1GB
├── ログ・メトリクス蓄積: 3GB
├── CI/CDアーティファクト: 2GB
└── 安全マージン: 5GB
---
必要総容量: 40GB
```

## 🔧 増設計画

### Phase 1: 緊急対応 (即時実行)

#### 1. ルートパーティション容量確保
```bash
# 不要なファイル削除
sudo apt clean                           # パッケージキャッシュ削除
sudo journalctl --vacuum-time=7d         # 古いログ削除
docker system prune -af                  # Docker不要データ削除 (利用している場合)

# 期待削減容量: 500MB-1GB
```

#### 2. 重複依存関係の最適化
```bash
# プロジェクト統合・整理
cd /ai/prj
rm -rf techsapo/node_modules            # 重複削除
ln -s techdev/node_modules techsapo/    # シンボリックリンク作成

# 期待削減容量: 566MB
```

#### 3. /ai パーティション拡張
```bash
# 現在: 15GB → 目標: 25GB (10GB増設)
# AWS EBS ボリューム拡張
aws ec2 modify-volume --volume-id vol-xxxxx --size 25

# ファイルシステム拡張
sudo growpart /dev/nvme2n1 1
sudo resize2fs /dev/nvme2n1
```

### Phase 2: 本番環境対応 (1週間以内)

#### 1. 専用書き込み領域の作成
```bash
# /var/techsapo 用に新しいパーティション作成
sudo mkdir -p /var/techsapo
sudo mount /dev/nvme4n1 /var/techsapo    # 新規EBSボリューム
sudo chown -R techsapo:techsapo /var/techsapo
sudo chmod -R 755 /var/techsapo
```

#### 2. バックアップ戦略
```bash
# 自動バックアップスクリプト
cat > /ai/prj/scripts/backup-storage.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/data/backup/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# プロジェクトコードのバックアップ
tar czf "$BACKUP_DIR/projects.tar.gz" /ai/prj/techdev /ai/prj/techsapo-prod

# 設定ファイルのバックアップ
tar czf "$BACKUP_DIR/configs.tar.gz" ~/.claude.json ~/.codex/

# 古いバックアップ削除 (30日以上)
find /data/backup -type d -mtime +30 -exec rm -rf {} +
EOF

chmod +x /ai/prj/scripts/backup-storage.sh
```

### Phase 3: 最適化 (1ヶ月以内)

#### 1. ストレージ階層化
```
高速ストレージ (SSD):
├── /ai/prj/techdev (開発環境)
├── /ai/prj/techsapo-prod (本番環境)
└── /var/techsapo (本番書き込み領域)

標準ストレージ (GP2):
├── /data (各種データ)
├── バックアップ
└── アーカイブ

低速ストレージ (SC1):
├── 長期ログ保管
└── 非アクティブプロジェクト
```

#### 2. 自動クリーンアップ
```bash
# 定期クリーンアップスクリプト
cat > /ai/prj/scripts/storage-cleanup.sh << 'EOF'
#!/bin/bash

# ログファイル整理 (30日以上削除)
find /var/techsapo/logs -name "*.log" -mtime +30 -delete

# 一時ファイル削除 (7日以上)
find /var/techsapo/tmp -type f -mtime +7 -delete

# セッションファイル削除 (1日以上)
find /var/techsapo/session -type f -mtime +1 -delete

# node_modules最適化
npm cache clean --force
npx yarn cache clean
EOF

# crontabに登録
echo "0 2 * * * /ai/prj/scripts/storage-cleanup.sh" | crontab -
```

## 💰 コスト見積もり

### AWS EBS追加コスト
```
Phase 1: /ai 拡張 (15GB → 25GB)
└── 追加10GB × $0.10/GB/月 = $1.00/月

Phase 2: 本番書き込み用 (新規5GB)
└── 5GB × $0.10/GB/月 = $0.50/月

Phase 3: バックアップ用 (新規10GB)
└── 10GB × $0.10/GB/月 = $1.00/月

月額合計追加コスト: $2.50
年額合計追加コスト: $30.00
```

## 📅 実行スケジュール

### Week 1: 緊急対応
- [ ] Day 1: 不要ファイル削除・重複整理
- [ ] Day 2: /ai パーティション拡張
- [ ] Day 3: 動作確認・監視設定

### Week 2: 本番対応
- [ ] Day 8: 本番書き込み領域作成
- [ ] Day 9: バックアップ体制構築
- [ ] Day 10: 本番環境テスト

### Week 3-4: 最適化
- [ ] Day 15: ストレージ階層化実装
- [ ] Day 20: 自動クリーンアップ設定
- [ ] Day 25: 監視・アラート完成
- [ ] Day 30: 運用手順書完成

## 🔍 監視・アラート

### 容量監視スクリプト
```bash
#!/bin/bash
# /ai/prj/scripts/storage-monitor.sh

THRESHOLD=80  # 80%以上で警告

df -h | while read filesystem size used avail use mountpoint; do
    if [[ $use =~ ^[0-9]+% ]]; then
        usage=${use%\%}
        if [[ $usage -gt $THRESHOLD ]]; then
            echo "WARNING: $mountpoint is ${usage}% full"
            logger "Storage warning: $mountpoint at ${usage}%"
        fi
    fi
done
```

### 自動アラート設定
```bash
# crontabに追加
*/30 * * * * /ai/prj/scripts/storage-monitor.sh
```

## 🎯 成功指標

- ✅ ルートパーティション使用率 < 70%
- ✅ /ai パーティション使用率 < 60%
- ✅ 本番環境の安定動作
- ✅ バックアップ完全性 100%
- ✅ コスト予算内収束 ($30/年以下)

この計画により、論理分離を維持しながら十分なストレージ容量を確保し、安全で持続可能な運用を実現できます。