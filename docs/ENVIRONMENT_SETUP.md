# Environment Setup Guide

This guide provides detailed information about environment configuration, secrets management, and deployment setup.

## Environment Strategies

The application supports three environment initialization strategies:

1. **dotenv** - `.env` file (development)
2. **aws-secrets-manager** - AWS Secrets Manager (production)
3. **hybrid** - AWS Secrets Manager with `.env` fallback (recommended)

### Strategy Selection

```typescript
// In src/config/environment.ts
export async function initializeEnvironment(strategy: EnvironmentStrategy = 'hybrid'): Promise<void>
```

The strategy is determined by:
```bash
USE_AWS_SECRETS_MANAGER=true  # Use AWS Secrets Manager
# If false or unset, uses .env file
```

## Development Environment

### Setup Steps

1. **Clone repository**
   ```bash
   cd /ai/prj/techdev
   npm install
   ```

2. **Create `.env` file**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Build and run**
   ```bash
   npm run build
   npm run dev  # Hot reload on port 5000
   ```

### Required Environment Variables

```bash
# LLM Providers (Required)
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Redis (Upstash - Required)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Server Configuration
PORT=4000                    # Default: 4000 (dev: 5000, prod: 8443)
NODE_ENV=development         # development | production | test
LOG_LEVEL=info              # error | warn | info | debug
```

### Optional Environment Variables

```bash
# Anthropic API (Disabled by default)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_ENABLED=false  # Must be 'true' to enable

# Gmail Integration
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REDIRECT_URI=https://techsapo.com/api/v1/gmail/auth/callback

# Context7 Documentation Service
CONTEXT7_API_KEY=ctx7sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Database (Optional)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=techsapo

# Cost Management
MONTHLY_BUDGET_LIMIT=70      # USD
COST_ALERT_THRESHOLD=0.8     # 80%

# Logging
LOG_FILE_PATH=./logs/app.log
```

## Production Environment

### AWS Secrets Manager Setup

1. **Create secret in AWS**
   ```bash
   aws secretsmanager create-secret \
     --name techsapo/production \
     --description "TechSapo production secrets" \
     --secret-string file://secrets.json
   ```

2. **Format of secrets.json**
   ```json
   {
     "HUGGINGFACE_API_KEY": "hf_xxx",
     "OPENROUTER_API_KEY": "sk-or-xxx",
     "UPSTASH_REDIS_REST_URL": "https://...",
     "UPSTASH_REDIS_REST_TOKEN": "xxx",
     "GOOGLE_API_KEY": "AIza...",
     "CONTEXT7_API_KEY": "ctx7sk-xxx"
   }
   ```

3. **Configure environment**
   ```bash
   # In production .env or systemd environment file
   USE_AWS_SECRETS_MANAGER=true
   AWS_SECRET_NAME=techsapo/production
   AWS_REGION=us-east-1
   AWS_DEFAULT_REGION=us-east-1
   ```

### Migration Script

```bash
# Preview migration (dry run)
npm run migrate-secrets:dry-run

# Migrate secrets to AWS
npm run migrate-secrets

# Update existing secrets
npm run migrate-secrets:update
```

See: [AWS Secrets Manager Setup Guide](./AWS_SECRETS_MANAGER_SETUP.md)

## systemd Configuration

### Important: No Quotes in .env

```bash
# ❌ WRONG - Do not use quotes in systemd .env files
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
ANTHROPIC_API_KEY="sk-ant-xxx"

# ✅ CORRECT - No quotes
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
ANTHROPIC_API_KEY=sk-ant-xxx
```

### Service File Location

```bash
# Production service file
/etc/systemd/system/techsapo.service

# Environment file
/prod/techsapo/.env
```

### Example systemd Service

