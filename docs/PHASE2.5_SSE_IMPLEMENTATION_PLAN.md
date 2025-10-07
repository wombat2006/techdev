# Phase 2.5: SSE Integration Implementation Plan

**Date**: 2025-10-05
**Status**: 📋 **DESIGN COMPLETE - READY FOR IMPLEMENTATION**
**Estimated Effort**: 2-3 days
**Dependencies**: Phase 1 + Phase 2 (Complete ✅)

---

## Executive Summary

This plan integrates **Server-Sent Events (SSE)** into the Wall-Bounce system to provide real-time progress updates during execution. The design is based on Gemini 2.5 Pro's **EventEmitter-based WallBounceOrchestrator** architecture and maintains **100% backward compatibility** with existing `/api/v1/wall-bounce` endpoint.

### Key Features

✅ **Real-time Progress Tracking** - Client receives live updates (START → PROVIDER_RESULT → JUDGE → FINAL)
✅ **Backward Compatible** - Existing synchronous API unchanged
✅ **Clean Architecture** - EventEmitter decouples business logic from transport
✅ **SRP Compliant** - All new files <500 lines
✅ **Phase 1+2 Integration** - Leverages Quorum + Cost Tracking

---

## Architecture Overview

### Design Philosophy: Wrapper Pattern ✅

**Decision**: **WRAP existing code** instead of modifying it.

**Rationale**:
1. **Zero Risk** - Existing tests pass unchanged
2. **Clean Separation** - SSE logic isolated from business logic
3. **Dual Mode Support** - Same orchestrator for SSE and sync modes

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Request                          │
└──────────────────┬──────────────────────────────────────────┘
                   │
          ┌────────┴─────────┐
          │                  │
    ┌─────▼─────┐     ┌─────▼──────┐
    │ /wall-    │     │ /wall-     │
    │ bounce    │     │ bounce-    │
    │ (sync)    │     │ stream     │
    │           │     │ (SSE)      │
    └─────┬─────┘     └─────┬──────┘
          │                 │
          │    ┌────────────▼────────────────┐
          │    │ WallBounceOrchestrator      │
          │    │ (EventEmitter)              │
          │    │                             │
          └───►│ - Wraps NextGen Analyzer    │
               │ - Emits typed events        │
               │ - Dual mode: Stream/Promise │
               └──────────┬──────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    ┌────▼────┐   ┌──────▼──────┐   ┌────▼────┐
    │ Analyzer│   │ QuorumJudge │   │ Cost    │
    │ NextGen │   │             │   │ Tracker │
    └─────────┘   └─────────────┘   └─────────┘
         │                │                │
         └────────────────┴────────────────┘
                   Phase 1+2 (Existing)
```

---

## Event Stream Design

### Event Types

Based on `wall-bounce-analyzer-nextgen.ts` execution flow:

```typescript
export enum WallBounceEvent {
  START = 'start',              // Execution begins
  PROGRESS = 'progress',        // Progress update (0-100%)
  PROVIDER_RESULT = 'provider_result', // Provider completed
  JUDGE = 'judge',              // Quorum decision made
  COST_UPDATE = 'cost_update',  // Cost tracking update
  FINAL = 'final',              // Execution complete
  ERROR = 'error'               // Error occurred
}
```

### Event Flow Mapping

Mapping `executeParallelModeWithQuorum()` to SSE events:

| Line # | Code Section | SSE Event | Progress % | Payload |
|--------|-------------|-----------|------------|---------|
| 99-118 | Session start + config | `START` | 0% | `{mode, sessionId, providers, quorum}` |
| 127-144 | Cost-based provider selection | `PROGRESS` | 5% | `{message, selectedProviders}` |
| 147-161 | Preflight cost estimation | `COST_UPDATE` | 10% | `{estimatedCost, budgetImpact}` |
| 187-263 | **Provider loop** | - | - | - |
| 219 | Provider response received | `PROVIDER_RESULT` | +35% per provider (max 70%) | `{provider, status, tokens, cost}` |
| 222-232 | Cost tracking | `COST_UPDATE` | - | `{provider, actualCost}` |
| 239-251 | Quorum check → early stop | `JUDGE` | 80% | `{decision, winner, shouldStop}` |
| 269-279 | Quorum finalization | `JUDGE` | 85% | `{achievedQuorum, earlyStop}` |
| 288-294 | Aggregation | `PROGRESS` | 90% | `{message: 'Aggregating...'}` |
| 298-364 | Build final result | `FINAL` | 100% | `{result, costSummary, quorumResult}` |

### Progress Calculation

**Parallel Mode** (7 steps):

```typescript
// Step 1: START
progress = 0%

