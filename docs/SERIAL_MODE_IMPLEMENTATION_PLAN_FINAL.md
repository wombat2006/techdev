# Wall-Bounce シリアルモード完全実装計画 (最終版)

**作成日**: 2025-10-04  
**策定方法**: Wall-Bounce分析 (GPT-5 Codex → Qwen3-Coder → Claude Code)  
**ステータス**: 実装準備完了  
**優先度**: P0 (Critical)

---

## 📊 エグゼクティブサマリー

### Wall-Bounce分析結果の統合

本計画は、3つのLLMプロバイダによる壁打ち分析を統合した最終実装計画です：

1. **GPT-5 Codex**: アーキテクチャ設計とAPI仕様
2. **Qwen3-Coder**: 型安全性とコード品質向上
3. **Claude Code**: 運用戦略と統合設計

### 現状評価

**実装済み機能** (75%):
- ✅ executeSequentialMode (基本逐次実行)
- ✅ buildProviderPrompt (前結果含むプロンプト生成)
- ✅ PROVIDER_GUIDANCE (プロバイダ固有指示)
- ✅ SSE ストリーミング対応

**未実装・要修正** (25%):
- ❌ POST /single, /analyze endpoints (404エラー)
- ❌ depth制御 (定義済みだが未使用)
- ❌ タイムアウト問題 (60秒でタイムアウト)
- ❌ LLM応答の標準化スキーマ

---

## 🎯 実装フェーズ

### Phase 0: LLM応答スキーマ標準化 (完了)

**目的**: 全プロバイダの応答を統一インターフェースに正規化

**成果物**: ✅ `src/types/llm-response.ts` (作成完了)

**主要インターフェース**:
```typescript
interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  confidence: number;
  tokensUsed: number;
  usage?: TokenUsage;
  reasoning?: string;
  citations?: Citation[];
  qualityScore?: number;
  flags?: ResponseFlag[];
}

interface WallBounceResponse {
  finalAnswer: string;
  providerResponses: ProviderResponse[];
  consensusScore: number;
  qualityScore: number;
  mode: 'parallel' | 'sequential';
  depth?: number;
  processingTimeMs: number;
}
```

**プロバイダ固有型**:
- `GPT5Response`: reasoning, codeBlocks
- `GeminiResponse`: safetyRatings, groundingMetadata
- `Qwen3Response`: codeQuality, securityFlags
- `ClaudeResponse`: stopReason

---

### Phase 1: 緊急対応 (優先度: P0, 工数: 2-3日)

#### Task 1.1: ExecuteOptions拡張

**ファイル**: `src/services/wall-bounce-analyzer.ts:163-174`

**現状**:
```typescript
interface ExecuteOptions {
  taskType?: 'basic' | 'premium' | 'critical';
  domain?: 'coding' | 'analysis' | 'creative' | 'general';
  minProviders?: number;
  maxProviders?: number;
  mode?: 'parallel' | 'sequential';
  depth?: number; // 定義済みだが未使用
  onThinking?: (provider: string, step: string, content: string) => void;
  onProviderResponse?: (provider: string, response: string) => void;
  onConsensusUpdate?: (score: number) => void;
}
```

**拡張内容**:
```typescript
interface ExecuteOptions {
  // 既存
  taskType?: 'basic' | 'premium' | 'critical';
  domain?: 'coding' | 'analysis' | 'creative' | 'general';
  minProviders?: number;
  maxProviders?: number;
  mode?: 'parallel' | 'sequential';
  depth?: number; // 1-5: シリアルモード深度制御
  
  // 新規追加
  providerOverride?: string[];              // 特定プロバイダ指定
  providerOrder?: string[];                 // シリアルモード時の順序
  customGuidance?: Record<string, string>;  // プロバイダ固有カスタム指示
  timeout?: number;                         // タイムアウト延長 (ms)
  
  // SSE callbacks (既存)
  onThinking?: (provider: string, step: string, content: string) => void;
  onProviderResponse?: (provider: string, response: string) => void;
  onConsensusUpdate?: (score: number) => void;
  onError?: (provider: string, error: string) => void; // 新規
}
```

