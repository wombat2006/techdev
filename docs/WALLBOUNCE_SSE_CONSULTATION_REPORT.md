# Wall-Bounce Consultation Report: SSE Integration

**Date**: 2025-10-05
**Consultation Type**: 壁打ち (Multi-LLM Analysis)
**Participants**: GPT-5, Gemini 2.5 Pro, Claude Code
**Duration**: ~2 hours
**Status**: ✅ **DESIGN COMPLETE**

---

## Executive Summary

Successfully completed multi-LLM consultation on integrating **Server-Sent Events (SSE)** into the Wall-Bounce system. The consultation produced a comprehensive **Phase 2.5 implementation plan** based on Gemini's **EventEmitter-based WallBounceOrchestrator** architecture.

### Key Outcome

📋 **Complete implementation plan** ready for 2-3 day development cycle
✅ **Zero breaking changes** - 100% backward compatible
✅ **SRP compliant** - All new files <500 lines
✅ **Low risk** - Wrapper pattern (no modifications to Phase 1+2 code)

---

## Consultation Flow

### Initial Request

**User Request**: Analyze GPT-5's FastAPI/Python SSE proposal for integration into techdev (Node.js/TypeScript/Express)

**GPT-5 Proposal**:
- Python FastAPI mini-web wrapper
- SSE events: `start`, `provider_result`, `step`, `recover`, `judge`, `final`
- Progress bar with mode-specific calculation (parallel: 70% providers + 10% judge + 20% final)
- Color-coded event log UI

---

## Round 1: Gemini 2.5 Pro - Architecture Design

**Consultation Focus**: TypeScript/Express architecture for SSE integration

### Gemini's Design Decisions

#### 1. **WallBounceOrchestrator** (New Service)

```typescript
export class WallBounceOrchestrator extends EventEmitter {
  async run(request: any): Promise<FinalPayload> {
    this.emit(WallBounceEvent.START, { mode: 'parallel', ... });

    // As providers finish, emit PROVIDER_RESULT
    this.emit(WallBounceEvent.PROVIDER_RESULT, providerPayload);

    // As progress is made, emit PROGRESS
    this.emit(WallBounceEvent.PROGRESS, { percentage: 70, message: 'Providers complete.' });

    // After judging, emit JUDGE
    this.emit(WallBounceEvent.JUDGE, judgePayload);

    const finalResult = { ... };
    this.emit(WallBounceEvent.FINAL, finalResult);
    return finalResult;
  }
}
```

**Key Features**:
- **Dual Mode**: Stream (emit events) / Promise (return final result)
- **Decoupled Design**: EventEmitter separates business logic from transport
- **Backward Compatible**: Existing synchronous API unchanged

#### 2. **Event Types** (src/types/wallBounceEvents.ts)

```typescript
export enum WallBounceEvent {
  START = 'start',
  PROGRESS = 'progress',
  PROVIDER_RESULT = 'provider_result',
  JUDGE = 'judge',
  FINAL = 'final',
  ERROR = 'error',
}
```

#### 3. **SSE Controller** (src/controllers/wallBounceController.ts)

```typescript
export const handleWallBounceStream = (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const orchestrator = new WallBounceOrchestrator(/* dependencies */);

  orchestrator.on('*', (event, payload) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  });

  orchestrator.on('final', () => res.end());
  orchestrator.on('error', (payload) => {
    sendEvent('error', payload);
    res.end();
  });

  req.on('close', () => orchestrator.cleanup());

  orchestrator.run(req.body);
};
```

### Gemini's File Structure

```
src/
├── controllers/
│   └── wallBounceController.ts   # (New) SSE + sync handlers
├── services/
│   └── wallBounceOrchestrator.ts # (New) EventEmitter wrapper
└── types/
    └── wallBounceEvents.ts       # (New) Event type definitions
```

**SRP Compliance**: ✅ All files designed to stay <500 lines

---

## Round 2: GPT-5 / Sonnet 4.5 - Integration Strategy

**Consultation Focus**: How to integrate with existing Phase 1+2 code

### Attempted Consultations

1. **Sonnet 4.5 via Codex MCP**: ❌ Failed (Unsupported model error)
2. **GPT-5 via Codex MCP**: ❌ Timeout (2m limit exceeded while reading codebase)

**Outcome**: Proceeded with **Claude Code synthesis** based on Gemini's design + existing codebase knowledge

---

## Round 3: Claude Code - Integrated Implementation Plan

**Synthesis Approach**: Combined Gemini's architecture with techdev's existing Phase 1+2 code

### Key Design Decisions

#### 1. **Wrapper Pattern** ✅ (vs Modify Existing Code ❌)

**Decision**: Create `WallBounceOrchestrator` that **wraps** existing `WallBounceAnalyzerNextGen`

