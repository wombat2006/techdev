# Conversation History Manual Testing Guide

This guide provides manual testing steps for the conversation history system, including API endpoints and end-to-end workflows.

## Prerequisites

1. **Server Running**: Ensure TechSapo server is running
   ```bash
   cd /ai/prj/techdev
   npm run dev  # Development (port 5000)
   # OR
   npm start    # Production (port 8443)
   ```

2. **Environment Variables**: Verify Redis is configured
   ```bash
   echo $UPSTASH_REDIS_REST_URL
   echo $UPSTASH_REDIS_REST_TOKEN
   ```

3. **Dependencies**: All LLM providers configured
   - Gemini CLI: `gemini "test"`
   - GPT-5 Codex: `codex exec --model gpt-5-codex "test"`
   - OpenRouter: `echo $OPENROUTER_API_KEY`

## Test 1: Enable Conversation History in Wall-Bounce

### Test Parallel Mode with History

```bash
curl -X POST http://localhost:8443/api/v1/wall-bounce \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain the benefits of TypeScript over JavaScript",
    "options": {
      "mode": "parallel",
      "minProviders": 2,
      "enableConversationHistory": true,
      "sessionId": "manual-test-session-1"
    }
  }' | jq
```

**Expected Response**:
```json
{
  "final_answer": "...",
  "consensus_score": 0.X,
  "quality_score": 0.X,
  "providers_used": ["gemini-2.5-pro", "gpt-5-codex"],
  "conversation_history": {
    "conversationId": "...",
    "sessionId": "manual-test-session-1",
    "executionMode": "parallel",
    "rounds": [
      {
        "roundNumber": 1,
        "mode": "parallel",
        "providerResponses": [...]
      }
    ],
    "finalResult": {...},
    "performance": {...}
  }
}
```

**Verify**:
- ✅ `conversation_history` field exists
- ✅ `conversationId` is UUID format
- ✅ `sessionId` matches request
- ✅ `rounds` array has 1 item (parallel mode)
- ✅ `performance.totalCost` is calculated

### Test Deep Sequential Mode with History

```bash
curl -X POST http://localhost:8443/api/v1/wall-bounce-serial \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Design a scalable microservices architecture for an e-commerce platform",
    "options": {
      "mode": "sequential",
      "depth": 3,
      "enableConversationHistory": true,
      "sessionId": "manual-test-session-2"
    }
  }' | jq
```

**Expected Response**:
```json
{
  "final_answer": "...",
  "conversation_history": {
    "conversationId": "...",
    "sessionId": "manual-test-session-2",
    "executionMode": "deep-sequential",
    "rounds": [
      {
        "roundNumber": 1,
        "mode": "deep-sequential",
        "prompt": {
          "original": "Design a scalable...",
          "context": null
        }
      },
      {
        "roundNumber": 2,
        "mode": "deep-sequential",
        "prompt": {
          "original": "Design a scalable...",
          "context": "Previous response mentioned..."
        }
      },
      {
        "roundNumber": 3,
        "mode": "deep-sequential",
        "prompt": {
          "context": "Cumulative insights..."
        }
      }
    ]
  }
}
```

**Verify**:
- ✅ 3 rounds present (depth=3)
- ✅ Round 2+ has `context` field
- ✅ Each round has `providerResponses`
- ✅ `executionMode` is `deep-sequential`

## Test 2: Retrieve Conversation by ID

**Save the conversationId from Test 1, then:**

```bash
# Get conversation as JSON
curl http://localhost:8443/api/v1/conversations/{conversationId} | jq

# Get conversation as Markdown
curl http://localhost:8443/api/v1/conversations/{conversationId}?format=markdown
```

**Expected Response (JSON)**:
```json
{
  "success": true,
  "conversation": {
    "conversationId": "...",
    "sessionId": "...",
    "rounds": [...],
    "finalResult": {...}
  }
}
```

**Expected Response (Markdown)**:
```markdown
# Conversation History

**ID**: {conversationId}
**Session**: {sessionId}
**Mode**: parallel
**Started**: 2025-01-10T...
**Total Cost**: $0.0234

---

## Round 1 (completed)

**Prompt**: Explain the benefits...

### Responses:

#### Gemini 2.5 Pro (Tier 1)
- **Confidence**: 0.920
- **Cost**: $0.0012
- **Latency**: 150ms

TypeScript provides static typing...
```

**Verify**:
- ✅ Markdown format is human-readable
- ✅ All rounds displayed
- ✅ Provider responses included

## Test 3: List Conversations by Session

```bash
curl "http://localhost:8443/api/v1/conversations/session/manual-test-session-1?limit=10" | jq
```

**Expected Response**:
```json
{
  "success": true,
  "sessionId": "manual-test-session-1",
  "count": 2,
  "conversations": [
    {
      "conversationId": "...",
      "sessionId": "manual-test-session-1",
      "startTime": "2025-01-10T...",
      "executionMode": "parallel",
      "totalRounds": 1,
      "totalCost": 0.0234,
      "consensusScore": 0.92,
      "qualityScore": 0.88,
      "providersUsed": ["gemini-2.5-pro", "gpt-5-codex"]
    }
  ]
}
```

**Verify**:
- ✅ All conversations from session returned
- ✅ Summaries only (not full histories)
- ✅ Most recent first (sorted by startTime)

## Test 4: Search Conversations with Filters

```bash
curl -X POST http://localhost:8443/api/v1/conversations/search \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "manual-test-session-1",
    "minCost": 0.01,
    "maxCost": 0.1,
    "executionMode": "parallel",
    "limit": 20
  }' | jq
```

