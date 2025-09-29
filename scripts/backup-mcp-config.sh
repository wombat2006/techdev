#!/bin/bash

# MCP Configuration Backup Script
# Creates comprehensive backups of all MCP-related configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
BACKUP_DIR="/tmp/mcp-config-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_PREFIX="mcp-backup-${TIMESTAMP}"

echo "🔄 MCP Configuration Backup"
echo "=========================="

# Create backup directory
mkdir -p "$BACKUP_DIR"

log_info "Creating comprehensive MCP configuration backup..."

# Backup Codex configuration
if [[ -f ~/.codex/config.toml ]]; then
    cp ~/.codex/config.toml "$BACKUP_DIR/${BACKUP_PREFIX}-codex-config.toml"
    log_success "Codex config backed up"
else
    log_warning "Codex config file not found"
fi

# Backup Codex auth
if [[ -f ~/.codex/auth.json ]]; then
    cp ~/.codex/auth.json "$BACKUP_DIR/${BACKUP_PREFIX}-codex-auth.json"
    log_success "Codex auth backed up"
else
    log_warning "Codex auth file not found"
fi

# Backup TechSapo project settings
if [[ -f /ai/prj/techdev/package.json ]]; then
    cp /ai/prj/techdev/package.json "$BACKUP_DIR/${BACKUP_PREFIX}-techsapo-package.json"
    log_success "TechSapo package.json backed up"
fi

# Backup TechSapo environment
if [[ -f /ai/prj/techdev/.env ]]; then
    cp /ai/prj/techdev/.env "$BACKUP_DIR/${BACKUP_PREFIX}-techsapo-env"
    log_success "TechSapo .env backed up"
fi

# Backup TechSapo scripts
if [[ -d /ai/prj/techdev/scripts ]]; then
    tar -czf "$BACKUP_DIR/${BACKUP_PREFIX}-techsapo-scripts.tar.gz" -C /ai/prj/techdev scripts/
    log_success "TechSapo scripts backed up"
fi

# Create verification report
REPORT_FILE="$BACKUP_DIR/${BACKUP_PREFIX}-verification-report.txt"

cat > "$REPORT_FILE" << EOF
MCP Configuration Verification Report
=====================================
Generated: $(date)
Hostname: $(hostname)
User: $(whoami)
Working Directory: $(pwd)

=== System Information ===
Node.js Version: $(node --version 2>/dev/null || echo "Not found")
NPX Version: $(npx --version 2>/dev/null || echo "Not found")
UV Version: $(uv --version 2>/dev/null || echo "Not found")
Codex Version: $(codex --version 2>/dev/null || echo "Not found")

=== PATH Information ===
PATH: $PATH

=== Codex MCP Servers ===
$(codex mcp list 2>/dev/null || echo "Codex MCP not available")

=== Codex Authentication ===
$(codex login status 2>/dev/null || echo "Codex auth not available")

=== TechSapo Package Info ===
Cipher Package: $(npm list @byterover/cipher --depth=0 2>/dev/null | grep cipher || echo "Not found")

=== File Permissions ===
Codex Config: $(ls -la ~/.codex/config.toml 2>/dev/null || echo "Not found")
Codex Auth: $(ls -la ~/.codex/auth.json 2>/dev/null || echo "Not found")
TechSapo Script: $(ls -la /ai/prj/techdev/scripts/start-codex-mcp.sh 2>/dev/null || echo "Not found")

=== Configuration Content ===
--- Codex Config ---
$(cat ~/.codex/config.toml 2>/dev/null || echo "Not found")

=== Environment Test Results ===
NPX Test: $(which npx >/dev/null 2>&1 && echo "✓ Available" || echo "✗ Not found")
UV Test: $(which uv >/dev/null 2>&1 && echo "✓ Available" || echo "✗ Not found")
Codex Test: $(which codex >/dev/null 2>&1 && echo "✓ Available" || echo "✗ Not found")
Node Test: $(which node >/dev/null 2>&1 && echo "✓ Available" || echo "✗ Not found")

=== Quick Start Tests ===
Cipher MCP: $(timeout 3 npx @byterover/cipher --mode mcp 2>&1 | head -1 || echo "Failed to start")
Serena MCP: $(timeout 3 uv run serena start-mcp-server 2>&1 | head -1 || echo "Failed to start")

EOF

log_success "Verification report created: $REPORT_FILE"

# Create restoration script
RESTORE_SCRIPT="$BACKUP_DIR/${BACKUP_PREFIX}-restore.sh"

cat > "$RESTORE_SCRIPT" << 'EOF'
#!/bin/bash

# MCP Configuration Restoration Script
# Restores MCP configurations from backup

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_PREFIX="$(basename "$0" | sed 's/-restore\.sh$//')"

echo "🔄 MCP Configuration Restoration"
echo "==============================="
echo "Backup set: $BACKUP_PREFIX"
echo

# Restore Codex configuration
if [[ -f "$SCRIPT_DIR/${BACKUP_PREFIX}-codex-config.toml" ]]; then
    mkdir -p ~/.codex
    cp "$SCRIPT_DIR/${BACKUP_PREFIX}-codex-config.toml" ~/.codex/config.toml
    chmod 600 ~/.codex/config.toml
    echo "✓ Codex config restored"
else
    echo "⚠ Codex config backup not found"
fi

# Restore Codex auth
if [[ -f "$SCRIPT_DIR/${BACKUP_PREFIX}-codex-auth.json" ]]; then
    mkdir -p ~/.codex
    cp "$SCRIPT_DIR/${BACKUP_PREFIX}-codex-auth.json" ~/.codex/auth.json
    chmod 600 ~/.codex/auth.json
    echo "✓ Codex auth restored"
else
    echo "⚠ Codex auth backup not found"
fi

# Restore TechSapo scripts
if [[ -f "$SCRIPT_DIR/${BACKUP_PREFIX}-techsapo-scripts.tar.gz" ]]; then
    if [[ -d /ai/prj/techdev ]]; then
        tar -xzf "$SCRIPT_DIR/${BACKUP_PREFIX}-techsapo-scripts.tar.gz" -C /ai/prj/techdev
        echo "✓ TechSapo scripts restored"
    else
        echo "⚠ TechSapo directory not found"
    fi
else
    echo "⚠ TechSapo scripts backup not found"
fi

echo
echo "🎉 Restoration complete!"
echo "Run 'codex mcp list' to verify MCP servers are configured."

EOF

chmod +x "$RESTORE_SCRIPT"
log_success "Restoration script created: $RESTORE_SCRIPT"

# Summary
echo
echo "📋 Backup Summary"
echo "================"
echo "Backup Directory: $BACKUP_DIR"
echo "Files created:"
ls -la "$BACKUP_DIR/${BACKUP_PREFIX}"* | while read -r line; do
    echo "  • $(echo "$line" | awk '{print $9}' | xargs basename)"
done

echo
echo "🔧 Verification Commands"
echo "========================"
echo "View report: cat '$REPORT_FILE'"
echo "Restore config: bash '$RESTORE_SCRIPT'"
echo "List backups: ls -la '$BACKUP_DIR/'"

log_success "MCP configuration backup completed successfully!"

exit 0