// Step 2-3: Preflight
progress = 10%

// Step 4: Provider results (70% budget)
//   If k=2, maxProviders=4:
//     Provider 1: 0.7 * (1/4) = 17.5% → total 27.5%
//     Provider 2: 0.7 * (2/4) = 35% → total 45%
//     Quorum achieved → early stop
progress = 10% + (completedProviders / totalProviders) * 70%

// Step 5: Judge decision
progress = 80%

// Step 6: Aggregation
progress = 90%

// Step 7: Final
progress = 100%
```

---

## File Structure

### New Files (3 files, ~800 lines total)

#### 1. `src/types/wallBounceEvents.ts` (~150 lines)

**Responsibility**: Type definitions for SSE events

```typescript
export enum WallBounceEvent {
  START = 'start',
  PROGRESS = 'progress',
  PROVIDER_RESULT = 'provider_result',
  JUDGE = 'judge',
  COST_UPDATE = 'cost_update',
  FINAL = 'final',
  ERROR = 'error'
}

export interface SseEvent<T> {
  type: WallBounceEvent;
  timestamp: number;
  payload: T;
}

export interface StartPayload {
  mode: 'parallel' | 'serial';
  sessionId: string;
  providers: string[];
  quorumConfig: QuorumConfig;
}

export interface ProgressPayload {
  percentage: number;
  message: string;
}

export interface ProviderResultPayload {
  provider: string;
  status: 'success' | 'failure';
  executionTimeMs: number;
  tokens?: { input: number; output: number };
  cost?: number;
  resultSnippet: string; // First 200 chars
}

export interface JudgePayload {
  decision: 'continue' | 'early_stop';
  achievedQuorum: boolean;
  winner?: string;
  reason?: string;
  votingSummary: {
    k: number;
    votesReceived: number;
    consensusScore: number;
  };
}

export interface CostUpdatePayload {
  provider?: string;
  estimatedTotalCost?: number;
  actualCostSoFar?: number;
  budgetStatus: {
    dailyRemaining: number;
    alertLevel: 'normal' | 'warning' | 'critical' | 'exceeded';
  };
}

export interface FinalPayload {
  result: WallBounceResult;
  quorumResult?: any;
  costSummary?: SessionCostSummary;
  totalExecutionTimeMs: number;
}

export interface ErrorPayload {
  message: string;
  code?: string;
  provider?: string;
  stack?: string;
}
```

**SRP Status**: ✅ Single responsibility - Event type definitions only

---

#### 2. `src/services/wallBounceOrchestrator.ts` (~400 lines)

**Responsibility**: Wrap NextGen Analyzer and emit typed events

```typescript
import { EventEmitter } from 'events';
import { WallBounceAnalyzerNextGen } from './wall-bounce-analyzer-nextgen';
import { wallBounceCostTracker } from './wall-bounce-cost-tracker';
import { NextGenExecuteOptions, WallBounceResult } from '../types/wall-bounce-nextgen';
import { SessionCostSummary } from '../types/cost-tracker';
import {
  WallBounceEvent,
  StartPayload,
  ProgressPayload,
  ProviderResultPayload,
  JudgePayload,
  CostUpdatePayload,
  FinalPayload,
  ErrorPayload
} from '../types/wallBounceEvents';
import { logger } from '../utils/logger';

export interface OrchestratorOptions extends NextGenExecuteOptions {
  enableEvents?: boolean; // Default: true for stream mode
}

