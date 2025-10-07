# Audit Logging System

## Overview

すべての動作を `/audit/techdev` に記録する包括的な監査ログシステム。

## Directory Structure

```
/audit/techdev/
├── action/          - API requests, system actions
├── session/         - Session start/end events
├── change/          - Code/file changes
└── security/        - Security events & alerts
    ├── 2025-10-04.jsonl
    └── alerts.jsonl  - Critical/High severity only
```

## Log Format

**JSONL** (JSON Lines) - 1行1JSONエントリ

```json
{
  "timestamp": "2025-10-04T11:01:42.523Z",
  "sessionId": "session-1759575702521-ff1r6fm4z",
  "action": "api_request",
  "category": "action",
  "user": "claude-code",
  "details": {
    "method": "POST",
    "path": "/api/v1/wall-bounce",
    "ip": "127.0.0.1"
  },
  "result": "success"
}
```

## Categories

### 1. **action** - システムアクション
- API requests/responses
- User actions
- System operations

### 2. **session** - セッション管理
- Session start/end
- User login/logout
- Session metadata

### 3. **change** - コード変更
- File create/edit/delete
- Code modifications
- Configuration changes

### 4. **security** - セキュリティイベント
- Authentication failures
- Authorization violations
- Security alerts
- CSRF attempts
- Rate limit violations

## API Endpoints

### Query Logs
```bash
GET /api/v1/audit/logs/:category?startDate=2025-10-04&endDate=2025-10-05

# Example
curl "http://localhost:8443/api/v1/audit/logs/action?startDate=2025-10-04"
```

**Response**:
```json
{
  "success": true,
  "category": "action",
  "startDate": "2025-10-04",
  "endDate": "2025-10-04",
  "count": 42,
  "logs": [...]
}
```

### Get Statistics
```bash
GET /api/v1/audit/stats/:date

# Example
curl http://localhost:8443/api/v1/audit/stats/2025-10-04
```

**Response**:
```json
{
  "success": true,
  "stats": {
    "date": "2025-10-04",
    "categories": {
      "action": {
        "total": 42,
        "byAction": {
          "api_request": 30,
          "api_response": 30
        },
        "byResult": {
          "success": 40,
          "failure": 2
        }
      },
      ...
    }
  }
}
```

### Security Alerts
```bash
GET /api/v1/audit/security/alerts?startDate=2025-10-04

curl "http://localhost:8443/api/v1/audit/security/alerts?startDate=2025-10-04"
```

**Response**:
```json
{
  "success": true,
  "total": 5,
  "criticalCount": 1,
  "alerts": [
    {
      "timestamp": "2025-10-04T10:30:00.000Z",
      "action": "csrf_attempt",
      "details": {
        "severity": "critical",
        "ip": "192.168.1.100"
      }
    }
  ]
}
```

### Manual Logging
```bash
POST /api/v1/audit/log

curl -X POST http://localhost:8443/api/v1/audit/log \
  -H "Content-Type: application/json" \
  -d '{
    "action": "custom_event",
    "category": "action",
    "user": "external-system",
    "details": {
      "description": "Custom audit event"
    },
    "result": "success"
  }'
```

## Usage in Code

### Import
```typescript
import AuditLogger from './services/audit-logger';
```

### Log Action
```typescript
await AuditLogger.logAction('user_login', {
  userId: 'user123',
  ip: req.ip,
  userAgent: req.get('User-Agent')
}, 'success');
```

### Log Change
```typescript
await AuditLogger.logChange(
  'src/services/auth.ts',
  'edit',
  {
    linesChanged: 42,
    author: 'claude-code',
    description: 'Added CSRF protection'
  }
);
```

### Log Security Event
```typescript
await AuditLogger.logSecurity(
  'csrf_attempt',
  'critical',
  {
    ip: req.ip,
    path: req.path,
    state: invalidState
  }
);
```

### Query Logs Programmatically
```typescript
const logs = await AuditLogger.queryLogs(
  'security',
  '2025-10-01',
  '2025-10-04'
);

const stats = await AuditLogger.getStats('2025-10-04');
```

## Automatic Logging

### API Requests (index.ts)
すべてのAPI requestとresponseを自動記録：

```typescript
// Request
{
  "action": "api_request",
  "category": "action",
  "details": {
    "method": "POST",
    "path": "/api/v1/gmail/send",
    "ip": "127.0.0.1",
    "userAgent": "Mozilla/5.0..."
  }
}

// Response
{
  "action": "api_response",
  "category": "action",
  "details": {
    "method": "POST",
    "path": "/api/v1/gmail/send",
    "statusCode": 200,
    "duration": 1234
  },
  "result": "success"
}
```

### Session Management
サーバー起動時に自動的にセッション開始を記録：

```typescript
// Auto-initialized on import
AuditLogger.initSession();

// Manual session end (optional)
await AuditLogger.endSession({
  totalRequests: 1000,
  totalErrors: 5,
  uptime: 3600000
});
```

## Security Features

### Permissions
```bash
drwxr-x---. wombat:wombat /audit/techdev/
# 750 - Only wombat user can write, group can read
```

### Alerts
Critical/High severity events are duplicated to `security/alerts.jsonl`:

```json
{
  "timestamp": "2025-10-04T10:30:00.000Z",
  "action": "csrf_attempt",
  "category": "security",
  "details": {
    "severity": "critical",
    "ip": "192.168.1.100"
  },
  "alert": true,
  "severity": "critical"
}
```

### Immutable Logs
- Append-only (no modification)
- JSONL format (line-based, resilient)
- Daily rotation (one file per day)
- Tamper-evident (timestamp chain)

## Retention Policy

### Manual Management
```bash
# Delete logs older than 90 days
find /audit/techdev -name "*.jsonl" -mtime +90 -delete

# Compress old logs
find /audit/techdev -name "*.jsonl" -mtime +30 -exec gzip {} \;
```

### Recommended Cron Job
```cron
# Compress logs older than 30 days
0 2 * * * find /audit/techdev -name "*.jsonl" -mtime +30 -exec gzip {} \;

# Delete logs older than 1 year
0 3 * * 0 find /audit/techdev -name "*.jsonl.gz" -mtime +365 -delete
```

## Monitoring

### Disk Usage
```bash
du -sh /audit/techdev/*
df -h /audit
```

### Log Volume
```bash
# Count entries per category
for dir in /audit/techdev/*/; do
  echo "=== $(basename $dir) ==="
  find "$dir" -name "*.jsonl" -exec wc -l {} + | tail -1
done
```

### Recent Errors
```bash
# Last 10 failures
grep '"result":"failure"' /audit/techdev/action/*.jsonl | tail -10 | jq .

# Security alerts
cat /audit/techdev/security/alerts.jsonl | jq .
```

## Troubleshooting

### Permission Denied
```bash
sudo chown -R wombat:wombat /audit/techdev
sudo chmod -R 750 /audit/techdev
```

### Missing Directories
```bash
mkdir -p /audit/techdev/{action,session,change,security}
```

### Log Size Too Large
```bash
# Compress all logs
find /audit/techdev -name "*.jsonl" -exec gzip {} \;

# Archive old logs
tar -czf audit-backup-$(date +%Y%m).tar.gz /audit/techdev
```

## References

- Implementation: `src/services/audit-logger.ts`
- API Routes: `src/routes/audit-routes.ts`
- Integration: `src/index.ts` (middleware)
- Mount Point: `/audit` (nvme5n1, 6GB XFS)