```ini
[Unit]
Description=TechSapo Server
After=network.target

[Service]
Type=simple
User=wombat
WorkingDirectory=/prod/techsapo
EnvironmentFile=/prod/techsapo/.env
ExecStart=/usr/bin/node /prod/techsapo/dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Environment Validation

### Startup Validation

The application validates environment variables on startup:

```typescript
// src/config/environment.ts
export function validateEnvironment(): void {
  const required = [
    'HUGGINGFACE_API_KEY',
    'OPENROUTER_API_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN'
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

### Health Check

```bash
# Verify environment is loaded correctly
curl http://localhost:8443/health | jq

# Response includes environment status
{
  "status": "healthy",
  "environment": "production",
  "secrets_source": "aws-secrets-manager"
}
```

## Secrets Rotation

### AWS Secrets Manager Rotation

```bash
# Enable automatic rotation (90-day cycle)
aws secretsmanager rotate-secret \
  --secret-id techsapo/production \
  --rotation-lambda-arn arn:aws:lambda:region:account:function:SecretsManagerRotation \
  --rotation-rules AutomaticallyAfterDays=90
```

### Manual Rotation

```bash
# Update secret value
aws secretsmanager update-secret \
  --secret-id techsapo/production \
  --secret-string file://new-secrets.json

# Restart service to pick up new values
sudo systemctl restart techsapo
```

### Cache TTL

Secrets are cached for 5 minutes (300000ms):

```typescript
// src/services/aws-secrets-manager.ts
const secretsManager = initializeSecretsManager({
  secretName: 'techsapo/production',
  region: 'us-east-1',
  cacheTTL: 300000  // 5 minutes
});
```

## Port Configuration

### Default Ports

| Environment | Port | Protocol |
|-------------|------|----------|
| Development | 5000 | HTTP |
| Default | 4000 | HTTP |
| Production | 8443 | HTTP (behind Nginx) |
| Nginx (external) | 443 | HTTPS |

### Port Override

```bash
# Override default port
PORT=3000 npm start

# Or in .env
PORT=3000
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/techsapo
server {
    listen 443 ssl http2;
    server_name techsapo.com;

    ssl_certificate /etc/letsencrypt/live/techsapo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/techsapo.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8443;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Redis Configuration

### Upstash Redis

Production uses Upstash Redis (serverless):

```bash
# Required variables
UPSTASH_REDIS_REST_URL=https://your-name.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-rest-token-here

# Alternative (legacy)
UPSTASH_REDIS_URL=redis://your-redis.upstash.io:6379
UPSTASH_REDIS_TOKEN=your-token-here
```

### Configuration in Code

```typescript
// src/config/environment.ts
redis: {
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN || '',
}
```

### Redis Service

```typescript
// src/services/redis-service.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: config.redis.url,
  token: config.redis.token
});

// Always use JSON serialization
await redis.set('key', JSON.stringify(data));
const data = JSON.parse(await redis.get('key'));
```

## Database Configuration

### MySQL (Optional)

```bash
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=techsapo
MYSQL_PASSWORD=secure-password
MYSQL_DATABASE=techsapo
```

### SQLite (Development)

```bash
# Default: data/cipher-sessions.db
# No configuration needed
```

## Logging Configuration

### Winston Logger

```bash
LOG_LEVEL=info  # error | warn | info | debug
LOG_FILE_PATH=./logs/app.log
```

### Log Files

```bash
# Application logs
logs/app.log         # General application logs
logs/app-error.log   # Error logs only
logs/it-unified.log  # IT unified endpoint logs

# Audit logs
logs/audit.log       # Security audit trail
```

### Log Rotation

```bash
# Logrotate configuration
/etc/logrotate.d/techsapo

/prod/techsapo/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 wombat wombat
    sharedscripts
    postrotate
        systemctl reload techsapo > /dev/null 2>&1 || true
    endscript
}
```

## Monitoring Configuration

### Prometheus Metrics

```bash
# Metrics endpoint
curl http://localhost:8443/metrics
```

### Health Checks

```bash
# Main health
curl http://localhost:8443/health

# LLM provider health
curl http://localhost:8443/api/v1/llm-health

# MCP server health
curl http://localhost:8443/api/v1/mcp-health
```

## Troubleshooting

### Environment Not Loading

```bash
# Check environment strategy
echo $USE_AWS_SECRETS_MANAGER

# Test AWS credentials
aws secretsmanager get-secret-value --secret-id techsapo/production

# Fall back to .env
unset USE_AWS_SECRETS_MANAGER
npm start
```

### Port Already in Use

```bash
# Find process using port
sudo lsof -i :8443

# Kill process
sudo kill -9 <PID>

# Or use different port
PORT=9000 npm start
```

### Redis Connection Failed

```bash
# Test Redis connection
curl "${UPSTASH_REDIS_REST_URL}/get/test" \
  -H "Authorization: Bearer ${UPSTASH_REDIS_REST_TOKEN}"

# Check Redis service
src/services/redis-service.ts
```

## Security Best Practices

1. **Never commit `.env` files**
   ```bash
   # .gitignore includes
   .env
   .env.local
   .env.production
   ```

2. **Use AWS Secrets Manager in production**
   - Automatic rotation
   - Audit logging
   - Access control via IAM

3. **Restrict API access**
   ```bash
   # Disable unnecessary APIs
   ANTHROPIC_API_ENABLED=false
   ```

4. **Rotate secrets regularly**
   - Monthly for development
   - Quarterly for production (automated via AWS)

5. **Monitor access**
   ```bash
   # Check audit logs
   tail -f logs/audit.log | grep "secret_access"
   ```

## References

- [AWS Secrets Manager Setup](./AWS_SECRETS_MANAGER_SETUP.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Security Documentation](./SECURITY.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