/**
 * Wall-Bounce Orchestrator
 * Wraps WallBounceAnalyzerNextGen and emits SSE events
 */
export class WallBounceOrchestrator extends EventEmitter {
  private analyzer: WallBounceAnalyzerNextGen;
  private enableEvents: boolean;

  constructor(options: OrchestratorOptions = {}) {
    super();
    this.analyzer = new WallBounceAnalyzerNextGen();
    this.enableEvents = options.enableEvents ?? true;
  }

  /**
   * Execute wall-bounce with event emission
   * Returns promise for synchronous mode, emits events for streaming mode
   */
  async execute(
    prompt: string,
    options: OrchestratorOptions = {}
  ): Promise<WallBounceResult & { quorumResult?: any; costSummary?: SessionCostSummary }> {
    const startTime = Date.now();
    const sessionId = `wb-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      // Emit START event
      this.emitEvent(WallBounceEvent.START, {
        mode: options.mode || 'parallel',
        sessionId,
        providers: options.providers || [],
        quorumConfig: options.earlyStop || {}
      });

      this.emitProgress(0, 'Initializing wall-bounce execution...');

      // Hook into analyzer's callbacks for event emission
      const optionsWithCallbacks: NextGenExecuteOptions = {
        ...options,
        onThinking: (provider, stage, message) => {
          // Emit progress during provider execution
          logger.debug(`[${provider}] ${stage}: ${message}`);
        },
        onProviderResponse: (provider, response) => {
          // Emit PROVIDER_RESULT event
          this.emitProviderResult(provider, response);
        },
        onConsensusUpdate: (score) => {
          logger.debug(`Consensus score: ${score}`);
        }
      };

      // Execute NextGen analyzer (wraps existing Phase 1+2 logic)
      const result = await this.executeWithEventHooks(prompt, optionsWithCallbacks);

      // Emit FINAL event
      const finalPayload: FinalPayload = {
        result,
        quorumResult: result.quorumResult,
        costSummary: result.costSummary,
        totalExecutionTimeMs: Date.now() - startTime
      };

      this.emitEvent(WallBounceEvent.FINAL, finalPayload);
      this.emitProgress(100, 'Execution complete');

      return result;

    } catch (error) {
      const errorPayload: ErrorPayload = {
        message: error instanceof Error ? error.message : String(error),
        code: 'EXECUTION_ERROR',
        stack: error instanceof Error ? error.stack : undefined
      };

      this.emitEvent(WallBounceEvent.ERROR, errorPayload);
      throw error;
    }
  }

  /**
   * Execute with event hooks (wraps analyzer.executeWithQuorum)
   */
  private async executeWithEventHooks(
    prompt: string,
    options: NextGenExecuteOptions
  ): Promise<WallBounceResult & { quorumResult?: any; costSummary?: SessionCostSummary }> {

    // Preflight cost estimation
    if (options.costTracking?.enabled && options.costTracking?.preflightEstimate) {
      this.emitProgress(5, 'Estimating costs...');

      const costEstimate = wallBounceCostTracker.estimateWallBounceCost(
        options.providers || [],
        prompt,
        options.costTracking?.estimatedOutputTokens || 1000
      );

      const costUpdatePayload: CostUpdatePayload = {
        estimatedTotalCost: costEstimate.totalEstimatedCost,
        budgetStatus: {
          dailyRemaining: wallBounceCostTracker.getBudgetStatus().dailyRemaining,
          alertLevel: wallBounceCostTracker.getBudgetStatus().alertLevel
        }
      };

      this.emitEvent(WallBounceEvent.COST_UPDATE, costUpdatePayload);
      this.emitProgress(10, `Estimated cost: $${costEstimate.totalEstimatedCost.toFixed(4)}`);
    }

    // Execute NextGen analyzer (this calls executeParallelModeWithQuorum internally)
    // We intercept callbacks to emit events
    const result = await this.analyzer.executeWithQuorum(prompt, options);

    // Emit JUDGE event after quorum finalization
    if (result.quorumResult) {
      const judgePayload: JudgePayload = {
        decision: result.quorumResult.result.earlyStopTriggered ? 'early_stop' : 'continue',
        achievedQuorum: result.quorumResult.result.achievedQuorum,
        winner: result.quorumResult.result.winner,
        reason: result.quorumResult.result.reason,
        votingSummary: {
          k: result.quorumResult.config.k,
          votesReceived: result.providers_used.length,
          consensusScore: result.consensus_score
        }
      };

      this.emitEvent(WallBounceEvent.JUDGE, judgePayload);
      this.emitProgress(85, `Quorum ${judgePayload.achievedQuorum ? 'achieved' : 'not achieved'}`);
    }

    // Emit final cost update
    if (result.costSummary) {
      const finalCostPayload: CostUpdatePayload = {
        actualCostSoFar: result.costSummary.totalCost,
        budgetStatus: {
          dailyRemaining: wallBounceCostTracker.getBudgetStatus().dailyRemaining,
          alertLevel: wallBounceCostTracker.getBudgetStatus().alertLevel
        }
      };

      this.emitEvent(WallBounceEvent.COST_UPDATE, finalCostPayload);
    }

    this.emitProgress(90, 'Finalizing results...');

    return result;
  }

  /**
   * Emit provider result event
   */
  private emitProviderResult(provider: string, response: any): void {
    const payload: ProviderResultPayload = {
      provider,
      status: 'success',
      executionTimeMs: 0, // TODO: track from analyzer
      tokens: response.tokens,
      cost: 0, // TODO: get from cost tracker
      resultSnippet: response.substring(0, 200)
    };

    this.emitEvent(WallBounceEvent.PROVIDER_RESULT, payload);

    // Update progress (simplified: assume linear progress)
    // In production, calculate based on completedProviders/totalProviders
    this.emitProgress(20, `Provider ${provider} completed`);
  }

  /**
   * Emit progress event
   */
  private emitProgress(percentage: number, message: string): void {
    const payload: ProgressPayload = {
      percentage: Math.max(0, Math.min(100, Math.round(percentage))),
      message
    };

    this.emitEvent(WallBounceEvent.PROGRESS, payload);
  }

  /**
   * Generic event emitter
   */
  private emitEvent<T>(type: WallBounceEvent, payload: T): void {
    if (!this.enableEvents) return;

    const event: SseEvent<T> = {
      type,
      timestamp: Date.now(),
      payload
    };

    this.emit(type, event);
    this.emit('*', event); // Wildcard listener for SSE controller

    logger.debug(`[SSE Event] ${type}`, payload);
  }

  /**
   * Cleanup (for connection close)
   */
  cleanup(): void {
    this.removeAllListeners();
    logger.debug('Orchestrator cleanup completed');
  }
}
```

**SRP Status**: ✅ Single responsibility - Event orchestration wrapper

**Key Design Decisions**:
1. **Wraps** existing analyzer (no modification to phase 1+2 code)
2. **Dual mode**: `enableEvents=true` for SSE, `false` for sync
3. **Hooks into callbacks**: Uses `onProviderResponse`, `onThinking` from NextGenExecuteOptions
4. **Progress tracking**: Simplified version (can be enhanced in production)

---

#### 3. `src/routes/wall-bounce-stream.ts` (~250 lines)

**Responsibility**: SSE endpoint handler

```typescript
import { Router, Request, Response } from 'express';
import { WallBounceOrchestrator } from '../services/wallBounceOrchestrator';
import { NextGenExecuteOptions } from '../types/wall-bounce-nextgen';
import { WallBounceEvent, SseEvent } from '../types/wallBounceEvents';
import { logger } from '../utils/logger';

export const wallBounceStreamRouter = Router();

/**
 * SSE endpoint: /api/v1/wall-bounce-stream
 * Provides real-time progress updates during wall-bounce execution
 */
wallBounceStreamRouter.post('/wall-bounce-stream', async (req: Request, res: Response) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable nginx buffering
  });

  const { prompt, ...options } = req.body;

  if (!prompt) {
    sendSseEvent(res, WallBounceEvent.ERROR, {
      message: 'Missing required field: prompt',
      code: 'INVALID_REQUEST'
    });
    res.end();
    return;
  }

  // Create orchestrator with event emission enabled
  const orchestrator = new WallBounceOrchestrator({
    ...options,
    enableEvents: true
  });

  // Send SSE events to client
  const eventListener = (event: SseEvent<any>) => {
    sendSseEvent(res, event.type, event.payload);
  };

  orchestrator.on('*', eventListener);

  // Handle client disconnect
  req.on('close', () => {
    logger.info('Client disconnected, cleaning up orchestrator');
    orchestrator.cleanup();
    res.end();
  });

  try {
    // Execute (events are emitted automatically)
    await orchestrator.execute(prompt, options);

    // Close connection after FINAL event
    res.end();
  } catch (error) {
    logger.error('Wall-bounce stream error', {
      error: error instanceof Error ? error.message : String(error)
    });

    sendSseEvent(res, WallBounceEvent.ERROR, {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'EXECUTION_ERROR'
    });

    res.end();
  }
});

/**
 * Helper: Send SSE event
 */
function sendSseEvent(res: Response, eventType: string, data: any): void {
  res.write(`event: ${eventType}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Synchronous endpoint (backward compatible)
 * Uses same orchestrator but waits for final result
 */
wallBounceStreamRouter.post('/wall-bounce', async (req: Request, res: Response) => {
  const { prompt, ...options } = req.body;

  if (!prompt) {
    res.status(400).json({ error: 'Missing required field: prompt' });
    return;
  }

  // Create orchestrator with event emission DISABLED
  const orchestrator = new WallBounceOrchestrator({
    ...options,
    enableEvents: false // No SSE overhead
  });

  try {
    const result = await orchestrator.execute(prompt, options);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Wall-bounce sync error', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'EXECUTION_ERROR'
    });
  }
});
```

**SRP Status**: ✅ Single responsibility - SSE route handling

---

### Modified Files (1 file, minimal changes)

#### `src/index.ts` or `src/app.ts`

**Changes**: Register new SSE router

```typescript
// Add import
import { wallBounceStreamRouter } from './routes/wall-bounce-stream';