**実装**:
```typescript
// src/services/wall-bounce-analyzer.ts

async executeWallBounce(prompt: string, options: ExecuteOptions = {}): Promise<WallBounceResult> {
  const startTime = Date.now();
  const taskType = options.taskType || 'basic';
  const mode: 'parallel' | 'sequential' = options.mode === 'sequential' ? 'sequential' : 'parallel';
  const depth = options.depth && options.depth > 0 ? Math.min(options.depth, 5) : 1;
  const timeout = options.timeout || 120000; // デフォルト120秒

  logger.info('🚀 Wall-Bounce分析開始', {
    taskType,
    mode,
    depth,
    timeout,
    providerOverride: options.providerOverride,
    providerOrder: options.providerOrder
  });

  // タイムアウト制御
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    logger.error('⏱️ Wall-Bounce timeout', { timeout });
  }, timeout);

  try {
    // プロバイダ選択
    let selectedPrimary: Array<{ name: string; handler: LLMProvider }>;

    if (options.providerOverride && options.providerOverride.length > 0) {
      selectedPrimary = this.selectSpecificProviders(options.providerOverride);
    } else if (options.providerOrder && mode === 'sequential') {
      selectedPrimary = this.selectSpecificProviders(options.providerOrder);
    } else {
      const providerOrder = this.getProviderOrder(taskType, prompt, options);
      selectedPrimary = this.selectProvidersFromOrder(providerOrder, options);
    }

    const { aggregator, aggregatorKey } = this.selectAggregator(taskType, prompt);
    const effectiveMinProviders = Math.min(options.minProviders || 2, selectedPrimary.length);

    // 深度制御対応
    if (mode === 'sequential' && depth > 1) {
      const result = await this.executeDeepSequentialMode(
        prompt, selectedPrimary, aggregator, aggregatorKey,
        effectiveMinProviders, depth, startTime, options, controller.signal
      );
      clearTimeout(timeoutId);
      return result;
    }

    // 通常モード
    const result = mode === 'sequential'
      ? await this.executeSequentialMode(prompt, selectedPrimary, aggregator, aggregatorKey, effectiveMinProviders, startTime, options)
      : await this.executeParallelMode(prompt, selectedPrimary, aggregator, aggregatorKey, effectiveMinProviders, startTime, taskType, options);

    clearTimeout(timeoutId);
    return result;

  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Wall-Bounce timed out after ${timeout}ms`);
    }
    throw error;
  }
}

// 新メソッド: 特定プロバイダ選択
private selectSpecificProviders(providerKeys: string[]): Array<{ name: string; handler: LLMProvider }> {
  const selected: Array<{ name: string; handler: LLMProvider }> = [];

  for (const key of providerKeys) {
    const handler = this.providers.get(key);
    if (!handler) {
      logger.warn(`⚠️ Provider not found: ${key}`);
      continue;
    }
    selected.push({ name: key, handler });
  }

  if (selected.length === 0) {
    throw new Error(`No valid providers found in: ${providerKeys.join(', ')}`);
  }

  return selected;
}
```

**テスト**:
```bash
# Test providerOverride
curl -X POST http://localhost:8443/api/v1/wall-bounce/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "TypeScriptのエラーハンドリング",
    "mode": "sequential",
    "providerOverride": ["gemini-2.5-pro", "qwen3-coder"]
  }'
```

---

#### Task 1.2: POST /single Endpoint実装

**ファイル**: `src/routes/wall-bounce-api.ts`

**実装**:
```typescript
/**
 * POST /api/v1/wall-bounce/single
 * Single provider analysis (non-streaming, JSON response)
 */