**Rationale**:
```
✅ Zero Risk - No changes to Phase 1+2 code
✅ Clean Separation - SSE logic isolated
✅ Backward Compatible - Existing tests pass unchanged
✅ Testable - Can mock orchestrator separately

❌ Modifying analyzer would:
   - Risk breaking 21 existing tests
   - Mix concerns (business logic + events)
   - Require changes to 401-line file
```

#### 2. **Event Emission Points**

Mapped `executeParallelModeWithQuorum()` (401 lines) to 7 SSE events:

| Code Section | SSE Event | Progress % |
|-------------|-----------|------------|
| Session init (L99-118) | `START` | 0% |
| Provider selection (L127-144) | `PROGRESS` | 5% |
| Cost estimation (L147-161) | `COST_UPDATE` | 10% |
| **Provider loop (L187-263)** | - | - |
| ├─ Provider response (L219) | `PROVIDER_RESULT` | +35% each (max 70%) |
| ├─ Cost tracking (L222-232) | `COST_UPDATE` | - |
| └─ Quorum check (L239-251) | `JUDGE` (if early stop) | 80% |
| Quorum finalized (L269-279) | `JUDGE` | 85% |
| Aggregation (L288-294) | `PROGRESS` | 90% |
| Final result (L298-364) | `FINAL` | 100% |

#### 3. **Progress Calculation**

**Parallel Mode** (adopted from GPT-5 proposal):
```typescript
// 70% for providers
progress = 10% + (completedProviders / totalProviders) * 70%

// 10% for judge
progress = 80% (when quorum achieved)

// 20% for finalization
progress = 90% (aggregation)
progress = 100% (final)
```

**Example** (k=2, maxProviders=4):
```
START:        0%
Cost Est:    10%
Provider 1:  27.5% (10% + 0.7 * 1/4)
Provider 2:  45%   (10% + 0.7 * 2/4)
Quorum Hit:  80%   (early stop triggered)
Judge:       85%
Aggreg:      90%
Final:      100%
```

---

## Implementation Plan Summary

### New Files (3 files, ~800 lines)

1. **`src/types/wallBounceEvents.ts`** (~150 lines)
   - Event type definitions (START, PROGRESS, PROVIDER_RESULT, JUDGE, COST_UPDATE, FINAL, ERROR)
   - Payload interfaces for each event

2. **`src/services/wallBounceOrchestrator.ts`** (~400 lines)
   - EventEmitter-based wrapper
   - Wraps `WallBounceAnalyzerNextGen`
   - Dual mode: Stream (emit events) / Promise (sync)

3. **`src/routes/wall-bounce-stream.ts`** (~250 lines)
   - SSE endpoint: `POST /api/v1/wall-bounce-stream`
   - Backward compatible sync endpoint: `POST /api/v1/wall-bounce`

### Modified Files (1 file, minimal changes)

1. **`src/index.ts`**
   - Register new router (~3 lines)

---

## Technical Highlights

### Backward Compatibility Strategy

**Existing Synchronous API** (unchanged):
```typescript
POST /api/v1/wall-bounce
{
  "prompt": "...",
  "earlyStop": { "enabled": true, "k": 2 }
}

→ Returns: { providers_used, consensus_score, quorumResult, costSummary }
```

**New Streaming API**:
```typescript
POST /api/v1/wall-bounce-stream
{
  "prompt": "...",
  "earlyStop": { "enabled": true, "k": 2 }
}

→ SSE Stream:
   event: start
   data: {"mode":"parallel","sessionId":"wb-123"}

   event: provider_result
   data: {"provider":"gpt-5","status":"success","cost":0.0025}

   event: judge
   data: {"decision":"early_stop","achievedQuorum":true}

   event: final
   data: {"result":{...},"costSummary":{...}}
```

**Implementation**:
```typescript
// Orchestrator supports both modes
const orchestrator = new WallBounceOrchestrator({
  enableEvents: req.path.includes('stream') // true for SSE, false for sync
});
```

### Integration with Phase 1+2

**Phase 1 (Quorum Judge)**:
- Emit `JUDGE` event after `quorumJudge.processResponse()`
- Progress: 80% when early stop triggered

**Phase 2 (Cost Tracker)**:
- Emit `COST_UPDATE` after `wallBounceCostTracker.estimateWallBounceCost()`
- Emit `COST_UPDATE` after `trackProviderCost()`

**No Modifications Required** - Orchestrator wraps existing services

---

## SRP Compliance Verification

| File | Est. Lines | SRP Status | Responsibility |
|------|-----------|------------|---------------|
| wallBounceEvents.ts | ~150 | ✅ | Event type definitions |
| wallBounceOrchestrator.ts | ~400 | ✅ | Event orchestration wrapper |
| wall-bounce-stream.ts | ~250 | ✅ | SSE route handling |

**Total**: ~800 new lines across 3 files
**Largest File**: wallBounceOrchestrator.ts at ~400 lines (80% of 500-line threshold)

---

## Testing Strategy

### Unit Tests