// Register route
app.use('/api/v1', wallBounceStreamRouter);
```

**Impact**: ~3 lines added

---

## Integration Strategy

### Option A: Modify Existing Analyzer (❌ Not Recommended)

**Rejected because**:
- Risks breaking existing tests
- Mixes concerns (business logic + event emission)
- Requires changes to 401-line file

### Option B: Wrapper Pattern (✅ Recommended)

**Selected because**:
1. **Zero Risk** - No changes to Phase 1+2 code
2. **Clean Separation** - EventEmitter logic isolated
3. **Backward Compatible** - Existing tests pass unchanged
4. **Testable** - Can mock orchestrator separately

---

## Event Emission Points (Detailed)

### executeParallelModeWithQuorum() Flow

```typescript
// Line 99-118: Session initialization
// ├─ emit START event
// └─ emit PROGRESS(0%, "Initializing...")

// Line 127-144: Cost-based provider selection (optional)
// └─ emit PROGRESS(5%, "Selecting providers...")

// Line 147-161: Preflight cost estimation
// ├─ emit COST_UPDATE (estimatedTotalCost)
// └─ emit PROGRESS(10%, "Cost estimated: $X.XX")

// Line 187-263: Provider execution loop
for (const provider of providers) {
  // Line 204-209: Invoke provider
  // (internal - no event yet)

  // Line 219: Provider response received
  // ├─ emit PROVIDER_RESULT(provider, status, tokens, cost)
  // └─ emit PROGRESS(10% + (completed/total)*70%, "Provider X completed")

  // Line 222-232: Track cost
  // └─ emit COST_UPDATE(actualCostSoFar)

  // Line 239-251: Quorum check
  if (shouldStop) {
    // ├─ emit JUDGE(decision='early_stop', winner)
    // └─ emit PROGRESS(80%, "Quorum achieved, stopping early")
    break;
  }
}