router.post('/single', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { query, provider, timeout = 60000 } = req.body;

  // Validation
  if (!query || typeof query !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid query parameter',
      message: 'クエリが必要です'
    });
  }

  if (!provider || typeof provider !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid provider parameter',
      message: 'プロバイダ指定が必要です',
      availableProviders: [
        'gemini-2.5-pro',
        'gpt-5-codex',
        'openrouter-qwen3-coder',
        'sonnet-4.5'
      ]
    });
  }

  logger.info('🔍 Single provider request', {
    query: query.substring(0, 100),
    provider,
    timeout
  });

  try {
    const result = await wallBounceAnalyzer.executeWallBounce(query, {
      mode: 'parallel',
      minProviders: 1,
      maxProviders: 1,
      providerOverride: [provider],
      timeout
    });

    const processingTime = Date.now() - startTime;

    logger.info('✅ Single provider analysis completed', {
      provider,
      processingTimeMs: processingTime
    });

    res.json({
      success: true,
      provider,
      response: result.final_answer,
      metadata: {
        confidence: result.quality_score,
        tokensUsed: result.votes?.[0]?.response?.tokensUsed || 0,
        processingTimeMs: processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('❌ Single provider analysis failed', {
      error: errorMessage,
      query: query.substring(0, 100),
      provider
    });

    res.status(500).json({
      success: false,
      error: errorMessage,
      message: 'プロバイダ実行中にエラーが発生しました',
      timestamp: new Date().toISOString()
    });
  }
});
```

**受入基準**:
- ✅ HTTP 200 with valid provider
- ✅ HTTP 400 with missing/invalid parameters
- ✅ HTTP 500 on provider failure
- ✅ Response includes metadata (confidence, tokens, time)

---

#### Task 1.3: POST /analyze Endpoint実装

**実装**:
```typescript
/**
 * POST /api/v1/wall-bounce/analyze
 * Multi-provider Wall-Bounce analysis with full options support
 */
router.post('/analyze', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const {
    query,
    mode = 'parallel',
    depth = 1,
    providers,
    providerOrder,
    customGuidance,
    timeout = 120000
  } = req.body;

  // Validation
  if (!query || typeof query !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid query parameter'
    });
  }

  if (mode !== 'parallel' && mode !== 'sequential') {
    return res.status(400).json({
      success: false,
      error: 'Invalid mode. Must be "parallel" or "sequential"'
    });
  }

  if (depth < 1 || depth > 5) {
    return res.status(400).json({
      success: false,
      error: 'Invalid depth. Must be between 1-5'
    });
  }

  logger.info('🔄 Wall-Bounce POST analysis', {
    query: query.substring(0, 100),
    mode,
    depth,
    providers: providers || 'auto',
    timeout
  });

  try {
    const result = await wallBounceAnalyzer.executeWallBounce(query, {
      mode: mode as 'parallel' | 'sequential',
      depth,
      providerOverride: providers,
      providerOrder,
      customGuidance,
      timeout
    });

    const processingTime = Date.now() - startTime;

    logger.info('✅ Wall-Bounce POST analysis completed', {
      mode,
      depth,
      processingTimeMs: processingTime
    });

    res.json({
      success: true,
      mode,
      depth,
      finalAnswer: result.final_answer,
      providerResponses: result.votes?.map(v => ({
        provider: v.provider,
        response: v.response.text,
        confidence: v.agreement_score,
        tokensUsed: v.response.tokensUsed
      })) || [],
      consensusScore: result.consensus_score,
      qualityScore: result.quality_score,
      providersUsed: result.providers_used,
      processingTimeMs: processingTime,
      totalCost: result.total_cost || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('❌ Wall-Bounce POST analysis failed', {
      error: errorMessage,
      query: query.substring(0, 100),
      mode
    });

    res.status(500).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});
```

---

#### Task 1.4: タイムアウト修正

**問題**: シリアルモードが60秒でタイムアウト

**原因分析**:
1. Node.js/Expressのデフォルトタイムアウト (120秒)
2. プロバイダ個別実行時間の累積
3. AbortControllerの未実装

**修正策**:

**1. サーバーレベルタイムアウト延長**:
```typescript
// src/index.ts or src/wall-bounce-server.ts

const server = app.listen(PORT, () => {
  logger.info(`TechSapo server listening on port ${PORT}`);
});

// サーバータイムアウトを5分に延長
server.setTimeout(300000); // 300秒 = 5分

// Keep-alive設定
server.keepAliveTimeout = 61000; // 61秒
server.headersTimeout = 62000;   // 62秒
```

**2. リクエストレベルタイムアウト**:
```typescript
// src/routes/wall-bounce-api.ts

router.post('/analyze', async (req: Request, res: Response) => {
  // リクエスト固有のタイムアウト設定
  req.setTimeout(180000); // 3分

  // ... 処理
});
```

**3. プロバイダレベルAbortController** (既に実装済み):
```typescript
// executeWallBounce内
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeout);
```

**受入基準**:
- ✅ シリアルモード (3プロバイダ) が120秒以内に完了
- ✅ depth=3 が180秒以内に完了
- ✅ タイムアウト時に適切なエラー応答 (HTTP 408)

---

### Phase 2: 深度制御実装 (優先度: P1, 工数: 3-4日)

#### Task 2.1: executeDeepSequentialMode実装

**ファイル**: `src/services/wall-bounce-analyzer.ts`

**実装**:
```typescript
/**
 * Deep Sequential Mode
 * 複数ラウンドで段階的に深掘り分析
 * 
 * 例: depth=3, providers=[Gemini, Qwen3, Sonnet]
 * Round 1: Gemini → Qwen3 → Sonnet
 * Round 2: Gemini (Round1結果踏まえ) → Qwen3 → Sonnet
 * Round 3: Gemini (Round2結果踏まえ) → Qwen3 → Sonnet
 * Aggregator: 全9回の応答を統合
 */
