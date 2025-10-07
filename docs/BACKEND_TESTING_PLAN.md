# Backend Testing Plan - TechSapo System

**Version**: 1.0
**Date**: 2025-10-04
**Status**: Active
**Owner**: DevOps Team

---

## 1. Executive Summary

This document provides a comprehensive, systematic testing plan for all TechSapo backend operations. It consolidates findings from:
- ROBUSTNESS_REPORT.md
- OPERATIONAL_STATUS_REPORT.md
- QWEN3_INTEGRATION_REPORT.md
- COMPREHENSIVE_FUNCTIONALITY_TEST_REPORT.md
- GPT5_CODEX_MCP_VERIFICATION.md

The plan is designed to be:
- **Repeatable**: Can be executed before each deployment
- **Comprehensive**: Covers all critical systems
- **Prioritized**: Focus on high-impact components first
- **Automatable**: Many tests can be scripted
- **Measurable**: Clear pass/fail criteria

---

## 2. Testing Priorities

### Priority 1: Critical (P1) - Must Pass Before Deployment
- Core server health and connectivity
- LLM provider integrations (Gemini, GPT-5, Qwen3, Claude)
- Wall-Bounce multi-LLM orchestration
- Redis connection and session management
- Audit logging system
- Security mechanisms (CSRF, input validation)

### Priority 2: High (P2) - Should Pass Before Deployment
- Hugging Face embedding models (7 models)
- IT Support endpoints
- Context7 MCP integration
- PDF document processing
- Error handling and resilience patterns

### Priority 3: Medium (P3) - Can Deploy with Known Issues
- Gmail OAuth and email operations
- RAG system (if configured)
- Webhook integrations (if configured)
- Prometheus metrics
- Performance optimization

### Priority 4: Low (P4) - Nice to Have
- Documentation completeness
- Code style consistency
- Dependency updates
- Log verbosity optimization

---

## 3. Pre-Deployment Checklist

### 3.1 Infrastructure Health (P1)

**Test Cases**:
```bash
# Server Health
curl http://localhost:8443/health
# Expected: {"status":"healthy","uptime":X,"timestamp":"..."}

# Disk Space
df -h /prod/techsapo
df -h /audit
df -h /data
# Expected: All < 80% usage

# Service Status
sudo systemctl status techsapo
# Expected: active (running)

# Redis Connectivity
curl http://localhost:8443/api/v1/llm-health | jq '.infrastructure.redis'
# Expected: {"status":"healthy","connected":true}
```

**Acceptance Criteria**:
- ✅ HTTP 200 from /health endpoint
- ✅ Server uptime > 0
- ✅ Disk usage < 80% on all volumes
- ✅ systemd service status: active
- ✅ Redis connected: true

**Automation**: Script in `/audit/techdev/scripts/test-infrastructure.sh`

---

### 3.2 LLM Provider Integration (P1)

**Test Cases**:

#### 3.2.1 Gemini 2.5 Pro
```bash
curl -X POST http://localhost:8443/api/v1/wall-bounce/single \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is 2+2?",
    "provider": "gemini-2.5-pro"
  }'
```

**Expected**:
```json
{
  "success": true,
  "provider": "gemini-2.5-pro",
  "response": "4" (or explanation),
  "tokens": {...}
}
```

#### 3.2.2 GPT-5 Codex
```bash
curl -X POST http://localhost:8443/api/v1/wall-bounce/single \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Write a function to add two numbers in TypeScript",
    "provider": "gpt-5-codex"
  }'
```

**Expected**: Valid TypeScript function with types

#### 3.2.3 Qwen3-Coder
```bash
curl -X POST http://localhost:8443/api/v1/wall-bounce/single \
  -H "Content-Type: application/json" \
  -d '{
    "query": "TypeScriptで配列の合計を計算する関数を書いて",
    "provider": "qwen3-coder"
  }'
```

**Expected**: Japanese response with TypeScript code

#### 3.2.4 Claude Sonnet 4.5
```bash
curl -X POST http://localhost:8443/api/v1/wall-bounce/single \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Explain async/await in JavaScript",
    "provider": "sonnet-4.5"
  }'
```

**Expected**: Clear explanation with examples

**Acceptance Criteria**:
- ✅ All 4 providers return HTTP 200
- ✅ Response contains valid content (no errors)
- ✅ Token usage reported
- ✅ Response time < 30s (per provider)

