# Operational Scripts

Comprehensive guide to operational scripts in `/ai/prj/techdev/scripts/`

## 📁 Script Categories

### Monitoring & Maintenance

#### `vm-monitor.sh`
**Purpose**: Infrastructure monitoring with LINE notifications

**Features:**
- CPU monitoring (>80% warning, >95% critical)
- Memory monitoring (>85% warning, >95% critical)
- Disk space monitoring (>85% warning, >95% critical)
- Service health checks (nginx, techsapo)
- System load monitoring

**Usage:**
```bash
# Manual execution
/ai/prj/techdev/scripts/vm-monitor.sh

# Check scheduled runs (if using systemd)
sudo journalctl -u vm-monitor.timer

# Test LINE notifications
curl -X POST https://line-notification.com/api/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"test","severity":"info","server":"techdev"}'
```

**Configuration:**
- LINE API endpoint: `https://line-notification.com/api/notify`
- Severity levels: `info`, `warning`, `critical`
- Lock file: `/tmp/vm-monitor.lock`
- Log file: `/var/log/vm-monitor.log`

**→ See [LINE Notification System](./LINE_NOTIFICATION_SYSTEM.md) for notification details**

---

### Deployment & Production

#### `deploy-to-prod.sh`
**Purpose**: Automated production deployment

**Features:**
- Build verification
- Rsync deployment to `/prod/techsapo`
- Service restart with systemd
- Rollback capability

**Usage:**
```bash
./scripts/deploy-to-prod.sh
```

#### `install-renewal-cron.sh`
**Purpose**: SSL certificate auto-renewal setup (90-day cycle)

**Features:**
- Automatic certificate renewal
- Cron job configuration
- Nginx reload automation

**Usage:**
```bash
./scripts/install-renewal-cron.sh
```

#### `emergency-rollback-*.sh`
**Purpose**: Emergency rollback procedures

**Features:**
- Fast rollback to previous version
- Service restart
- Health verification

**Usage:**
```bash
./scripts/emergency-rollback-latest.sh
```

---

### Development & Testing

#### `dev-watch.js`
**Purpose**: Development file watcher with auto-reload

**Features:**
- Watch TypeScript files for changes
- Auto-rebuild on save
- Server restart

**Usage:**
```bash
node scripts/dev-watch.js
```

#### `comprehensive-rag-test.sh`
**Purpose**: RAG system integration testing

**Features:**
- Google Drive connection test
- Vector search validation
- End-to-end RAG flow test

**Usage:**
```bash
./scripts/comprehensive-rag-test.sh
```

#### `demo-sse-visualization.sh`
**Purpose**: SSE streaming demonstration

**Features:**
- Server-Sent Events testing
- Real-time progress visualization
- Wall-bounce SSE endpoint demo

**Usage:**
```bash
./scripts/demo-sse-visualization.sh
```

---

### MCP Services

#### `mcp-cipher.service`
**Purpose**: Cipher MCP systemd service definition

**Configuration:**
```ini
[Unit]
Description=Cipher MCP Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/npx @byterover/cipher --mode mcp
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

**Management:**
```bash
sudo systemctl start mcp-cipher
sudo systemctl status mcp-cipher
sudo systemctl enable mcp-cipher
```

#### `mcp-serena.service`
**Purpose**: Serena MCP systemd service definition

**Configuration:**
Similar to mcp-cipher.service

**Management:**
```bash
sudo systemctl start mcp-serena
sudo systemctl status mcp-serena
sudo systemctl enable mcp-serena
```

#### `ensure-single-mcp-instance.sh`
**Purpose**: Prevent duplicate MCP instances

**Features:**
- Process lock management
- Automatic cleanup of stale locks
- Instance verification

**Usage:**
```bash
./scripts/ensure-single-mcp-instance.sh <service-name>
```

**Lock files:**
- Location: `/tmp/mcp-*.lock`
- Cleanup: `rm /tmp/mcp-*.lock`

---

### Documentation

#### `generate-pdf*.js/sh`
**Purpose**: Generate PDF documentation from markdown

**Scripts:**
- `generate-pdf.js` - Single document conversion
- `generate-pdf-all.sh` - Batch conversion
- `generate-pdf-japanese.js` - Japanese document conversion

**Usage:**
```bash
# Single document
node scripts/generate-pdf.js docs/ARCHITECTURE_OVERVIEW.md

# All documents
./scripts/generate-pdf-all.sh

# Japanese documents
node scripts/generate-pdf-japanese.js
```

**Requirements:**
- `md-to-pdf` package
- Proper font configuration for Japanese
- `pandoc` (for advanced conversions)

---

## 🔧 Script Development Guidelines

### Standard Structure
```bash
#!/bin/bash
set -euo pipefail

# Configuration
readonly SCRIPT_NAME="script-name"
readonly LOG_FILE="/var/log/${SCRIPT_NAME}.log"
readonly LOCK_FILE="/tmp/${SCRIPT_NAME}.lock"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Main function
main() {
    # Lock file check
    if [ -f "$LOCK_FILE" ]; then
        log "Another instance is running. Exiting."
        exit 0
    fi

    touch "$LOCK_FILE"
    trap 'rm -f "$LOCK_FILE"' EXIT

    # Script logic here
}

main "$@"
```

### Best Practices
- Always use `set -euo pipefail`
- Implement lock files for singleton scripts
- Use comprehensive logging
- Add cleanup with `trap`
- Include usage documentation
- Test in dry-run mode first

---

## 📊 Script Execution Monitoring

### Check Script Logs
```bash
# VM Monitor logs
sudo tail -f /var/log/vm-monitor.log

# Systemd service logs
sudo journalctl -u mcp-cipher -f
sudo journalctl -u mcp-serena -f
```

### Verify Scheduled Execution
```bash
# Check systemd timers
systemctl list-timers

# Check cron jobs
crontab -l
sudo crontab -l
```

---

## 🚨 Troubleshooting

### Common Issues

**Lock file stuck:**
```bash
# Remove stale lock files
rm /tmp/*.lock
rm /tmp/mcp-*.lock
```

**Script permission denied:**
```bash
chmod +x /ai/prj/techdev/scripts/*.sh
```

**LINE notifications failing:**
```bash
# Test connectivity
curl -v https://line-notification.com/health

# Check notification endpoint
curl -X POST https://line-notification.com/api/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"test","severity":"info","server":"techdev"}'
```

**→ See [Troubleshooting Guide](./TROUBLESHOOTING.md) for more solutions**

---

## 📖 Related Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment procedures
- [LINE Notification System](./LINE_NOTIFICATION_SYSTEM.md) - Notification setup
- [MCP Integration](./MCP_INTEGRATION.md) - MCP service configuration
- [Testing Guide](./TESTING_GUIDE.md) - Testing strategies and scripts

---

**Last Updated**: 2025-10-12
**Version**: 1.0
**Maintainer**: TechSapo Team