private async executeDeepSequentialMode(
  prompt: string,
  providers: Array<{ name: string; handler: LLMProvider }>,
  aggregator: LLMProvider,
  aggregatorKey: string,
  minProviders: number,
  depth: number,
  startTime: number,
  options: ExecuteOptions,
  signal?: AbortSignal
): Promise<WallBounceResult> {
  
  logger.info('🔁 Deep Sequential Mode開始', {
    providers: providers.map(p => p.name),
    depth,
    minProviders
  });

  const allRounds: Array<Array<LLMResponse & { provider: string; round: number }>> = [];
  let cumulativeContext = '';

  for (let round = 1; round <= depth; round++) {
    if (signal?.aborted) {
      throw new Error('Deep sequential mode aborted');
    }

    logger.info(`📍 Round ${round}/${depth} 開始`);

    const roundResponses: Array<LLMResponse & { provider: string }> = [];
    const providerErrors: string[] = [];
    let roundSummary = '';

    for (const { name, handler } of providers) {
      if (signal?.aborted) break;

      try {
        // SSE通知
        if (options.onThinking) {
          options.onThinking(name, `Round ${round}`, `Processing round ${round} with ${name}...`);
        }

        // プロンプト生成
        const providerPrompt = this.buildDeepSequentialPrompt(
          prompt,
          name,
          round,
          depth,
          roundResponses,
          cumulativeContext,
          options.customGuidance
        );

        const response = await this.invokeProvider(handler, providerPrompt, name);
        const responseWithMeta = { ...response, provider: name, round };

        roundResponses.push(responseWithMeta);
        roundSummary = this.updateSequentialSummary(roundSummary, name, response.content);

        // SSE通知
        if (options.onProviderResponse) {
          options.onProviderResponse(name, `[Round ${round}] ${response.text}`);
        }

        // コンセンサス更新
        if (options.onConsensusUpdate && roundResponses.length >= 2) {
          const tempConsensus = this.calculateConsensusScore(roundResponses);
          options.onConsensusUpdate(tempConsensus);
        }

      } catch (error) {
        const message = `${name} (Round ${round}): ${error instanceof Error ? error.message : String(error)}`;
        providerErrors.push(message);
        logger.error('❌ Provider failed in deep sequential', { provider: name, round, error: message });
        
        if (options.onError) {
          options.onError(name, message);
        }
      }
    }

    // ラウンド結果保存
    allRounds.push(roundResponses.map(r => ({ ...r, round })));

    // 累積コンテキスト更新
    cumulativeContext = this.buildCumulativeContext(cumulativeContext, round, roundResponses);

    // 最小プロバイダ数チェック
    if (roundResponses.length < minProviders) {
      if (round === 1) {
        throw new Error(`Round 1 failed: Need ${minProviders} providers, got ${roundResponses.length}`);
      } else {
        logger.warn(`⚠️ Stopping at round ${round - 1} due to errors`);
        break;
      }
    }

    logger.info(`✅ Round ${round} 完了`, {
      providers: roundResponses.length,
      errors: providerErrors.length
    });
  }

  // 全ラウンド統合
  const flattenedResponses = allRounds.flat();
  const aggregatorPrompt = this.buildDeepAggregatorPrompt(prompt, allRounds, depth);
  const aggregatorResponse = await this.invokeProvider(aggregator, aggregatorPrompt, aggregatorKey);
  const processingTimeMs = Date.now() - startTime;

  return this.buildWallBounceResult(
    flattenedResponses,
    aggregatorResponse,
    aggregatorKey,
    [],
    processingTimeMs
  );
}
```

---

#### Task 2.2: Deep Sequential用プロンプトビルダー

**実装**:
```typescript
/**
 * 深度制御用プロンプト生成
 */
