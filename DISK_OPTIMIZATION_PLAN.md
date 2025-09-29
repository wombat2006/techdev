# TechSapo ディスク使用量最適化計画

## 🚨 現在の状況
- **ルートパーティション (/)**: 88% 使用 (7.0GB/8.0GB)
- **残り容量**: わずか1.1GB - 危険水域
- **主要な容量消費要因**: node_modules (582MB)

## 📊 ディスク使用量詳細
```
582M  node_modules      (主要問題)
7.5M  logs              (移動対象)
1.6M  dist              (移動対象)
124K  data              (小容量)
804K  src               (保持)
```

## 🎯 利用可能な移動先
| マウントポイント | 使用率 | 空き容量 | 推奨用途 |
|-----------------|--------|----------|----------|
| `/data` | 56% | 4.5GB | ログ、永続データ |
| `/ai` | 40% | 9.1GB | プロジェクト関連 |
| `/tmp` | 1% | 3.8GB | 一時ファイル |

## 🔧 推奨解決策 (優先度順)

### 【最優先】1. node_modules の移動
```bash
# node_modules を /data に移動してシンボリックリンク作成
sudo mkdir -p /data/techsapo-deps
sudo mv /ai/prj/techsapo/node_modules /data/techsapo-deps/
sudo ln -s /data/techsapo-deps/node_modules /ai/prj/techsapo/node_modules
```
**効果**: 582MB削減 → 使用率 81%に改善

### 【高優先】2. logs ディレクトリの移動
```bash
# ログファイルを /data に移動
sudo mkdir -p /data/techsapo-logs
sudo mv /ai/prj/techsapo/logs/* /data/techsapo-logs/
sudo rmdir /ai/prj/techsapo/logs
sudo ln -s /data/techsapo-logs /ai/prj/techsapo/logs
```
**効果**: 7.5MB削減

### 【中優先】3. dist ディレクトリの最適化
```bash
# ビルド成果物を /tmp に配置
rm -rf /ai/prj/techsapo/dist
mkdir -p /tmp/techsapo-build
ln -s /tmp/techsapo-build /ai/prj/techsapo/dist
```
**効果**: 1.6MB削減 + 将来のビルド成果物も /tmp に

### 【低優先】4. 追加の最適化
- **package-lock.json**: 452KB (保持推奨)
- **.git最適化**: `git gc --aggressive` でサイズ縮小
- **キャッシュクリーニング**: 定期的な不要ファイル削除

## ⚠️ 実行時の注意点

### 1. サービス停止
```bash
# TechSapoサーバーを一時停止
sudo systemctl stop techsapo  # または適切な停止方法
```

### 2. バックアップ
```bash
# 重要データのバックアップ
sudo tar -czf /data/techsapo-backup-$(date +%Y%m%d).tar.gz /ai/prj/techsapo
```

### 3. 権限設定
```bash
# 移動後の権限確認
sudo chown -R wombat:wombat /data/techsapo-*
```

### 4. 動作確認
```bash
# npm install の動作確認
cd /ai/prj/techsapo && npm install --dry-run
# ビルドの動作確認
npm run build
```

## 📈 期待される効果

| 対策 | 削減量 | 累積削減 | 予想使用率 |
|------|--------|----------|-----------|
| 初期状態 | - | - | 88% |
| node_modules移動 | 582MB | 582MB | 81% |
| logs移動 | 7.5MB | 590MB | 80% |
| dist最適化 | 1.6MB | 592MB | 79% |

## 🔄 将来の維持管理

### 定期メンテナンス
```bash
# 月次実行スクリプト例
#!/bin/bash
# /data/scripts/cleanup-techsapo.sh
cd /ai/prj/techsapo
npm cache clean --force
rm -rf /tmp/techsapo-build/*
git gc --auto
find /data/techsapo-logs -name "*.log" -mtime +30 -delete
```

### 監視設定
```bash
# ディスク使用量アラート (cron)
0 */6 * * * df -h / | awk 'NR==2 {if($5+0 > 85) print "WARNING: Root partition usage: " $5}'
```

## ✅ 実行チェックリスト
- [ ] 現在の稼働サービス確認
- [ ] バックアップ作成
- [ ] node_modules 移動実行
- [ ] シンボリックリンク作成
- [ ] 権限設定確認
- [ ] 動作テスト実行
- [ ] 監視設定追加

## 🎯 最終目標
**ルートパーティション使用率を 79% 以下に削減**
- 安全な運用マージン確保
- 将来の成長に備えた余裕作り
- システム安定性の向上