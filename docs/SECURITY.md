# Security Patterns & Fixes

## CSRF Protection

### Gmail OAuth Flow
- **State Parameter**: 32-byte cryptographically secure random (`crypto.randomBytes(32)`)
- **Storage**: Redis with 5-minute TTL (`oauth_state:gmail:{state}`)
- **Validation**: One-time use, deleted after validation
- **Error Codes**: 403 for CSRF failures, 400 for missing state

**Implementation**: `src/services/gmail-connector.ts:516`, `src/routes/gmail-routes.ts:94`

## Known Security Issues & Fixes

### Fixed: Redis Object Serialization
**Problem**: Direct object storage results in `"[object Object]"`
**Fix**: JSON serialization layer in `redis-service.ts`

```typescript
// ✅ CORRECT
await this.redis.set(key, JSON.stringify(value));
const result = JSON.parse(await this.redis.get(key));

// ❌ WRONG
await this.redis.set(key, objectValue);
```

### Fixed: Gemini CLI Model Selection
**Problem**: Always used `gemini-2.5-pro` regardless of version parameter
**Fix**: Pass `version` to CLI `--model` flag

```typescript
const gemini = spawn('gemini', [
  '--model', version === '2.5-flash' ? 'gemini-2.5-flash' : 'gemini-2.5-pro',
  prompt
]);
```

## Security Enhancements (From Wall-Bounce Analysis)

### P0 - Critical (All Completed)
- ✅ **CSRF Protection** - COMPLETED (2025-10-04)
- ✅ **Token Refresh Race Condition** - COMPLETED (2025-10-04) - Redis distributed lock
- ✅ **Input Validation** - COMPLETED (2025-10-04) - Zod schemas

### P1 - High Priority (Pending)
- ⏳ **PKCE** - Proof Key for Code Exchange
- ⏳ **Idempotency Keys** - Prevent duplicate email sends
- ⏳ **Circuit Breaker Enhancement** - Add HALF_OPEN state
- ⏳ **Dead Letter Queue** - For persistent failures

## Token Refresh Race Condition Fix

### Implementation (gmail-connector.ts:154)
- **Distributed Lock**: Redis-based with 30s TTL
- **Lock Key**: `lock:gmail_token_refresh_lock`
- **Lock Value**: Cryptographically secure random (16 bytes)
- **Wait Strategy**: 2s wait + retry if lock held
- **Fallback**: Use token refreshed by other instance
- **Cleanup**: Lock released on success or error

**Code Pattern**:
```typescript
async refreshAccessToken(): Promise<string> {
  const lockKey = 'gmail_token_refresh_lock';
  const lockValue = crypto.randomBytes(16).toString('hex');

  // Acquire lock
  if (!await acquireLock(lockKey, lockValue, 30)) {
    await sleep(2000);
    return await getRefreshedTokenFromSecrets();
  }

  try {
    const newToken = await oauth2Client.refreshAccessToken();
    await saveToSecrets(newToken);
    return newToken;
  } finally {
    await releaseLock(lockKey, lockValue);
  }
}
```

## Input Validation

### Zod Schemas (gmail-routes.ts:12-36)
- **Email**: Max 254 chars, RFC 5321 format
- **Subject**: 1-998 chars (RFC 2822 limit)
- **Body**: Max 1MB (1,000,000 chars)
- **CC/BCC**: Max 100 recipients each
- **Error Response**: 400 with validation details

**Schema Example**:
```typescript
const SendEmailSchema = z.object({
  to: z.string().email().max(254),
  subject: z.string().min(1).max(998),
  body: z.string().min(1).max(1_000_000)
});

const validation = SendEmailSchema.safeParse(req.body);
if (!validation.success) {
  return res.status(400).json({
    error: 'Validation failed',
    details: validation.error.errors
  });
}
```

## Environment Security

### systemd .env Format
**Critical**: Quotes are treated as literals in `EnvironmentFile`

```bash
# ❌ WRONG
UPSTASH_REDIS_REST_URL="https://..."

# ✅ CORRECT
UPSTASH_REDIS_REST_URL=https://...
```

### Secret Storage
- **AWS Secrets Manager**: OAuth tokens, API keys
- **Redis**: Session data, temporary state (TTL-based)
- **.env**: Local development only (never commit)

## API Security Patterns

### Circuit Breaker
- **Failure Threshold**: 10 failures
- **Reset Timeout**: 60 seconds
- **Min Requests**: 1
- **Implementation**: `src/utils/retry.ts`

### Retry Logic
- **Max Attempts**: 3
- **Initial Delay**: 1000ms
- **Backoff**: Exponential
- **Retryable Status Codes**: 429, 500, 502, 503, 504

## References

- [OAuth 2.0 RFC 6749 Section 10.12](https://tools.ietf.org/html/rfc6749#section-10.12) - CSRF
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [RFC 5321](https://tools.ietf.org/html/rfc5321) - Email Address Specification
- [RFC 2822](https://tools.ietf.org/html/rfc2822) - Internet Message Format
- Wall-Bounce Verification Report (stored in Cipher)