**Automation**: Script in `/audit/techdev/scripts/test-llm-providers.sh`

---

### 3.3 Wall-Bounce Multi-LLM System (P1)

**Test Case 1: Parallel Analysis**
```bash
curl -X POST http://localhost:8443/api/v1/wall-bounce/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Review this code for bugs: function add(a,b){return a+b}",
    "mode": "parallel",
    "providers": ["gemini-2.5-pro", "qwen3-coder", "sonnet-4.5"]
  }'
```

**Expected**:
```json
{
  "success": true,
  "mode": "parallel",
  "results": [
    {"provider": "gemini-2.5-pro", "response": "..."},
    {"provider": "qwen3-coder", "response": "..."},
    {"provider": "sonnet-4.5", "response": "..."}
  ],
  "aggregation": "...",
  "totalTokens": {...}
}
```

**Test Case 2: Sequential Wall-Bounce**
```bash
curl -X POST http://localhost:8443/api/v1/wall-bounce/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Design a REST API for user authentication",
    "mode": "sequential",
    "bounceCount": 3
  }'
```

**Expected**:
```json
{
  "success": true,
  "mode": "sequential",
  "bounces": [
    {"round": 1, "provider": "gemini-2.5-pro", "response": "..."},
    {"round": 2, "provider": "qwen3-coder", "response": "..."},
    {"round": 3, "provider": "sonnet-4.5", "response": "..."}
  ],
  "finalSynthesis": "..."
}
```

**Acceptance Criteria**:
- ✅ Parallel mode: All providers respond
- ✅ Sequential mode: Min 3 bounces, different providers each round
- ✅ Aggregation/synthesis provided
- ✅ Total execution time < 60s (parallel), < 90s (sequential)

**Automation**: Script in `/audit/techdev/scripts/test-wall-bounce.sh`

---

### 3.4 Audit Logging System (P1)

**Test Cases**:
```bash
# Test 1: Verify audit logging is active
curl http://localhost:8443/api/v1/audit/session/current

# Test 2: Query action logs for today
TODAY=$(date +%Y-%m-%d)
curl "http://localhost:8443/api/v1/audit/logs/action?startDate=$TODAY"

# Test 3: Query security logs
curl "http://localhost:8443/api/v1/audit/logs/security?startDate=$TODAY"

# Test 4: Get daily statistics
curl "http://localhost:8443/api/v1/audit/stats/$TODAY"

# Test 5: Verify filesystem writes
ls -lh /audit/techdev/action/$TODAY.jsonl
ls -lh /audit/techdev/security/$TODAY.jsonl
```

**Acceptance Criteria**:
- ✅ Current session ID returned
- ✅ Action logs contain recent API requests
- ✅ Security logs exist (may be empty if no security events)
- ✅ Daily stats show non-zero counts
- ✅ JSONL files exist and are readable
- ✅ Each log line is valid JSON

**Automation**: Script in `/audit/techdev/scripts/test-audit-logging.sh`

---

### 3.5 Security Mechanisms (P1)

**Test Case 1: CSRF Protection (Gmail OAuth)**
```bash
# Attempt OAuth without state parameter (should fail)
curl "http://localhost:8443/api/v1/gmail/auth/callback?code=test123"
# Expected: HTTP 400 or 403 - Missing state parameter

# Valid flow (generate state first)
STATE=$(uuidgen)
curl "http://localhost:8443/api/v1/gmail/auth/callback?code=test123&state=$STATE"
# Expected: HTTP 400 - Invalid state (not in Redis)
```

**Test Case 2: Input Validation**
```bash
# Invalid email format
curl -X POST http://localhost:8443/api/v1/gmail/send \
  -H "Content-Type: application/json" \
  -d '{"to":"invalid-email","subject":"Test","body":"Test"}'
# Expected: HTTP 400 - Validation error
```

**Test Case 3: Data Sanitization**
```bash
# XSS attempt
curl -X POST http://localhost:8443/api/v1/wall-bounce/single \
  -H "Content-Type: application/json" \
  -d '{"query":"<script>alert(1)</script>","provider":"gemini-2.5-pro"}'
# Expected: Query sanitized or rejected
```

**Acceptance Criteria**:
- ✅ CSRF state validation enforced
- ✅ Invalid email format rejected
- ✅ XSS payloads sanitized or rejected
- ✅ No sensitive data in error messages

**Automation**: Security test suite in `/audit/techdev/scripts/test-security.sh`

