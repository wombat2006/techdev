# Troubleshooting Guide

## Common Issues & Solutions

### Build Errors

#### Issue: TypeScript Compilation Errors with googleapis
**Symptoms**:
```
error TS2305: Module '"googleapis"' has no exported member 'gmail_v1'
error TS2339: Property 'gmail' does not exist on type
```

**Root Cause**: googleapis v126 has different type exports

**Solution**: Use type assertions
```typescript
import { google } from 'googleapis';
// NOT: import type { gmail_v1 } from 'googleapis';

private gmail: any = null; // NOT: gmail_v1.Gmail | null
this.gmail = (google as any).gmail({ version: 'v1', auth: this.oauth2Client });
```

### Runtime Errors

#### Issue: Redis Returns "[object Object]"
**Symptoms**: Retrieved values show `"[object Object]"` instead of actual data

**Root Cause**: Upstash SDK limitation with direct object storage

**Solution**: Always use JSON serialization
```typescript
// ✅ CORRECT
await redis.set(key, JSON.stringify(value));
const data = JSON.parse(await redis.get(key));
```

#### Issue: Gemini Always Uses Same Model
**Symptoms**: Gemini CLI always uses `gemini-2.5-pro` even when `2.5-flash` requested

**Root Cause**: Version parameter not passed to CLI

**Solution**: Fixed in `wall-bounce-analyzer.ts:executeGeminiCLI()`
```typescript
spawn('gemini', [
  '--model', version === '2.5-flash' ? 'gemini-2.5-flash' : 'gemini-2.5-pro',
  prompt
]);
```

### Authentication Issues

#### Issue: Gmail OAuth "No refresh token received"
**Symptoms**: Error message "No refresh token received. Ensure access_type=offline"

**Root Cause**: OAuth URL missing `access_type=offline` or `prompt=consent`

**Solution**: Check `generateAuthUrl()` includes both:
```typescript
this.oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: scopes,
  state // CSRF protection
});
```

#### Issue: CSRF Validation Failed
**Symptoms**: `403 Forbidden` with "CSRF validation failed"

**Possible Causes**:
1. State parameter expired (>5 minutes)
2. State parameter missing from callback
3. Redis connection failure

**Solutions**:
1. Check Redis connectivity: `curl http://localhost:8443/health`
2. Verify state parameter in OAuth callback URL
3. Check Redis TTL: State keys expire after 300 seconds

### Deployment Issues

#### Issue: systemd Service Won't Start
**Symptoms**: `sudo systemctl status techsapo` shows failed state

**Debugging Steps**:
```bash
# Check service logs
sudo journalctl -u techsapo -n 50

# Check application logs
sudo tail -100 /var/techsapo/logs/service.log
sudo tail -100 /var/techsapo/logs/error.log

# Verify environment variables
sudo systemctl show techsapo | grep Environment

# Test .env format (no quotes!)
cat /prod/techsapo/.env
```

**Common Fix**: Remove quotes from `.env` values

#### Issue: Build Files Not Updated in Production
**Symptoms**: Code changes not reflected after deployment

**Solution**: Ensure proper rsync and service restart
```bash
npm run build
sudo rsync -av --delete dist/ /prod/techsapo/dist/
sudo systemctl restart techsapo
sudo systemctl status techsapo
```

### Testing Issues

#### Issue: Tests Timeout
**Symptoms**: Jest tests fail with timeout errors

**Solution**: Increase timeout for integration tests
```bash
npm test -- --testTimeout=120000
```

Or in `jest.config.js`:
```javascript
testTimeout: 120000 // 120 seconds
```

#### Issue: Integration Tests Fail in CI
**Symptoms**: Tests pass locally but fail in CI/CD

**Possible Causes**:
1. Missing environment variables
2. Redis not accessible
3. External API rate limits

**Solutions**:
1. Mock external services in CI
2. Use test doubles for Redis
3. Set `NODE_ENV=test` to enable test mode

### LLM Provider Issues

#### Issue: Codex MCP Connection Failures
**Symptoms**: GPT-5 queries fail with connection errors

**Debugging**:
```bash
# Test codex CLI directly
codex exec --model gpt-5 "test query"

# Check codex MCP service
ps aux | grep codex
```

#### Issue: OpenRouter Rate Limits
**Symptoms**: 429 Too Many Requests from OpenRouter

**Solution**: Retry logic handles 429 automatically (3 attempts with exponential backoff)

### Monitoring & Diagnostics

#### Health Check Commands
```bash
# Service health
curl http://localhost:8443/health

# LLM provider health
curl http://localhost:8443/api/v1/llm-health

# Prometheus metrics
curl http://localhost:8443/metrics

# Redis connectivity
redis-cli -u $UPSTASH_REDIS_REST_URL ping
```