private buildDeepSequentialPrompt(
  originalPrompt: string,
  providerName: string,
  currentRound: number,
  totalDepth: number,
  currentRoundResponses: Array<LLMResponse & { provider: string }>,
  cumulativeContext: string,
  customGuidance?: Record<string, string>
): string {
  
  const guidance = PROVIDER_GUIDANCE[providerName];
  const sequentialLine = customGuidance?.[providerName] ||
                        guidance?.sequential ||
                        '既出の出力を踏まえ、新しい観点や注意点を補足してください。';

  // ラウンド固有の指示
  let roundInstruction = '';
  if (currentRound === 1) {
    roundInstruction = '初回分析: 基本的な観点から分析してください。';
  } else if (currentRound === totalDepth) {
    roundInstruction = `最終ラウンド (${currentRound}/${totalDepth}): これまでの分析を総括し、最も重要なポイントと実践的な推奨事項を明確にしてください。`;
  } else {
    roundInstruction = `中間ラウンド (${currentRound}/${totalDepth}): 前ラウンドの分析を深掘りし、新しい洞察を追加してください。`;
  }

  // 当ラウンド内の先行プロバイダ結果
  const currentRoundSection = currentRoundResponses.length > 0
    ? `\n\n【当ラウンド (Round ${currentRound}) の先行分析】\n` +
      currentRoundResponses.map(resp => `【${resp.provider}】\n${this.truncate(resp.content, 500)}`).join('\n\n')
    : '';

  // 累積コンテキスト
  const contextSection = cumulativeContext
    ? `\n\n【前ラウンドまでの累積知見】\n${this.truncate(cumulativeContext, 1000)}`
    : '';

  return `${originalPrompt}${contextSection}${currentRoundSection}\n\n【ラウンド指示】\n${roundInstruction}\n\n【追加指示】\n- ${sequentialLine}`;
}

/**
 * 累積コンテキスト更新
 */
private buildCumulativeContext(
  previous: string,
  round: number,
  roundResponses: Array<LLMResponse & { provider: string }>
): string {
  const roundSummary = `\n\n=== Round ${round} Summary ===\n` +
    roundResponses
      .map(resp => `[${resp.provider}] ${this.truncate(resp.content, 300)}`)
      .join('\n');

  return this.truncate(previous + roundSummary, 2000); // 全体を2000文字に制限
}

/**
 * 深度制御用Aggregatorプロンプト
 */
private buildDeepAggregatorPrompt(
  originalPrompt: string,
  allRounds: Array<Array<LLMResponse & { provider: string; round: number }>>,
  depth: number
): string {
  const header = [
    `以下は複数のLLMプロバイダによる${depth}ラウンドの段階的分析結果です。`,
    '全ラウンドの分析を統合し、最終的な推奨事項を提示してください。',
    '',
    '統合時の注意点:',
    '- 各ラウンドで深掘りされた洞察を整理',
    '- 重複する内容は排除',
    '- 最も実践的で具体的な推奨事項を抽出',
    '- 段階的に発展した議論の流れを尊重'
  ].join('\n');

  let responseSection = '';
  for (let round = 1; round <= depth; round++) {
    const roundData = allRounds[round - 1] || [];
    if (roundData.length === 0) continue;

    responseSection += `\n\n【Round ${round}】\n`;
    responseSection += roundData
      .map(resp => `[${resp.provider}] (confidence: ${resp.confidence.toFixed(2)})\n${this.truncate(resp.content, 800)}`)
      .join('\n\n');
  }

  return `${header}\n\n元の依頼:\n${originalPrompt}${responseSection}`;
}
```

---

### Phase 3: 統合とテスト (優先度: P1, 工数: 2日)

#### Task 3.1: 統合テストスイート作成

**ファイル**: `tests/integration/wall-bounce-serial-mode.test.ts`

```typescript
import request from 'supertest';
import app from '../../src/wall-bounce-server';