// Line 269-279: Finalize quorum result
// ├─ emit JUDGE(achievedQuorum, earlyStop, votingSummary)
// └─ emit PROGRESS(85%, "Quorum finalized")

// Line 288-294: Aggregation
// └─ emit PROGRESS(90%, "Aggregating results...")

// Line 298-364: Build final result
// ├─ emit FINAL(result, quorumResult, costSummary)
// └─ emit PROGRESS(100%, "Complete")
```

---

## Testing Strategy

### Unit Tests

#### 1. **wallBounceEvents.test.ts**
- Validate type definitions
- Ensure event payloads match schemas

#### 2. **wallBounceOrchestrator.test.ts**
- Mock `WallBounceAnalyzerNextGen`
- Verify event emission sequence:
  - START → PROGRESS → PROVIDER_RESULT (×N) → JUDGE → COST_UPDATE → FINAL
- Test error handling:
  - Emit ERROR event on failure
- Test dual mode:
  - `enableEvents=true`: events emitted
  - `enableEvents=false`: no events (sync mode)

#### 3. **wall-bounce-stream.test.ts**
- Integration test with real SSE client
- Verify SSE format:
  ```
  event: start
  data: {"mode":"parallel",...}

  event: provider_result
  data: {"provider":"gpt-5",...}
  ```
- Test client disconnect cleanup

### Regression Tests

✅ **Critical**: All existing tests must pass unchanged

```bash
npm test -- tests/integration-phase1-phase2.test.ts
npm test -- tests/wall-bounce-cost-tracker.test.ts
```

**Expected**: 21/21 tests passing (no failures)

---

## Deployment Plan

### Phase 2.5 Implementation Steps

#### Day 1: Core Implementation (6-8 hours)
1. ✅ Create `src/types/wallBounceEvents.ts` (150 lines)
2. ✅ Create `src/services/wallBounceOrchestrator.ts` (400 lines)
3. ✅ Unit tests for orchestrator (17 tests)

#### Day 2: SSE Endpoint + Integration (6-8 hours)
4. ✅ Create `src/routes/wall-bounce-stream.ts` (250 lines)
5. ✅ Modify `src/index.ts` (3 lines)
6. ✅ Integration tests (3 tests with real SSE client)

#### Day 3: Polish + Documentation (4-6 hours)
7. ✅ Manual testing with Postman/curl
8. ✅ Update API documentation
9. ✅ Performance testing (SSE overhead measurement)
10. ✅ Deploy to production

---

## Production Considerations

### Performance

**SSE Overhead**:
- Event serialization: ~0.1ms per event
- Network transmission: ~5-10ms per event (depends on client latency)
- Total overhead: ~50ms for typical 7-event flow

**Mitigation**:
- Sync mode bypasses events (`enableEvents=false`)
- Use nginx buffering=off for SSE
- Consider Redis pub/sub for multi-instance deployments

### Error Handling

**Connection Issues**:
```typescript
req.on('close', () => {
  // Cleanup orchestrator
  // Abort in-flight provider requests (if possible)
  orchestrator.cleanup();
});
```

**Provider Failures**:
```typescript
try {
  const response = await provider.execute(prompt);
  emitEvent('provider_result', { status: 'success', ... });
} catch (error) {
  emitEvent('provider_result', { status: 'failure', error: error.message });
  // Continue with other providers (quorum-based resilience)
}
```

### Security

**Rate Limiting**:
```typescript
// Apply stricter limits to SSE endpoints (long-lived connections)
app.use('/api/v1/wall-bounce-stream', rateLimit({
  windowMs: 60 * 1000,
  max: 10 // 10 SSE connections per minute
}));
```

**Authentication**:
```typescript
// Reuse existing JWT/API key middleware
app.use('/api/v1/wall-bounce-stream', authenticateJWT);
```

---

## Client Implementation Example

### JavaScript/TypeScript Client

```typescript
// public/wall-bounce-ui.html (based on GPT-5's HTML)
async function executeWallBounce() {
  const response = await fetch('/api/v1/wall-bounce-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Refactor this code...',
      taskType: 'basic',
      earlyStop: { enabled: true, k: 2 },
      costTracking: { enabled: true }
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let eventEnd;
    while ((eventEnd = buffer.indexOf('\n\n')) >= 0) {
      const eventChunk = buffer.slice(0, eventEnd);
      buffer = buffer.slice(eventEnd + 2);

      const event = parseSSE(eventChunk);
      handleEvent(event);
    }
  }
}