#### Log Locations
- **Development**: `logs/{app.log,app-error.log}`
- **Production**: `/var/techsapo/logs/{service.log,error.log}`
- **systemd**: `sudo journalctl -u techsapo`

## Quick Reference: Common Issues

### Redis Connection Issues
**Symptoms**: Connection timeouts, `ECONNREFUSED`, or "Cannot connect to Redis"

**Checks**:
```bash
# Verify environment variables
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN

# Test connection
curl "${UPSTASH_REDIS_REST_URL}/get/test" \
  -H "Authorization: Bearer ${UPSTASH_REDIS_REST_TOKEN}"
```

**Solutions**:
1. Verify credentials in `.env` or AWS Secrets Manager
2. Check Redis service: `src/services/redis-service.ts`
3. Use `ioredis-mock` for testing: `import RedisMock from 'ioredis-mock'`

### MCP Lock File Conflicts
**Symptoms**: "MCP server already running" or service won't start

**Location**: `/tmp/mcp-*.lock`

**Solutions**:
```bash
# List lock files
ls -la /tmp/mcp-*.lock

# Remove stale locks
rm /tmp/mcp-*.lock

# Or specific service
rm /tmp/mcp-codex.lock
rm /tmp/mcp-cipher.lock
```

**Documentation**: See `docs/MCP_SINGLE_INSTANCE_CONTROL.md`

### Wall-Bounce Quality Issues
**Symptoms**: Low confidence scores, consensus failures, or inconsistent results

**Checks**:
```bash
# Check consensus threshold (min 0.6)
curl http://localhost:8443/api/v1/wall-bounce-status | jq '.consensus_score'

# Verify LLM provider health
curl http://localhost:8443/api/v1/llm-health | jq '.services'

# Review wall-bounce logs
tail -f logs/it-unified.log | grep "wall-bounce"
```

**Solutions**:
1. Check individual provider health status
2. Verify API keys and quotas
3. Increase number of wall-bounce rounds (max 6)
4. Review audit logs for provider failures

### Gemini CLI Issues
**Symptoms**: "gemini: command not found" or authentication errors

**Checks**:
```bash
# Verify CLI is installed
which gemini
gemini --version

# Check API key
echo $GOOGLE_API_KEY

# Test basic query
gemini "hello"
```

**Solutions**:
```bash
# Install Gemini CLI
npm install -g @google/generative-ai-cli

# Verify installation
which gemini

# Set API key
export GOOGLE_API_KEY=AIzaSy...
```

**Documentation**: See `docs/GEMINI_CLI_INTEGRATION_GUIDE.md`

### Codex/GPT-5 Issues
**Symptoms**: "codex: command not found" or MCP connection failures

**Checks**:
```bash
# Test codex CLI
codex exec --model gpt-5 "hello"

# Check MCP server
ps aux | grep "codex mcp-server"

# Test MCP lock file
ls -la /tmp/mcp-codex.lock
```

**Solutions**:
```bash
# Start MCP server
codex mcp-server &

# Or use CLI directly
codex exec --model gpt-5 "your prompt"

# Remove stale lock
rm /tmp/mcp-codex.lock
```

**Documentation**: See `docs/CODEX_MCP_INTEGRATION.md`

### Port Already in Use
**Symptoms**: "EADDRINUSE: address already in use :::8443"

**Solutions**:
```bash
# Find process using port
sudo lsof -i :8443
sudo netstat -tulpn | grep 8443

# Kill process
sudo kill -9 <PID>

# Or use different port
PORT=9000 npm start
```

### Environment Variables Not Loading
**Symptoms**: Missing API keys, undefined config values

**Checks**:
```bash
# Check environment strategy
echo $USE_AWS_SECRETS_MANAGER

# Test .env file
source .env && env | grep -E 'HUGGINGFACE|OPENROUTER|REDIS'

# Test AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id techsapo/production
```

**Solutions**:
1. Verify `.env` file exists and is not quoted (systemd)
2. Check AWS credentials: `aws configure list`
3. Verify secret name: `AWS_SECRET_NAME=techsapo/production`
4. Fall back to dotenv: `unset USE_AWS_SECRETS_MANAGER`

## Getting Help

1. Check `/docs` for detailed documentation
2. Search Cipher memory for related issues
3. Review wall-bounce analysis reports
4. Check GitHub issues (if applicable)
5. See also:
   - [LLM Providers Guide](./LLM_PROVIDERS_GUIDE.md)
   - [Environment Setup](./ENVIRONMENT_SETUP.md)
   - [Architecture Overview](./ARCHITECTURE_OVERVIEW.md)