---

### 3.6 Hugging Face Embeddings (P2)

**Test Case: Japanese Model Embedding**
```bash
curl -X POST http://localhost:8443/api/v1/huggingface/embed \
  -H "Content-Type: application/json" \
  -d '{
    "text": "自然言語処理は機械学習の一分野です",
    "model": "cl-nagoya/ruri-large"
  }'
```

**Expected**:
```json
{
  "success": true,
  "model": "cl-nagoya/ruri-large",
  "embedding": [0.123, -0.456, ...], // 1024 dimensions
  "dimensions": 1024
}
```

**Test All 7 Models**:
1. `cl-nagoya/ruri-large` (1024d)
2. `pkshatech/GLuCoSE-base-ja` (768d)
3. `intfloat/multilingual-e5-large` (1024d)
4. `cl-nagoya/sup-simcse-ja-large` (1024d)
5. `pkshatech/simcse-ja-bert-base-clcmlp` (768d)
6. `sonoisa/sentence-bert-base-ja-mean-tokens-v2` (768d)
7. `MU-Kindai/SBERT-JSNLI-base` (768d)

**Acceptance Criteria**:
- ✅ All 7 models return embeddings
- ✅ Embedding dimensions match expected values
- ✅ Response time < 5s per request
- ✅ No API rate limit errors

**Automation**: Script in `/audit/techdev/scripts/test-huggingface.sh`

---

### 3.7 IT Support Endpoints (P2)

**Test Cases**:
```bash
# Test 1: Unified endpoint (hybrid mode)
curl -X POST http://localhost:8443/api/v1/it-unified/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "サーバのCPU使用率を確認する方法を教えて",
    "mode": "hybrid"
  }'

# Test 2: IT Support endpoint (legacy)
curl -X POST http://localhost:8443/api/v1/it-support/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Linuxでディスク容量を確認するコマンドは?"}'
```

**Acceptance Criteria**:
- ✅ Both endpoints return HTTP 200
- ✅ Response contains actionable IT support guidance
- ✅ Japanese language properly handled
- ✅ Response time < 15s

**Automation**: Script in `/audit/techdev/scripts/test-it-support.sh`

---

### 3.8 Context7 MCP (P2)

**Test Case**:
```bash
curl -X POST http://localhost:8443/api/v1/context7/search \
  -H "Content-Type: application/json" \
  -d '{
    "library": "react",
    "query": "useState hook usage",
    "topic": "hooks"
  }'
```

**Expected**:
```json
{
  "success": true,
  "library": "react",
  "documentation": "...",
  "relevance": "high"
}
```

**Acceptance Criteria**:
- ✅ HTTP 200 response
- ✅ Documentation retrieved successfully
- ✅ Relevance score included
- ✅ Response time < 10s

**Automation**: Script in `/audit/techdev/scripts/test-context7.sh`

---

### 3.9 Error Handling & Resilience (P2)

**Test Case 1: Circuit Breaker**
```bash
# Simulate repeated failures to trigger circuit breaker
for i in {1..10}; do
  curl -X POST http://localhost:8443/api/v1/gmail/send \
    -H "Content-Type: application/json" \
    -d '{"to":"invalid@example.com","subject":"Test","body":"Test"}'
  sleep 1
done

# Check if circuit breaker opened
curl http://localhost:8443/api/v1/gmail/send \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","body":"Test"}'
# Expected: Circuit breaker open message
```

**Test Case 2: Retry Logic**
```bash
# Monitor audit logs for retry attempts
tail -f /audit/techdev/action/$(date +%Y-%m-%d).jsonl | grep -i retry
```

**Acceptance Criteria**:
- ✅ Circuit breaker opens after threshold failures (5-10)
- ✅ Retry logic invoked (max 3 attempts with exponential backoff)
- ✅ Graceful degradation (no crashes)
- ✅ Audit logs record retry attempts

**Automation**: Script in `/audit/techdev/scripts/test-resilience.sh`

---

## 4. Regression Testing

### 4.1 Quick Smoke Test (5 minutes)

**Purpose**: Verify basic functionality after code changes

