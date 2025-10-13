# VM Monitoring System

TechSapo サーバー用の包括的な監視システム - エラー検知と定期ヘルスレポート

## 概要

このシステムは2つのモードで動作し、グローバルElastic IPから逆引きされたFQDN、IPアドレス、EC2リージョン情報を通知に含めます：

### 1. エラー監視モード (`--mode check`)
- **実行間隔**: 5分ごと
- **通知**: エラー検知時のみ
- **監視項目**:
  - CPU 使用率 (warning: 80%, critical: 95%)
  - メモリ使用率 (warning: 85%, critical: 95%)
  - ディスク使用率 (warning: 85%, critical: 95%)
  - サービス状態 (nginx, techsapo)
  - システム負荷

### 2. 定期ヘルスレポート (`--mode report`)
- **実行間隔**: 2時間ごと
- **通知**: 常に通知（正常時も含む）
- **内容**: 全メトリクスのサマリーとサービス状態

## インストール

```bash
cd /ai/prj/techdev/scripts
sudo ./install-vm-monitor.sh
```

このスクリプトは自動的に以下を実行します：
1. vm-monitor.sh を `/usr/local/bin/` にコピー
2. ログファイル `/var/log/vm-monitor.log` を作成
3. systemd ユニット（2つの timer + 2つの service）をインストール
4. タイマーを有効化して起動

## 手動実行

```bash
# エラー監視モード（エラー時のみ通知）
/usr/local/bin/vm-monitor.sh --mode check

# ヘルスレポートモード（常に通知）
/usr/local/bin/vm-monitor.sh --mode report
```

## ログ確認

```bash
# スクリプトのログ
tail -f /var/log/vm-monitor.log

# systemd サービスログ
sudo journalctl -u vm-monitor-check.service -f
sudo journalctl -u vm-monitor-report.service -f

# タイマー状態確認
sudo systemctl list-timers vm-monitor-*
```

## 通知例

### エラー検知時の通知
```
⚠️ [TECHDEV (ec2-xx-xxx-xxx-xxx.ap-south-1.compute.amazonaws.com / xx.xxx.xxx.xxx / ap-south-1)]
CPU usage high: 85%

Current: 85%
Threshold: 80%
```

### 定期ヘルスレポート
```
✅ [TECHDEV (ec2-xx-xxx-xxx-xxx.ap-south-1.compute.amazonaws.com / xx.xxx.xxx.xxx / ap-south-1)]
Periodic Health Report: ✅ Healthy

🖥️ Server: ec2-xx-xxx-xxx-xxx.ap-south-1.compute.amazonaws.com (xx.xxx.xxx.xxx / ap-south-1)

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

**注**:
- FQDNはElastic IPの逆引きDNSから自動取得されます
- EC2インスタンスの場合、リージョン情報がIMDSv2経由で取得されます
- 非EC2環境ではリージョン情報は表示されません

## systemd ユニット

### タイマー
- `vm-monitor-check.timer` - エラー監視（5分ごと）
- `vm-monitor-report.timer` - ヘルスレポート（2時間ごと）

### サービス
- `vm-monitor-check.service` - エラー監視サービス
- `vm-monitor-report.service` - ヘルスレポートサービス

## 管理コマンド

### タイマーの管理
```bash
# 状態確認
sudo systemctl status vm-monitor-check.timer
sudo systemctl status vm-monitor-report.timer

# 停止
sudo systemctl stop vm-monitor-check.timer
sudo systemctl stop vm-monitor-report.timer

# 再開
sudo systemctl start vm-monitor-check.timer
sudo systemctl start vm-monitor-report.timer

# 無効化（起動時に自動開始しない）
sudo systemctl disable vm-monitor-check.timer
sudo systemctl disable vm-monitor-report.timer
```

### 実行間隔の変更

タイマーファイルを編集：
```bash
# エラー監視の間隔変更（デフォルト: 5分）
sudo vi /etc/systemd/system/vm-monitor-check.timer
# OnUnitActiveSec=5min → 好きな間隔に変更

# ヘルスレポートの間隔変更（デフォルト: 2時間）
sudo vi /etc/systemd/system/vm-monitor-report.timer
# OnUnitActiveSec=2h → 好きな間隔に変更

# 変更を反映
sudo systemctl daemon-reload
sudo systemctl restart vm-monitor-check.timer
sudo systemctl restart vm-monitor-report.timer
```

## しきい値の変更

スクリプトを編集：
```bash
sudo vi /usr/local/bin/vm-monitor.sh

# 以下の値を変更
readonly CPU_WARNING=80
readonly CPU_CRITICAL=95
readonly MEMORY_WARNING=85
readonly MEMORY_CRITICAL=95
readonly DISK_WARNING=85
readonly DISK_CRITICAL=95
```

## トラブルシューティング

### 通知が届かない

1. **スクリプトログ確認**:
   ```bash
   tail -50 /var/log/vm-monitor.log
   ```

2. **LINE通知サーバー確認**:
   ```bash
   curl -v https://line-notification.com/health
   ```

3. **手動テスト**:
   ```bash
   sudo /usr/local/bin/vm-monitor.sh --mode report
   ```

### タイマーが動作しない

1. **タイマー状態確認**:
   ```bash
   sudo systemctl status vm-monitor-check.timer
   sudo systemctl status vm-monitor-report.timer
   ```

2. **ログ確認**:
   ```bash
   sudo journalctl -u vm-monitor-check.timer -n 50
   sudo journalctl -u vm-monitor-report.timer -n 50
   ```

3. **再起動**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart vm-monitor-check.timer
   sudo systemctl restart vm-monitor-report.timer
   ```

## アンインストール

```bash
# タイマーを停止・無効化
sudo systemctl stop vm-monitor-check.timer vm-monitor-report.timer
sudo systemctl disable vm-monitor-check.timer vm-monitor-report.timer

# systemd ユニット削除
sudo rm /etc/systemd/system/vm-monitor-check.{timer,service}
sudo rm /etc/systemd/system/vm-monitor-report.{timer,service}
sudo systemctl daemon-reload

# スクリプト削除（オプション）
sudo rm /usr/local/bin/vm-monitor.sh
```

## ファイル構成

```
/ai/prj/techdev/scripts/
├── vm-monitor.sh                    # メイン監視スクリプト
├── install-vm-monitor.sh            # インストールスクリプト
└── systemd/
    ├── vm-monitor-check.service     # エラー監視サービス
    ├── vm-monitor-check.timer       # エラー監視タイマー
    ├── vm-monitor-report.service    # ヘルスレポートサービス
    └── vm-monitor-report.timer      # ヘルスレポートタイマー
```

## 関連ドキュメント

- [LINE Notification System](../docs/LINE_NOTIFICATION_SYSTEM.md) - LINE通知システムの詳細
- [Operational Scripts](../docs/OPERATIONAL_SCRIPTS.md) - その他の運用スクリプト

---

**作成日**: 2025-10-13
**バージョン**: 2.0
