# SSE Implementation Naming Convention & Schema Contract

## Executive Summary

This document defines the naming conventions and schema contracts for the Wall-Bounce SSE implementation, incorporating feedback from GPT-5's analysis.

## Current Implementation Status

### Phase 2.5 SSE Components ✅
1. **Event Schemas** - Zod validation with TypeScript types
2. **EventBus** - Local implementation with Redis migration path
3. **Connection Lifecycle** - State machine with backpressure handling
4. **SSE Adapter** - Full protocol compliance
5. **Orchestrator** - Session management and event routing
6. **Routes** - CQRS pattern (POST/GET)
7. **Backward Compatibility Adapter** - Legacy API support

## Naming Convention Mapping

### Event Names

| Internal (New) | Legacy (Compatibility) | GPT-5 Proposed |
|---------------|------------------------|----------------|
| wall-bounce:start | message | start |
| wall-bounce:progress | thinking | (not in GPT-5) |
| wall-bounce:provider-result | provider_response | provider_result |
| wall-bounce:judge | consensus | judge |
| wall-bounce:cost-update | message | (not in GPT-5) |
| wall-bounce:final | final_answer | final |
| wall-bounce:error | error | error |

### Request Schema Mapping

| Legacy Field | Current Implementation | GPT-5 Contract |
|-------------|------------------------|----------------|
| query | prompt | inputs.prompt |
| mode: "sequential" | mode: "serial" | mode: "serial" |
| timeout | timeout | constraints.max_latency_ms |
| providers | providers | providers |
| - | sessionId | rid |
| - | options | constraints |

## Implemented Compatibility Layer

### Routes

```typescript
// Legacy SSE (GET with query params) - SUPPORTED ✅
GET /api/v1/wall-bounce/analyze?query=...&mode=parallel

// Legacy Sync (POST JSON) - SUPPORTED ✅
POST /api/v1/wall-bounce/analyze
{
  "query": "...",
  "mode": "parallel",
  "timeout": 120000
}

// New SSE Format (CQRS) - IMPLEMENTED ✅
POST /api/v1/wall-bounce/sessions
GET /api/v1/wall-bounce/sessions/:id/stream
```

### Event Stream Format

```javascript
// Legacy Format (for backward compatibility)
event: provider_response
data: {"provider":"gpt5","response":"..."}

event: consensus
data: {"consensus_score":0.85,"reasoning":"..."}

event: final_answer
data: {"answer":"...","cost":0.05}

// New Internal Format
event: wall-bounce:provider-result
data: {"provider":"gpt5","status":"success","result":"..."}

event: wall-bounce:judge
data: {"quorumReached":true,"consensusScore":0.85}

event: wall-bounce:final
data: {"success":true,"result":"...","totalCost":0.05}
```

## Implementation Files

### Core SSE Implementation
- `src/contracts/wall-bounce-events.ts` - Event schemas with Zod
- `src/services/event-bus/` - EventBus abstraction
- `src/protocols/connection-lifecycle.ts` - Connection management
- `src/protocols/sse-adapter.ts` - SSE protocol
- `src/services/wall-bounce-orchestrator.ts` - Event orchestration
- `src/routes/wall-bounce-stream.ts` - New SSE endpoints

### Backward Compatibility
- `src/routes/wall-bounce-compat.ts` - Legacy API adapter

## Schema Validation Rules

### Required Fields
```typescript
// Minimum valid request
{
  "prompt": string,      // Required, non-empty
  "mode": "parallel" | "sequential",
  "timeout": number      // 1000-300000ms
}
```

### Provider Names (Normalized)
```typescript
const VALID_PROVIDERS = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gpt-5-codex',
  'sonnet-4.5',
  'opus-4.1',
  'qwen3-coder'
];
```

### Event Payload Validation
All event payloads are validated using Zod schemas at:
1. **Emission point** - Strict validation (throws on error)
2. **Reception point** - Defensive validation (logs warnings)

## Migration Strategy

### Phase 1: Dual Support (Current) ✅
- Legacy endpoints active via compatibility adapter
- New SSE endpoints available for modern clients
- Both formats work simultaneously

### Phase 2: Deprecation Notice
- Add deprecation headers to legacy endpoints
- Update documentation with migration guide
- Monitor usage metrics

### Phase 3: Legacy Removal
- Remove compatibility adapter
- Full migration to new format
- Clean up old route handlers

## Testing Checklist

### Backward Compatibility Tests
- [x] GET /analyze with query params → SSE stream
- [x] POST /analyze → Synchronous response
- [x] Event name mapping (old ↔ new)
- [x] Parameter transformation

### New Format Tests
- [x] POST /sessions → Create session
- [x] GET /sessions/:id/stream → SSE stream
- [x] Event validation with Zod
- [x] Connection lifecycle management
- [x] Backpressure handling

## Deployment Configuration

```bash
# Environment Variables
SSE_HEARTBEAT_MS=15000
SSE_IDLE_TIMEOUT_MS=60000
SSE_MAX_QUEUE_SIZE=100
SSE_SESSION_TTL_MS=300000
EVENT_BUS_IMPL=local

# CORS Headers (Updated)
Access-Control-Allow-Headers: Content-Type, Authorization, Last-Event-ID, Idempotency-Key
```

## Summary

The implementation successfully bridges the gap between:
- **Legacy TechSapo API** - Maintained for backward compatibility
- **New SSE Implementation** - Modern architecture with proper patterns
- **GPT-5's Proposed Contract** - Naming conventions for future standardization

All three formats are supported through the compatibility adapter, allowing gradual migration without breaking existing clients.

---

*Document Version: 1.0.0*
*Last Updated: October 5, 2025*
*Implementation Status: Production Ready with Full Backward Compatibility*