```bash
#!/bin/bash
# /audit/techdev/scripts/smoke-test.sh

echo "=== TechSapo Smoke Test ==="

# 1. Health check
echo "1. Server health..."
curl -s http://localhost:8443/health | jq .status

# 2. LLM health
echo "2. LLM providers..."
curl -s http://localhost:8443/api/v1/llm-health | jq '.llm | to_entries[] | {key: .key, status: .value.status}'

# 3. Redis
echo "3. Redis..."
curl -s http://localhost:8443/api/v1/llm-health | jq '.infrastructure.redis.status'

# 4. Single LLM test
echo "4. Quick LLM test..."
curl -s -X POST http://localhost:8443/api/v1/wall-bounce/single \
  -H "Content-Type: application/json" \
  -d '{"query":"Say hello","provider":"gemini-2.5-pro"}' | jq .success

# 5. Audit logging
echo "5. Audit logs..."
curl -s http://localhost:8443/api/v1/audit/session/current | jq .sessionId

echo "=== Smoke Test Complete ==="
```

**Acceptance Criteria**: All 5 checks return expected values

---

### 4.2 Full Regression Suite (30 minutes)

**Purpose**: Comprehensive testing before production deployment

```bash
#!/bin/bash
# /audit/techdev/scripts/regression-test.sh

echo "=== TechSapo Full Regression Test ==="

# Run all test scripts
./test-infrastructure.sh
./test-llm-providers.sh
./test-wall-bounce.sh
./test-audit-logging.sh
./test-security.sh
./test-huggingface.sh
./test-it-support.sh
./test-context7.sh
./test-resilience.sh

# Generate test report
echo "Generating test report..."
./generate-test-report.sh > /audit/techdev/test-reports/$(date +%Y-%m-%d-%H%M%S).md

echo "=== Regression Test Complete ==="
```

---

## 5. Performance Benchmarking

### 5.1 LLM Provider Latency (P3)

**Test Cases**:
```bash
# Measure response times for each provider
for provider in "gemini-2.5-pro" "gpt-5-codex" "qwen3-coder" "sonnet-4.5"; do
  echo "Testing $provider..."
  time curl -X POST http://localhost:8443/api/v1/wall-bounce/single \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"What is 2+2?\",\"provider\":\"$provider\"}"
done
```

**Acceptance Criteria**:
- Gemini: < 10s
- GPT-5: < 5s
- Qwen3: < 5s
- Sonnet 4.5: < 2s

---

### 5.2 Concurrent Request Handling (P3)

**Test Case**:
```bash
# Apache Bench - 100 requests, 10 concurrent
ab -n 100 -c 10 -p query.json -T application/json \
  http://localhost:8443/api/v1/wall-bounce/single
```

**Acceptance Criteria**:
- ✅ 0% failed requests
- ✅ Mean response time < 30s
- ✅ No memory leaks (monitor with `htop`)

---

## 6. Monitoring & Alerting

### 6.1 Continuous Monitoring

**Metrics to Track**:
1. Server uptime
2. Response times (p50, p95, p99)
3. Error rates (HTTP 4xx, 5xx)
4. LLM provider availability
5. Redis connection health
6. Disk space usage
7. Audit log size growth

**Tools**:
- Prometheus (planned - not yet implemented)
- Audit logs (already implemented)
- systemd journal (`journalctl -u techsapo -f`)

---

### 6.2 Alert Thresholds

**Critical (P1)**:
- Server down (uptime = 0)
- All LLM providers unavailable
- Redis connection lost
- Disk usage > 90%

**Warning (P2)**:
- Any LLM provider unavailable
- Disk usage > 80%
- Error rate > 5%
- Response time p95 > 60s

---

## 7. Known Issues & Workarounds

### 7.1 Gmail Routes Returning 404 (P2)

**Issue**: All `/api/v1/gmail/*` endpoints return 404

**Status**: UNRESOLVED

**Workaround**: None currently

**Next Steps**:
1. Inspect `src/routes/gmail-routes.ts` implementation
2. Verify handler exports
3. Check middleware chain for blocking

---

### 7.2 RAG System Unconfigured (P3)

**Issue**: RAG endpoints return "unconfigured" errors

**Status**: EXPECTED - Missing environment variables

**Workaround**: Not needed unless RAG functionality required

**Required Env Vars**:
```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
OPENAI_API_KEY=...
```

---

### 7.3 Webhook System Unconfigured (P3)

**Issue**: Webhook endpoints return "unconfigured" errors

**Status**: EXPECTED - Missing OAuth configuration

**Workaround**: Not needed unless webhook functionality required

---

## 8. Test Automation Strategy

### 8.1 CI/CD Integration (Future)

