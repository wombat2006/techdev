# OpenAI Agents JS Integration Guide

## 🤖 Overview

OpenAI Agents JS (`@openai/agents`) is a lightweight, powerful framework for multi-agent workflows and voice agents that can enhance TechSapo's wall-bounce analysis capabilities.

## 📦 Installation & Setup

### Basic Installation
```bash
npm install @openai/agents zod@3
```

### Environment Requirements
- **Node.js**: 22+ (already supported by TechSapo)
- **TypeScript**: Full compatibility with existing TS configuration
- **Zod**: Required for structured validation

## 🏗️ Integration with Wall-Bounce System

### Enhanced Multi-Agent Workflows

The `@openai/agents` framework can enhance TechSapo's existing wall-bounce analysis by providing:

#### 1. Structured Agent Handoffs
```typescript
import { Agent, run } from '@openai/agents';

// Technical Analysis Agent
const technicalAgent = new Agent({
  name: 'TechnicalAnalyst',
  instructions: 'あなたは技術的問題解決の専門家です。システムログ、エラー分析、インフラ問題の診断を行います。',
  model: 'gpt-5', // GPT-5 only as per project rules
});

// Business Impact Agent
const businessAgent = new Agent({
  name: 'BusinessAnalyst',
  instructions: 'ビジネスへの影響分析とユーザー体験の観点から問題を評価します。',
  model: 'gpt-5',
});

// Integration Agent
const integrationAgent = new Agent({
  name: 'IntegrationSpecialist',
  instructions: 'Wall-Bounce分析結果を統合し、総合的な解決策を提案します。',
  model: 'gpt-5',
});
```

#### 2. Dynamic Workflow Orchestration
```typescript
// Enhanced Wall-Bounce with Agent Framework
export class EnhancedWallBounceAnalyzer {
  private technicalAgent: Agent;
  private businessAgent: Agent;
  private integrationAgent: Agent;

  constructor() {
    this.initializeAgents();
  }

  async executeEnhancedWallBounce(query: string, taskType: TaskType) {
    // Phase 1: Parallel technical and business analysis
    const [technicalResult, businessResult] = await Promise.all([
      run(this.technicalAgent, query),
      run(this.businessAgent, query)
    ]);

    // Phase 2: Integration analysis with handoff context
    const handoffContext = {
      technicalAnalysis: technicalResult.finalOutput,
      businessImpact: businessResult.finalOutput,
      confidence: this.calculateConfidence([technicalResult, businessResult])
    };

    const integratedResult = await run(
      this.integrationAgent,
      `統合分析を実行してください。Context: ${JSON.stringify(handoffContext)}`
    );

    return {
      consensus: integratedResult.finalOutput,
      confidence: handoffContext.confidence,
      tracing: this.extractTracingData([technicalResult, businessResult, integratedResult])
    };
  }
}
```

### 3. Voice Agent Capabilities
```typescript
// Voice-enabled IT support
const voiceITAgent = new Agent({
  name: 'VoiceITSupport',
  instructions: `
    音声対応のIT支援エージェントです。
    - 簡潔で明確な回答を提供
    - 技術用語は日本語で説明
    - ステップバイステップのガイダンス
  `,
  model: 'gpt-5',
  tools: [
    {
      type: 'function',
      function: {
        name: 'executeWallBounceAnalysis',
        description: 'Wall-Bounce分析を実行',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            urgency: { type: 'string', enum: ['low', 'medium', 'high'] }
          }
        }
      }
    }
  ]
});
```

## 🔧 Configuration Integration

### Environment Variables
```bash
# OpenAI Agents Configuration
OPENAI_AGENTS_ENABLED=true
OPENAI_AGENTS_MODEL=gpt-5              # GPT-5 only
OPENAI_AGENTS_MAX_PARALLEL=3           # Max parallel agents
OPENAI_AGENTS_TIMEOUT=30000            # 30 second timeout

# Integration with existing Wall-Bounce
WALL_BOUNCE_USE_AGENTS=true            # Enable agent framework
WALL_BOUNCE_AGENT_HANDOFFS=true        # Enable dynamic handoffs
```

### TypeScript Configuration Updates
```typescript
// src/types/agents.ts
import type { Agent } from '@openai/agents';

export interface EnhancedWallBounceConfig {
  useAgentFramework: boolean;
  maxParallelAgents: number;
  enableVoiceSupport: boolean;
  agentHandoffEnabled: boolean;
}

export interface AgentWallBounceResult {
  consensus: string;
  confidence: number;
  agentTracing: AgentTrace[];
  handoffChain: string[];
  totalExecutionTime: number;
}
```

## 🚀 Integration Examples

### 1. Log Analysis with Agent Handoffs
```typescript
// Enhanced log analysis with specialized agents
export class AgentEnhancedLogAnalyzer {
  async analyzeWithAgents(logData: LogAnalysisRequest) {
    // System Agent - analyzes technical aspects
    const systemAnalysis = await run(this.systemAgent,
      `システムログを分析してください: ${logData.error_output}`
    );

    // Security Agent - checks for security implications
    const securityAnalysis = await run(this.securityAgent,
      `セキュリティ観点での分析: ${logData.error_output}`
    );

    // Performance Agent - evaluates performance impact
    const performanceAnalysis = await run(this.performanceAgent,
      `パフォーマンス影響の評価: ${logData.system_context}`
    );

    // Integration Agent - synthesizes all analyses
    const finalAnalysis = await run(this.integrationAgent, `
      以下の分析結果を統合し、総合的な解決策を提案してください:
      システム分析: ${systemAnalysis.finalOutput}
      セキュリティ分析: ${securityAnalysis.finalOutput}
      パフォーマンス分析: ${performanceAnalysis.finalOutput}
    `);

    return {
      integrated_solution: finalAnalysis.finalOutput,
      detailed_analyses: {
        system: systemAnalysis.finalOutput,
        security: securityAnalysis.finalOutput,
        performance: performanceAnalysis.finalOutput
      },
      confidence: this.calculateMultiAgentConfidence([
        systemAnalysis, securityAnalysis, performanceAnalysis
      ])
    };
  }
}
```

