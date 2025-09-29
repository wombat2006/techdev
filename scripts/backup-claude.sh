#!/bin/bash
# CLAUDE.md Backup Script
# 自動的に日付時刻付きバックアップを作成

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="CLAUDE_backup_${TIMESTAMP}.md"

if [ -f "CLAUDE.md" ]; then
    cp CLAUDE.md "$BACKUP_FILE"
    echo "✅ CLAUDE.md backed up to: $BACKUP_FILE"
else
    echo "❌ CLAUDE.md not found"
    exit 1
fi

# 古いバックアップファイル削除（30日以上）
find . -name "CLAUDE_backup_*.md" -type f -mtime +30 -delete
echo "🧹 Old backups (30+ days) cleaned up"