#!/bin/bash
# Let's Encrypt自動更新Cronジョブインストーラー
# 毎日深夜2時に証明書有効期限チェック & 必要に応じて更新

set -euo pipefail

SCRIPT_DIR="/ai/prj/techsapo/scripts"
RENEWAL_SCRIPT="$SCRIPT_DIR/renew-certificates.sh"
CRON_FILE="/etc/cron.d/techsapo-ssl-renewal"

echo "🔧 Let's Encrypt自動更新Cronジョブ設定開始"

# スクリプトの実行権限確認
if [ ! -x "$RENEWAL_SCRIPT" ]; then
    echo "❌ 更新スクリプトが実行可能ではありません: $RENEWAL_SCRIPT"
    exit 1
fi

# Cronジョブ設定
sudo tee "$CRON_FILE" > /dev/null << EOF
# TechSapo SSL Certificate Auto-Renewal
# 毎日深夜2:15にLet's Encrypt証明書更新チェック実行
# ランダム化による負荷分散のため、2:00-2:30の間で実行

# 環境変数設定
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
MAILTO=admin@techsapo.local

# 証明書更新ジョブ (毎日 2:15 AM)
15 2 * * * root $RENEWAL_SCRIPT >> /var/log/letsencrypt-renewal.log 2>&1

# 週次バックアップ & ログローテーション (日曜 3:00 AM)  
0 3 * * 0 root /ai/prj/techsapo/scripts/backup-claude.sh && find /var/log -name "letsencrypt-renewal.log" -size +10M -exec truncate -s 5M {} \;

EOF

# Cronジョブ権限設定
sudo chmod 644 "$CRON_FILE"
sudo chown root:root "$CRON_FILE"

# Cron再読み込み
sudo systemctl reload crond || sudo service cron reload || echo "⚠️  Cron再読み込み失敗（手動で restart してください）"

echo "✅ Cronジョブ設定完了"
echo ""
echo "📅 設定内容:"
echo "  - 毎日 2:15 AM: 証明書更新チェック"
echo "  - 毎週日曜 3:00 AM: バックアップ & ログローテーション"
echo ""
echo "🔍 確認コマンド:"
echo "  sudo crontab -l"
echo "  sudo cat $CRON_FILE"
echo "  tail -f /var/log/letsencrypt-renewal.log"
echo ""
echo "🎯 手動実行テスト:"
echo "  sudo $RENEWAL_SCRIPT"

# 現在のCron設定表示
echo ""
echo "📋 現在のCron設定:"
sudo cat "$CRON_FILE"