function parseSSE(chunk) {
  const lines = chunk.split('\n');
  let event = null, data = '';

  for (const line of lines) {
    if (line.startsWith('event: ')) event = line.slice(7);
    if (line.startsWith('data: ')) data = line.slice(6);
  }

  return { event, data: JSON.parse(data) };
}

function handleEvent(event) {
  switch (event.event) {
    case 'start':
      console.log('Started:', event.data);
      break;
    case 'progress':
      updateProgressBar(event.data.percentage);
      break;
    case 'provider_result':
      appendLog(`Provider ${event.data.provider}: ${event.data.status}`);
      break;
    case 'judge':
      console.log('Quorum decision:', event.data);
      break;
    case 'final':
      console.log('Complete:', event.data.result);
      break;
    case 'error':
      console.error('Error:', event.data.message);
      break;
  }
}
```

---

## Backward Compatibility Verification

### Existing Endpoint Unchanged

**Before Phase 2.5**:
```typescript
POST /api/v1/wall-bounce
{
  "prompt": "...",
  "taskType": "basic",
  "earlyStop": { "enabled": true, "k": 2 }
}

→ Returns: { providers_used, consensus_score, quorumResult, costSummary }
```

**After Phase 2.5**:
```typescript
// SAME endpoint, SAME behavior
POST /api/v1/wall-bounce
{
  "prompt": "...",
  "taskType": "basic",
  "earlyStop": { "enabled": true, "k": 2 }
}