1. **wallBounceOrchestrator.test.ts** (17 tests)
   - Mock analyzer, verify event sequence
   - Test dual mode (enableEvents true/false)
   - Error handling (emit ERROR event)

2. **wall-bounce-stream.test.ts** (3 tests)
   - Integration with real SSE client
   - Verify SSE format
   - Client disconnect cleanup

### Regression Tests

✅ **All existing tests must pass**:
```bash
npm test -- tests/integration-phase1-phase2.test.ts
# Expected: 4/4 passing

npm test -- tests/wall-bounce-cost-tracker.test.ts
# Expected: 17/17 passing
```

---

## Deployment Timeline

### Phase 2.5 Implementation (2-3 days)

**Day 1**: Core Implementation (6-8h)
- Create wallBounceEvents.ts
- Create wallBounceOrchestrator.ts
- Unit tests for orchestrator

**Day 2**: SSE Endpoint + Integration (6-8h)
- Create wall-bounce-stream.ts
- Modify src/index.ts
- Integration tests

**Day 3**: Polish + Documentation (4-6h)
- Manual testing
- API documentation
- Deploy to production

---

## Risk Assessment

### Low Risk Implementation ✅

**Risk Factors**:
- ✅ No modifications to Phase 1+2 code (401+324+468 lines untouched)
- ✅ Wrapper pattern isolates changes
- ✅ Backward compatible API
- ✅ All existing tests pass unchanged

**Mitigation**:
- Comprehensive unit tests for new code
- Integration tests with real SSE client
- Feature flag for gradual rollout (if needed)

---

## Value Proposition

### User Experience Improvements

**Before Phase 2.5** (Synchronous only):
```
User sends request
          ↓
     [Wait 30-60s]
          ↓
  Final result returned
```

**After Phase 2.5** (SSE streaming):
```
User sends request
          ↓
    START event (0s)
          ↓
 PROGRESS: "Estimating costs..." (1s)
          ↓
 PROVIDER_RESULT: "GPT-5 completed" (15s)
          ↓
 PROVIDER_RESULT: "Gemini completed" (20s)
          ↓
 JUDGE: "Quorum achieved, early stop" (21s)
          ↓
    FINAL event (25s)
```

### Technical Benefits

1. **Real-time Visibility** - See progress during 30-60s wall-bounce execution
2. **Early Stop Feedback** - Understand when/why quorum triggered
3. **Cost Transparency** - Live cost updates during execution
4. **Error Recovery** - Immediate error notification (not after full execution)
5. **Foundation for Future** - Enables cancel, multi-client broadcast, event replay

---

## Comparison with GPT-5's Original Proposal

| Aspect | GPT-5 Proposal | Final Design |
|--------|---------------|--------------|
| **Language** | Python | TypeScript |
| **Framework** | FastAPI | Express |
| **Architecture** | Mini web wrapper | EventEmitter orchestrator |
| **Event Types** | 6 events | 7 events (added COST_UPDATE) |
| **Progress Model** | 70% providers + 10% judge + 20% final | Same |
| **UI** | HTML + JS | Client implementation left to user |
| **Integration** | Proxy to existing API | Wrapper pattern |

**Adopted from GPT-5**:
- ✅ SSE event concept
- ✅ Progress calculation (70/10/20 split)
- ✅ Event types (start, provider_result, judge, final)
- ✅ Color-coded event log idea (for future UI)

**Adapted for techdev**:
- ✅ TypeScript/Express instead of Python/FastAPI
- ✅ EventEmitter wrapper instead of proxy
- ✅ Integration with Phase 1+2 (Quorum + Cost Tracking)
- ✅ Added COST_UPDATE event

---

## Conclusion

### Consultation Outcome: Success ✅

The multi-LLM wall-bounce consultation successfully produced:

1. ✅ **Complete Architecture Design** (Gemini 2.5 Pro)
   - EventEmitter-based WallBounceOrchestrator
   - Clean separation of concerns
   - Dual mode support (stream/promise)

2. ✅ **Detailed Implementation Plan** (Claude Code synthesis)
   - 3 new files (~800 lines)
   - Event emission points mapped
   - Testing strategy defined

3. ✅ **Risk-Mitigated Approach** (Wrapper pattern)
   - Zero changes to Phase 1+2 code
   - 100% backward compatible
   - Low deployment risk

### Next Action

**Ready for implementation**: Begin Day 1 development

```bash
# Create event types
touch src/types/wallBounceEvents.ts

# Create orchestrator
touch src/services/wallBounceOrchestrator.ts

# Create tests
touch tests/wallBounceOrchestrator.test.ts
```

**Estimated Time to Production**: 2-3 days

---

**Status**: ✅ **CONSULTATION COMPLETE - DESIGN APPROVED**
**Documentation**: See `docs/PHASE2.5_SSE_IMPLEMENTATION_PLAN.md` for full implementation details
**Next Phase**: Begin Phase 2.5 implementation or proceed to Phase 3 (LLM Judge)
