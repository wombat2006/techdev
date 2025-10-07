# Phase 2.5 SSE Integration - Final Architecture Plan

## Executive Summary

This plan synthesizes architectural feedback from Opus 4.1, Gemini 2.5 Pro, and GPT-5 Codex to create a production-ready SSE implementation for the Wall-Bounce system. The design addresses all 6 P0 critical issues while maintaining pragmatic scope for initial deployment.

## Core Architecture Decisions

### 1. Event System: Schema-Driven Registry (No Wildcards)

**Decision**: Use explicit event registry with TypeScript compile-time safety.

```typescript
// src/contracts/wall-bounce-events.ts
export const WallBounceEvents = {
  START: 'wall-bounce:start',
  PROGRESS: 'wall-bounce:progress',
  PROVIDER_RESULT: 'wall-bounce:provider-result',
  JUDGE: 'wall-bounce:judge',
  COST_UPDATE: 'wall-bounce:cost-update',
  FINAL: 'wall-bounce:final',
  ERROR: 'wall-bounce:error'
} as const;

export type WallBounceEventType = typeof WallBounceEvents[keyof typeof WallBounceEvents];

// Zod schemas for each event
export const EventSchemas = {
  [WallBounceEvents.PROGRESS]: z.object({
    percentage: z.number().min(0).max(100),
    message: z.string().max(500),
    timestamp: z.string().datetime()
  }),
  // ... other events
};
```

**Rationale**:
- No eventemitter2 dependency
- Type-safe at compile time
- Schema validation at runtime

### 2. Connection Management: State Machine with Lifecycle

**Decision**: Implement connection state machine with atomic cleanup and backpressure handling.

```typescript
// src/protocols/connection-lifecycle.ts
export enum ConnectionState {
  INITIALIZING = 'INITIALIZING',
  CONNECTED = 'CONNECTED',
  BACKPRESSURED = 'BACKPRESSURED',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED'
}

export class ConnectionLifecycle {
  private connections = new Map<string, {
    state: ConnectionState,
    queue: BoundedQueue<SseEvent>,
    listeners: Map<string, Function>,
    heartbeat: NodeJS.Timeout,
    lastActivity: number,
    abortController: AbortController
  }>();

  // Atomic state transitions
  transition(connectionId: string, newState: ConnectionState): boolean {
    const conn = this.connections.get(connectionId);
    if (!conn || !this.isValidTransition(conn.state, newState)) {
      return false;
    }
    conn.state = newState;
    this.emit('state-change', { connectionId, state: newState });
    return true;
  }

  // Backpressure-aware send
  async send(connectionId: string, event: SseEvent): Promise<boolean> {
    const conn = this.connections.get(connectionId);
    if (!conn || conn.state === ConnectionState.CLOSED) {
      return false;
    }

    if (conn.queue.isFull()) {
      this.transition(connectionId, ConnectionState.BACKPRESSURED);
      // Drop oldest event and increment metric
      conn.queue.dropOldest();
      this.metrics.increment('events.dropped', { connectionId });
    }

    return conn.queue.enqueue(event);
  }
}
```

**Features**:
- State machine prevents invalid operations
- Bounded queue with drop-on-overflow
- Metrics for dropped events
- Idle timeout detection

### 3. Validation: Dual-Layer Defense

**Decision**: Validate at emission AND reception with different strictness levels.

```typescript
// src/services/validating-orchestrator.ts
export class ValidatingOrchestrator {
  // Strict validation at emission
  emit<T extends WallBounceEventType>(
    event: T,
    data: unknown
  ): void {
    try {
      const schema = EventSchemas[event];
      const validated = schema.parse(data); // Throws on invalid
      this.eventBus.emit(event, validated);
    } catch (error) {
      this.logger.error('Event validation failed', { event, error });
      throw new ValidationError(`Invalid event payload: ${error.message}`);
    }
  }

  // Defensive validation at reception
  private handleBusEvent(event: string, data: unknown): void {
    try {
      const schema = EventSchemas[event];
      const validated = schema.safeParse(data);

      if (!validated.success) {
        this.logger.warn('Received invalid event', {
          event,
          errors: validated.error.issues
        });
        // Continue with partial data if possible
        this.processEvent(event, data);
      } else {
        this.processEvent(event, validated.data);
      }
    } catch (error) {
      // Log but don't crash
      this.logger.error('Event processing failed', { event, error });
    }
  }
}
```

### 4. SSE Protocol: Standards-Compliant with Reconnection Support

**Decision**: Implement full SSE spec including `id` field and `Last-Event-ID` header.