→ Returns: { providers_used, consensus_score, quorumResult, costSummary }
```

✅ **Zero breaking changes** - Orchestrator uses `enableEvents=false` for sync mode

---

## Success Metrics

### Implementation Quality

- ✅ All new files <500 lines (SRP compliant)
- ✅ 100% test coverage for orchestrator
- ✅ Zero regression test failures (21/21 passing)
- ✅ TypeScript compilation: 0 errors

### Production Quality

- ✅ SSE latency <50ms overhead vs sync mode
- ✅ Client receives events within 100ms of emission
- ✅ Connection cleanup on client disconnect (<1s)
- ✅ Error rate <0.1% for SSE connections

---

## Next Steps After Phase 2.5

### Optional Enhancements

1. **WebSocket Support** - For bi-directional communication (cancel execution)
2. **Event Replay** - Store events in Redis for reconnection
3. **Multi-Client Broadcast** - Share progress across multiple clients (same sessionId)
4. **Detailed Progress** - Per-provider progress tracking (not just completion)

### Phase 3 Options

**Phase 3: LLM Judge** (3-4 days)
- Advanced quality evaluation with structured templates
- Integration with SSE (emit `JUDGE_EVAL` events)

**Phase 4: Acceptance Rules + Auto-Recovery** (3-4 days)
- Validation rules for provider outputs
- Retry strategies with SSE progress updates

---

## Conclusion

This plan delivers **real-time visibility** into Wall-Bounce execution while maintaining:

✅ **Zero Breaking Changes** - Backward compatible with existing API
✅ **Clean Architecture** - EventEmitter-based wrapper pattern
✅ **SRP Compliance** - All files <500 lines
✅ **Phase 1+2 Integration** - Leverages Quorum + Cost Tracking
✅ **Production Ready** - Error handling, cleanup, security considered

**Estimated Effort**: 2-3 days
**Risk Level**: Low (wrapper pattern, no modifications to existing code)
**Value**: High (real-time progress, better UX, foundation for future features)

---

**Status**: 📋 **READY FOR IMPLEMENTATION**
**Next Action**: Begin Day 1 implementation (create wallBounceEvents.ts + wallBounceOrchestrator.ts)