**Expected Response**:
```json
{
  "success": true,
  "conversations": [...],
  "total": 5,
  "hasMore": false
}
```

**Verify**:
- ✅ Only conversations matching filters returned
- ✅ Cost range respected
- ✅ `hasMore` indicates pagination state

## Test 5: Get Statistics

```bash
# All conversations
curl http://localhost:8443/api/v1/conversations/stats | jq

# Specific session
curl "http://localhost:8443/api/v1/conversations/stats?sessionId=manual-test-session-1" | jq
```

**Expected Response**:
```json
{
  "success": true,
  "sessionId": "manual-test-session-1",
  "statistics": {
    "totalConversations": 5,
    "totalCost": 0.1234,
    "averageCost": 0.0247,
    "totalRounds": 12,
    "averageRounds": 2.4,
    "executionModes": {
      "parallel": 3,
      "deep-sequential": 2
    },
    "averageConsensusScore": 0.89,
    "averageQualityScore": 0.86
  }
}
```

**Verify**:
- ✅ Aggregated metrics calculated correctly
- ✅ Execution modes breakdown included

## Test 6: Export Conversation

```bash
# Export as JSON (download)
curl -OJ "http://localhost:8443/api/v1/conversations/{conversationId}/export?format=json"

# Export as Markdown (download)
curl -OJ "http://localhost:8443/api/v1/conversations/{conversationId}/export?format=markdown"
```

**Expected Files**:
- `conversation-{conversationId}.json` (full JSON)
- `conversation-{conversationId}.md` (formatted markdown)

**Verify**:
- ✅ Files downloaded with correct names
- ✅ Content is complete and formatted

## Test 7: Delete Conversation

```bash
# Create a test conversation first
CONV_ID=$(curl -X POST http://localhost:8443/api/v1/wall-bounce \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Test for deletion",
    "options": {
      "mode": "parallel",
      "minProviders": 1,
      "enableConversationHistory": true,
      "sessionId": "delete-test"
    }
  }' | jq -r '.conversation_history.conversationId')

echo "Created conversation: $CONV_ID"

# Verify it exists
curl http://localhost:8443/api/v1/conversations/$CONV_ID | jq

# Delete it
curl -X DELETE http://localhost:8443/api/v1/conversations/$CONV_ID | jq

# Verify deletion (should return 404)
curl http://localhost:8443/api/v1/conversations/$CONV_ID
```

**Expected Output**:
```json
{
  "success": true,
  "message": "Conversation deleted successfully",
  "conversationId": "..."
}
```

Then 404:
```json
{
  "error": "Conversation not found",
  "conversationId": "..."
}
```

**Verify**:
- ✅ Deletion succeeds
- ✅ Subsequent GET returns 404
- ✅ Removed from session index

## Test 8: Backward Compatibility

### Without enableConversationHistory

```bash
curl -X POST http://localhost:8443/api/v1/wall-bounce \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is 2+2?",
    "options": {
      "mode": "parallel",
      "minProviders": 1
    }
  }' | jq
```

**Expected Response**:
```json
{
  "final_answer": "4",
  "consensus_score": 1.0,
  "quality_score": 1.0,
  "providers_used": ["gemini-2.5-pro"]
  // NO conversation_history field
}
```

**Verify**:
- ✅ `conversation_history` field absent (not null, absent)
- ✅ Response structure unchanged from before

## Test 9: Error Handling

### Invalid Conversation ID

```bash
curl http://localhost:8443/api/v1/conversations/invalid-id-12345
```

**Expected**: 404 with error message

### Invalid Search Query

```bash
curl -X POST http://localhost:8443/api/v1/conversations/search \
  -H "Content-Type: application/json" \
  -d '{
    "minCost": 100,
    "maxCost": 1
  }'
```

**Expected**: Valid response with 0 results (cost range impossible)

## Test 10: Performance & TTL

### Verify TTL (30 days default)

```bash
# Check Redis TTL for a conversation
redis-cli TTL "conversation:{conversationId}"
```

**Expected**: ~2592000 seconds (30 days)

### Test Cleanup

```bash
# This requires server-side script execution
# OR manually trigger via maintenance endpoint (if implemented)
```

## Checklist Summary

After completing all tests:

- ✅ Conversation history builder works (unit tests passed)
- ✅ Parallel mode tracking works
- ✅ Deep sequential mode tracking works (3-6 rounds)
- ✅ Error handling in rounds works
- ✅ Redis persistence works (save/retrieve)
- ✅ Session-based retrieval works
- ✅ Search with filters works
- ✅ Statistics calculation works
- ✅ JSON export works
- ✅ Markdown export works
- ✅ Deletion works
- ✅ Backward compatibility maintained
- ✅ API endpoints respond correctly
- ✅ Audit logging works (check logs)

## Audit Log Verification

Check that all API calls are logged:

```bash
tail -f logs/app.log | grep conversation_history
```

**Expected Entries**:
```
conversation_history_retrieve - conversationId: ...
conversation_history_list_by_session - sessionId: ...
conversation_history_search - query: {...}
conversation_history_export - conversationId: ...
conversation_history_delete - conversationId: ...
```

## Success Criteria

✅ **All manual tests pass**
✅ **Unit tests pass** (3/3 builder tests)
✅ **API returns correct responses**
✅ **Redis persistence works**
✅ **Export formats are correct**
✅ **Backward compatibility maintained**
✅ **Audit logging captures all actions**

## Notes

- Persistence tests skipped in automated tests due to Redis mock limitations
- API endpoint tests require full server running
- Use this manual testing guide for comprehensive validation
- Consider adding these tests to a Postman collection for easier re-testing