```typescript
// src/protocols/sse-adapter.ts
export class SseAdapter implements ProtocolAdapter {
  private eventId: number = 0;
  private heartbeatInterval: number;

  constructor(
    private res: Response,
    private options: SseOptions = {}
  ) {
    this.heartbeatInterval = options.heartbeatMs ??
      parseInt(process.env.SSE_HEARTBEAT_MS || '15000');

    // Setup SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable nginx buffering
    });

    this.startHeartbeat();
  }

  send(event: string, data: any): boolean {
    if (this.res.writableEnded) return false;

    this.eventId++;
    const message = [
      `id: ${this.eventId}`,
      `event: ${event}`,
      `data: ${JSON.stringify(data)}`,
      '', ''
    ].join('\n');

    // Handle backpressure
    const canWrite = this.res.write(message);
    if (!canWrite) {
      this.emit('backpressure');
    }
    return canWrite;
  }

  private startHeartbeat(): void {
    const timer = setInterval(() => {
      if (!this.res.writableEnded) {
        this.res.write(':keepalive\n\n');
      } else {
        clearInterval(timer);
      }
    }, this.heartbeatInterval);
  }
}
```

**Note**: Full reconnection with replay requires Redis Streams (Phase 3).

### 5. HTTP Flow: CQRS with Session Management

**Decision**: Use POST→GET pattern for standard compliance.

```typescript
// src/routes/wall-bounce-sessions.ts

// Step 1: Create session (Command)
router.post('/api/v1/wall-bounce/sessions', async (req, res) => {
  const { prompt, options } = req.body;

  // Validate with idempotency key
  const idempotencyKey = req.headers['idempotency-key'] as string;
  if (idempotencyKey) {
    const existing = await sessionStore.getByIdempotencyKey(idempotencyKey);
    if (existing) {
      return res.json({
        sessionId: existing.id,
        streamUrl: `/api/v1/wall-bounce/sessions/${existing.id}/stream`
      });
    }
  }

  const sessionId = uuidv4();
  await sessionStore.create(sessionId, {
    prompt,
    options,
    idempotencyKey,
    createdAt: Date.now(),
    ttl: 300000 // 5 minutes
  });

  // Start async processing
  orchestrator.startAnalysis(sessionId, prompt, options);

  res.status(201).json({
    sessionId,
    streamUrl: `/api/v1/wall-bounce/sessions/${sessionId}/stream`,
    resultUrl: `/api/v1/wall-bounce/sessions/${sessionId}/result`
  });
});

// Step 2: Stream events (Query)
router.get('/api/v1/wall-bounce/sessions/:sessionId/stream', async (req, res) => {
  const { sessionId } = req.params;
  const lastEventId = req.headers['last-event-id'] as string;

  const session = await sessionStore.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Initialize SSE connection
  const connection = connectionManager.register(sessionId, res, {
    lastEventId: lastEventId ? parseInt(lastEventId) : undefined
  });

  // Subscribe to session events
  orchestrator.subscribe(sessionId, connection);

  // Handle client disconnect
  req.on('close', () => {
    connectionManager.cleanup(sessionId);
    orchestrator.unsubscribe(sessionId, connection);
  });
});
```

### 6. Scalability: Progressive Enhancement with Clear Boundaries

**Decision**: Start with local EventBus, document migration path to Redis Streams.

```typescript
// src/services/event-bus/index.ts
export interface EventBus {
  // Core interface
  emit(event: string, data: any): Promise<void>;
  subscribe(pattern: string, handler: EventHandler): Subscription;

  // Delivery guarantees (documented in interface)
  readonly guarantees: {
    delivery: 'at-most-once' | 'at-least-once' | 'exactly-once';
    ordering: 'none' | 'partial' | 'total';
    replay: boolean;
  };
}

// Phase 2.5: Local implementation
export class LocalEventBus implements EventBus {
  readonly guarantees = {
    delivery: 'at-most-once' as const,
    ordering: 'total' as const,
    replay: false
  };

  private emitter = new EventEmitter();
  // Simple in-process implementation
}

// Phase 2.5b: Redis Pub/Sub (documented limitations)
export class RedisPubSubBus implements EventBus {
  readonly guarantees = {
    delivery: 'at-most-once' as const,
    ordering: 'none' as const,
    replay: false
  };
  // Fire-and-forget, no replay
}

// Phase 3: Redis Streams (full features)
export class RedisStreamsBus implements EventBus {
  readonly guarantees = {
    delivery: 'at-least-once' as const,
    ordering: 'partial' as const,  // Per stream
    replay: true
  };
  // Supports Last-Event-ID reconnection
}
```

## Implementation Scope

### Phase 2.5a (Week 1) - Core SSE
- [ ] Event schemas and registry (~150 lines)
- [ ] Connection lifecycle manager (~200 lines)
- [ ] SSE protocol adapter (~150 lines)
- [ ] Validating orchestrator (~250 lines)
- [ ] Session routes (~200 lines)
- [ ] Local EventBus (~100 lines)
- [ ] Basic metrics (~100 lines)