### 2. Streaming Responses with Agents
```typescript
// Real-time streaming analysis with agents
export async function streamingAgentAnalysis(query: string, res: Response) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const agent = new Agent({
    name: 'StreamingAnalyst',
    instructions: 'リアルタイムで分析結果をストリーミングします。',
    model: 'gpt-5'
  });

  // Stream analysis results in real-time
  const result = await run(agent, query, {
    onChunk: (chunk) => {
      res.write(`data: ${JSON.stringify({
        type: 'analysis_chunk',
        content: chunk,
        timestamp: new Date().toISOString()
      })}\n\n`);
    }
  });

  res.write(`data: ${JSON.stringify({
    type: 'analysis_complete',
    result: result.finalOutput,
    timestamp: new Date().toISOString()
  })}\n\n`);

  res.end();
}
```

## 📊 Quality Assurance Integration

### Agent-Based Consensus Building
```typescript
export class AgentConsensusBuilder {
  async buildConsensusWithAgents(query: string, taskType: TaskType) {
    // Create specialized agents for different perspectives
    const agents = [
      this.createTechnicalAgent(),
      this.createBusinessAgent(),
      this.createUserExperienceAgent(),
      this.createSecurityAgent()
    ];

    // Execute parallel analysis
    const results = await Promise.all(
      agents.map(agent => run(agent, query))
    );

    // Quality scoring with agent tracing
    const qualityMetrics = {
      confidence: this.calculateAgentConfidence(results),
      consensus: this.measureAgentConsensus(results),
      coherence: this.evaluateAgentCoherence(results),
      tracing: results.map(r => r.trace)
    };

    // Final integration if quality thresholds are met
    if (qualityMetrics.confidence >= 0.7 && qualityMetrics.consensus >= 0.6) {
      const integrationAgent = this.createIntegrationAgent();
      const finalResult = await run(integrationAgent,
        `以下の分析結果を統合してください: ${JSON.stringify(results.map(r => r.finalOutput))}`
      );

      return {
        consensus: finalResult.finalOutput,
        metrics: qualityMetrics,
        agentCount: agents.length
      };
    }

    // Escalate if quality thresholds not met
    return this.escalateToHigherTierAgents(query, results);
  }
}
```

## 🔍 Debugging & Monitoring

### Built-in Tracing Integration
```typescript
// Agent tracing integration with existing monitoring
export function integrateAgentMonitoring() {
  // Custom metrics for agent performance
  const agentMetrics = {
    'techsapo_agent_execution_time': new prometheus.Histogram({
      name: 'techsapo_agent_execution_time',
      help: 'Agent execution time in milliseconds',
      labelNames: ['agent_name', 'task_type']
    }),

    'techsapo_agent_success_rate': new prometheus.Counter({
      name: 'techsapo_agent_success_rate',
      help: 'Agent execution success rate',
      labelNames: ['agent_name']
    }),

    'techsapo_agent_handoffs': new prometheus.Counter({
      name: 'techsapo_agent_handoffs',
      help: 'Number of agent handoffs performed',
      labelNames: ['from_agent', 'to_agent']
    })
  };

  return agentMetrics;
}
```

## 🚨 Migration Path

### Phase 1: Optional Integration
1. Install `@openai/agents` as optional dependency
2. Create feature flag: `OPENAI_AGENTS_ENABLED=false`
3. Implement parallel agent workflows for testing

### Phase 2: Gradual Rollout
1. Enable for premium and critical tasks only
2. A/B test agent vs traditional wall-bounce
3. Monitor performance and quality metrics

### Phase 3: Full Integration
1. Replace traditional multi-LLM calls with agent workflows
2. Implement voice agent capabilities
3. Enable real-time streaming for all task types

## 🎯 Benefits for TechSapo

### Enhanced Quality
- **Structured Handoffs**: Better context preservation between analysis phases
- **Specialized Agents**: Domain-specific expertise for technical, business, security perspectives
- **Built-in Tracing**: Better debugging and quality assurance

### Improved User Experience
- **Voice Support**: Natural language interaction for IT support
- **Streaming Responses**: Real-time feedback during analysis
- **Dynamic Workflows**: Adaptive analysis based on query complexity

### Better Integration
- **Framework Compatibility**: Seamless integration with existing TypeScript codebase
- **Model Consistency**: Uses same GPT-5 model as per project requirements
- **Cost Control**: Maintains existing budget management and monitoring

## ⚠️ Important Considerations

### Model Restrictions
- **GPT-5 Only**: Must use GPT-5 model as per project rules
- **No API Key for Anthropic**: Maintain SDK-only usage for Anthropic
- **Cost Monitoring**: Integrate agent costs into existing budget tracking

### Performance Impact
- **Memory Usage**: Multiple agent instances may increase memory consumption
- **Network Calls**: Additional API calls for agent handoffs
- **Latency**: Agent workflows may add processing time

### Quality Assurance
- **Consensus Validation**: Ensure agent consensus meets existing quality thresholds
- **Fallback Strategy**: Traditional wall-bounce as fallback if agent framework fails
- **Monitoring Integration**: Full integration with existing Prometheus metrics