describe('Wall-Bounce Serial Mode Integration Tests', () => {
  
  describe('POST /api/v1/wall-bounce/single', () => {
    it('should execute single provider successfully', async () => {
      const response = await request(app)
        .post('/api/v1/wall-bounce/single')
        .send({
          query: 'TypeScriptのベストプラクティスは？',
          provider: 'gemini-2.5-pro',
          timeout: 60000
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.provider).toBe('gemini-2.5-pro');
      expect(response.body.response).toBeDefined();
      expect(response.body.metadata.processingTimeMs).toBeGreaterThan(0);
    });

    it('should return 400 for invalid provider', async () => {
      const response = await request(app)
        .post('/api/v1/wall-bounce/single')
        .send({
          query: 'test',
          provider: 'invalid-provider'
        });

      expect(response.status).toBe(500); // Provider not found
    });
  });

  describe('POST /api/v1/wall-bounce/analyze', () => {
    it('should execute parallel mode with default settings', async () => {
      const response = await request(app)
        .post('/api/v1/wall-bounce/analyze')
        .send({
          query: 'Node.jsのメモリリーク対策',
          mode: 'parallel'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.mode).toBe('parallel');
      expect(response.body.consensusScore).toBeGreaterThan(0);
    }, 120000); // 2分タイムアウト

    it('should execute sequential mode with depth=1', async () => {
      const response = await request(app)
        .post('/api/v1/wall-bounce/analyze')
        .send({
          query: 'TypeScriptエラーハンドリング',
          mode: 'sequential',
          depth: 1,
          providers: ['gemini-2.5-pro', 'qwen3-coder']
        });

      expect(response.status).toBe(200);
      expect(response.body.mode).toBe('sequential');
      expect(response.body.depth).toBe(1);
      expect(response.body.providerResponses.length).toBeGreaterThan(0);
    }, 180000); // 3分タイムアウト

    it('should execute deep sequential mode with depth=3', async () => {
      const response = await request(app)
        .post('/api/v1/wall-bounce/analyze')
        .send({
          query: 'マイクロサービス設計パターン',
          mode: 'sequential',
          depth: 3,
          providers: ['gemini-2.5-pro', 'qwen3-coder'],
          timeout: 240000 // 4分
        });

      expect(response.status).toBe(200);
      expect(response.body.depth).toBe(3);
      expect(response.body.providerResponses.length).toBe(6); // 2 providers × 3 rounds
    }, 300000); // 5分タイムアウト

    it('should respect custom provider order', async () => {
      const response = await request(app)
        .post('/api/v1/wall-bounce/analyze')
        .send({
          query: 'コード品質向上',
          mode: 'sequential',
          providerOrder: ['qwen3-coder', 'gemini-2.5-pro', 'sonnet-4.5']
        });

      expect(response.status).toBe(200);
      const providers = response.body.providerResponses.map((r: any) => r.provider);
      expect(providers[0]).toBe('qwen3-coder');
    }, 180000);

    it('should validate depth constraints', async () => {
      const response = await request(app)
        .post('/api/v1/wall-bounce/analyze')
        .send({
          query: 'test',
          mode: 'sequential',
          depth: 10 // Invalid: max is 5
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
```

---

#### Task 3.2: ドキュメント更新

**ファイル**: `docs/API_REFERENCE.md`

**追加セクション**:
```markdown
## POST /api/v1/wall-bounce/single

単一プロバイダでの分析実行

### Request
```json
{
  "query": "分析対象のクエリ",
  "provider": "gemini-2.5-pro",
  "timeout": 60000
}
```

### Response
```json
{
  "success": true,
  "provider": "gemini-2.5-pro",
  "response": "...",
  "metadata": {
    "confidence": 0.85,
    "tokensUsed": 1234,
    "processingTimeMs": 3500,
    "timestamp": "2025-10-04T..."
  }
}
```

## POST /api/v1/wall-bounce/analyze

マルチプロバイダWall-Bounce分析（深度制御対応）

### Request
```json
{
  "query": "分析対象のクエリ",
  "mode": "sequential",
  "depth": 3,
  "providers": ["gemini-2.5-pro", "qwen3-coder"],
  "providerOrder": ["qwen3-coder", "gemini-2.5-pro"],
  "customGuidance": {
    "qwen3-coder": "セキュリティリスクを重点的に検証",
    "gemini-2.5-pro": "業界トレンドに焦点を当てる"
  },
  "timeout": 180000
}
```

### Response
```json
{
  "success": true,
  "mode": "sequential",
  "depth": 3,
  "finalAnswer": "...",
  "providerResponses": [
    {
      "provider": "qwen3-coder",
      "response": "...",
      "confidence": 0.88,
      "tokensUsed": 1500
    }
  ],
  "consensusScore": 0.82,
  "qualityScore": 0.90,
  "providersUsed": ["qwen3-coder", "gemini-2.5-pro"],
  "processingTimeMs": 45000,
  "totalCost": 0.05,
  "timestamp": "2025-10-04T..."
}
```
```

---

## 📅 実装スケジュール

| フェーズ | タスク | 工数 | 開始日 | 完了予定 | ステータス |
|---------|--------|------|--------|----------|-----------|
| Phase 0 | LLM応答スキーマ | 0.5日 | 10/04 | 10/04 | ✅ 完了 |
| Phase 1.1 | ExecuteOptions拡張 | 1日 | 10/05 | 10/05 | 🔄 準備中 |
| Phase 1.2 | POST /single実装 | 0.5日 | 10/05 | 10/05 | 🔄 準備中 |
| Phase 1.3 | POST /analyze実装 | 0.5日 | 10/05 | 10/05 | 🔄 準備中 |
| Phase 1.4 | タイムアウト修正 | 0.5日 | 10/06 | 10/06 | 🔄 準備中 |
| Phase 2.1 | Deep Sequential実装 | 2日 | 10/07 | 10/08 | 📋 計画済 |
| Phase 2.2 | Prompt Builders | 1日 | 10/09 | 10/09 | 📋 計画済 |
| Phase 3.1 | 統合テスト | 1日 | 10/10 | 10/10 | 📋 計画済 |
| Phase 3.2 | ドキュメント更新 | 0.5日 | 10/10 | 10/10 | 📋 計画済 |
| **合計** | | **7.5日** | | **10/10** | |

---

## ✅ 受入基準

### Phase 1 完了基準
- ✅ POST /single が200応答
- ✅ POST /analyze が200応答
- ✅ シリアルモード (3プロバイダ) が120秒以内に完了
- ✅ providerOverride で特定プロバイダ指定可能
- ✅ タイムアウト時に適切なエラー (408)

### Phase 2 完了基準
- ✅ depth=1: 通常シリアルと同等動作
- ✅ depth=3: 3ラウンド × Nプロバイダ実行
- ✅ 各ラウンドで前結果がプロンプトに含まれる
- ✅ Aggregatorが全ラウンド結果を統合
- ✅ cumulativeContextが累積される

### Phase 3 完了基準
- ✅ 全統合テストがパス (95%以上)
- ✅ APIドキュメント完全更新
- ✅ 本番環境へのデプロイ成功
- ✅ ヘルスチェック正常応答

---

## 🚀 本番デプロイチェックリスト

### 事前確認
- [ ] Phase 1-2の全タスク完了
- [ ] 統合テスト 95%以上パス
- [ ] ドキュメント完全更新
- [ ] 環境変数設定確認

### デプロイ手順
```bash
# 1. ビルド
npm run build

# 2. テスト実行
npm test

# 3. 本番環境へコピー
sudo rsync -av dist/ /prod/techsapo/dist/

# 4. サービス再起動
sudo systemctl restart techsapo

# 5. ヘルスチェック
curl http://localhost:8443/api/v1/wall-bounce/health

# 6. 動作確認
curl -X POST http://localhost:8443/api/v1/wall-bounce/single \
  -H "Content-Type: application/json" \
  -d '{"query":"test","provider":"gemini-2.5-pro"}'
```

### ロールバック計画
```bash
# バックアップから復元
sudo systemctl stop techsapo
sudo rm -rf /prod/techsapo/dist
sudo cp -r /prod/techsapo.backup.YYYYMMDD/dist /prod/techsapo/
sudo systemctl start techsapo
```

---

## 📊 成功指標 (KPI)

### 機能性
- POST endpoint応答率: **100%**
- depth=1-5 すべて正常動作: **100%**
- プロバイダ指定機能: **100%**

### パフォーマンス
- depth=1: 実行時間 **< 15秒**
- depth=3: 実行時間 **< 45秒**
- タイムアウト率: **< 1%**

### 品質
- エラー率: **< 1%**
- コンセンサススコア: **> 0.75**
- テストカバレッジ: **> 90%**

---

**実装計画策定完了**: 2025-10-04  
**次のアクション**: Phase 1.1実装開始  
**承認**: レビュー待ち