### Phase 2.5b (Week 2) - Production Hardening
- [ ] Bounded queue implementation (~100 lines)
- [ ] Backpressure handling (~100 lines)
- [ ] Idle timeout detection (~50 lines)
- [ ] Graceful shutdown (~100 lines)
- [ ] Redis Pub/Sub EventBus (~150 lines)
- [ ] Health checks (~50 lines)
- [ ] Integration tests (~300 lines)

### Phase 3 (Future) - Full Reliability
- [ ] Redis Streams EventBus
- [ ] Event replay from cursor
- [ ] Per-client retention windows
- [ ] WebSocket adapter
- [ ] Event sourcing patterns

## Configuration

```bash
# Environment variables
SSE_HEARTBEAT_MS=15000          # Heartbeat interval
SSE_IDLE_TIMEOUT_MS=60000       # Idle connection timeout
SSE_MAX_QUEUE_SIZE=100          # Per-connection queue size
SSE_MAX_QUEUE_AGE_MS=30000      # Max event age in queue
SSE_SESSION_TTL_MS=300000       # Session expiry (5 min)
EVENT_BUS_IMPL=local            # local|redis-pubsub|redis-streams
REDIS_URL=redis://localhost:6379 # For distributed mode
```

## Observability

### Metrics
```typescript
// Key metrics to implement
sse.connections.active         // Gauge: Current connections
sse.connections.created        // Counter: New connections
sse.connections.closed         // Counter: Closed connections
sse.events.sent               // Counter: Events sent by type
sse.events.dropped            // Counter: Dropped events by reason
sse.queue.depth               // Histogram: Queue sizes
sse.latency.send              // Histogram: Send latency
sse.heartbeat.sent            // Counter: Heartbeats sent
sse.errors                    // Counter: Errors by type
```

### Health Checks
```typescript
// GET /health/sse
{
  "status": "healthy",
  "connections": {
    "active": 42,
    "backpressured": 2
  },
  "eventBus": {
    "type": "local",
    "status": "connected"
  },
  "memory": {
    "heapUsed": "124MB",
    "heapTotal": "256MB"
  }
}
```

## Testing Strategy

### Unit Tests
- Event schema validation
- Connection state transitions
- Queue bounds and overflow
- Backpressure handling

### Integration Tests
- Full SSE flow (POST→GET→events)
- Client disconnect handling
- Session expiry
- Concurrent connections
- Event ordering (local mode)

### Load Tests
- 1000 concurrent connections
- Burst event generation
- Memory stability over time
- Graceful degradation

## Security Considerations

1. **Authentication**: Validate session tokens before SSE subscription
2. **Authorization**: Filter events based on user permissions
3. **Rate Limiting**: Limit connections per user/IP
4. **Input Validation**: Strict Zod validation on all inputs
5. **PII Protection**: Scrub sensitive data from events and logs

## Migration Path

### From Current System
1. Deploy alongside existing `/wall-bounce` endpoint
2. No changes to Phase 1+2 code (wrapper pattern)
3. Feature flag for SSE mode
4. Gradual client migration

### To Redis Streams (Future)
1. Implement RedisStreamsBus
2. Add cursor management
3. Enable replay support
4. Update client retry logic

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Memory leaks | Bounded queues, connection limits, monitoring |
| Event loss | Document at-most-once semantics, plan Redis Streams upgrade |
| Backpressure | Drop oldest events, metrics, client notification |
| Reconnect storms | Exponential backoff, rate limiting |
| Process crashes | Graceful shutdown, health checks, container orchestration |

## Dependencies

### Required
- `zod`: ^3.22.4 (validation)
- `uuid`: ^9.0.1 (session IDs)

### Optional (Phase 2.5b)
- `ioredis`: ^5.3.2 (already installed)

### Future (Phase 3)
- Redis Streams support (built into ioredis)

## Success Criteria

1. **Functional**: SSE streams work for wall-bounce analysis
2. **Performance**: <100ms latency for event delivery
3. **Reliability**: 99.9% uptime, graceful degradation
4. **Scalability**: Support 1000+ concurrent connections
5. **Observability**: Full metrics and tracing
6. **Security**: No unauthorized event access

## Summary

This final architecture synthesizes the best insights from all three LLM consultations:

- **Opus 4.1**: Clean separation of concerns, progressive enhancement
- **Gemini 2.5 Pro**: State machines, configurable heartbeats, clear migration warnings
- **GPT-5 Codex**: Backpressure handling, SSE spec compliance, production observability

The design solves all 6 P0 issues while maintaining pragmatic scope for initial implementation. Phase 2.5a delivers core SSE functionality in Week 1, Phase 2.5b hardens for production in Week 2, and Phase 3 adds full reliability with Redis Streams when needed.

Total implementation: ~1,750 lines across 10 files, all under 300 lines each (SRP compliant).