**Recommended Pipeline**:
```yaml
# .github/workflows/test.yml (example)
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm install
      - name: Run unit tests
        run: npm test
      - name: Build
        run: npm run build
      - name: Smoke test
        run: ./scripts/smoke-test.sh
      - name: Regression test
        run: ./scripts/regression-test.sh
```

---

### 8.2 Pre-Commit Hooks

**Recommended**:
```bash
# .git/hooks/pre-commit
#!/bin/bash
npm run lint
npm test
```

---

## 9. Documentation Requirements

### 9.1 Test Reports

**Format**: Markdown + JSON

**Location**: `/audit/techdev/test-reports/`

**Template**:
```markdown
# Test Report - {DATE}

## Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Duration: Xm Ys

## Results by Category
### P1 Critical
- ✅ Infrastructure: 5/5
- ✅ LLM Providers: 4/4
- ❌ Security: 2/3 (CSRF test failed)

### P2 High
...

## Failed Tests
1. Test Name: CSRF Protection
   - Expected: HTTP 403
   - Actual: HTTP 200
   - Action: Investigate state validation logic

## Recommendations
...
```

---

### 9.2 Test Evidence

**What to Capture**:
1. HTTP request/response logs
2. Audit log entries
3. Screenshot (if applicable)
4. Error stack traces
5. System metrics (CPU, memory, disk)

**Storage**: `/audit/techdev/test-evidence/{test-run-id}/`

---

## 10. Maintenance Schedule

### 10.1 Daily
- ❌ (Manual) Smoke test before first production deployment
- ✅ (Automated) Audit log rotation
- ✅ (Automated) Disk space monitoring

### 10.2 Weekly
- ❌ (Manual) Full regression suite
- ❌ (Manual) Review audit logs for anomalies
- ❌ (Manual) Check dependency updates

### 10.3 Monthly
- ❌ (Manual) Performance benchmarking
- ❌ (Manual) Security audit
- ❌ (Manual) Documentation updates

### 10.4 Quarterly
- ❌ (Manual) Load testing
- ❌ (Manual) Disaster recovery drill
- ❌ (Manual) Third-party security audit

---

## 11. Success Metrics

### 11.1 Test Coverage
**Target**: 80% of endpoints tested

**Current Status**:
- Core Services: 100% (4/4)
- LLM Providers: 100% (4/4)
- Hugging Face: 100% (7/7)
- IT Support: 100% (2/2)
- Wall-Bounce: 100% (2/2)
- Context7: 100% (1/1)
- **Overall: 80%** ✅

---

### 11.2 Uptime
**Target**: 99.5% (monthly)

**Measurement**: systemd uptime + audit logs

---

### 11.3 Error Rate
**Target**: < 1% (HTTP 5xx)

**Measurement**: Audit logs + access logs

---

### 11.4 Response Time
**Target**: p95 < 30s

**Measurement**: Audit log `duration` field

---

## 12. Appendix

### 12.1 Test Scripts Location
All test scripts should be created in: `/audit/techdev/scripts/`

```bash
/audit/techdev/scripts/
├── smoke-test.sh              # 5-minute quick check
├── regression-test.sh         # 30-minute full suite
├── test-infrastructure.sh     # Infrastructure health
├── test-llm-providers.sh      # All 4 LLM providers
├── test-wall-bounce.sh        # Multi-LLM orchestration
├── test-audit-logging.sh      # Audit system
├── test-security.sh           # CSRF, validation, sanitization
├── test-huggingface.sh        # 7 embedding models
├── test-it-support.sh         # IT support endpoints
├── test-context7.sh           # Context7 MCP
├── test-resilience.sh         # Circuit breaker, retry
└── generate-test-report.sh    # Report generation
```

---

### 12.2 Environment-Specific Configuration

**Development** (`npm run dev`):
- Port: 3000
- Hot reload enabled
- Verbose logging
- Mock LLM providers (optional)

**Staging** (future):
- Port: 8443
- Production-like environment
- Real LLM providers
- Test data only

**Production**:
- Port: 8443
- Optimized build
- Minimal logging
- Real data

---

### 12.3 Contact Information

**Questions/Issues**:
- Primary: DevOps Team
- Escalation: System Architecture Team
- Emergency: On-call rotation (future)

---

**Document History**:
- 2025-10-04: v1.0 - Initial version (comprehensive testing plan)

---

**Next Review Date**: 2025-11-04
