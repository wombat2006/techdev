# Wall-Bounce シリアルモード完全実装計画

**作成日**: 2025-10-04
**ステータス**: 計画策定完了
**優先度**: P1 (Critical)

---

## 1. エグゼクティブサマリー

### 現状分析

**実装済み機能** (9/10):
- ✅ シリアルモードのコアロジック (`executeSequentialMode()`)
- ✅ プロンプト蓄積メカニズム (`buildProviderPrompt()`, `updateSequentialSummary()`)
- ✅ プロバイダ固有ガイダンス設定
- ✅ SSEストリーミング対応 (GET endpoint)
- ✅ エラーハンドリング

**未実装機能**:
- ❌ POST endpoint (`/api/v1/wall-bounce/single`, `/api/v1/wall-bounce/analyze`)
- ❌ 深度制御 (`options.depth` パラメータ未使用)
- ❌ プロバイダ順序指定機能
- ❌ 中間結果の永続化 (Redisキャッシュ)

### 実装目標

1. **APIエンドポイント完全化** - POST対応、互換性向上
2. **深度制御実装** - 同一プロバイダセットで複数ラウンド実行
3. **柔軟性向上** - ユーザ指定のプロバイダ順序、カスタムガイダンス
4. **パフォーマンス最適化** - 中間結果キャッシュ、トークン削減
5. **監視・診断機能** - 詳細ログ、デバッグモード

---

## 2. 実装フェーズ

### Phase 1: 緊急対応（優先度: P1）
**期間**: 1-2日
**目標**: APIエンドポイント404エラー解消

#### Task 1.1: POST Endpoint実装
**ファイル**: `src/routes/wall-bounce-api.ts`

**実装内容**:
```typescript
/**
 * POST /api/v1/wall-bounce/single
 * 単一プロバイダでの分析 (非SSE)
 */
router.post('/single', async (req: Request, res: Response) => {
  const { query, provider } = req.body;

  // Validation
  if (!query || typeof query !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid query parameter'
    });
  }

  if (!provider || typeof provider !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid provider parameter'
    });
  }

  try {
    logger.info('🔍 Single provider request', { query, provider });

    const result = await wallBounceAnalyzer.executeWallBounce(query, {
      taskType: 'basic',
      mode: 'parallel', // 単一プロバイダなのでモード無関係
      minProviders: 1,
      maxProviders: 1,
      providerOverride: [provider] // 特定プロバイダを指定
    });

    res.json({
      success: true,
      provider,
      response: result.final_answer,
      tokens: {
        input: result.votes[0]?.response.tokensUsed || 0,
        output: result.votes[0]?.response.tokensUsed || 0
      },
      processingTimeMs: result.processing_time_ms
    });
  } catch (error) {
    logger.error('❌ Single provider failed', { error, query, provider });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/wall-bounce/analyze
 * マルチプロバイダ分析 (非SSE、JSON応答)
 */
router.post('/analyze', async (req: Request, res: Response) => {
  const { query, mode = 'parallel', providers, depth = 1 } = req.body;

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
      error: 'Invalid mode parameter. Must be "parallel" or "sequential"'
    });
  }

  try {
    logger.info('🔄 Wall-Bounce POST analysis', { query, mode, providers, depth });

    const result = await wallBounceAnalyzer.executeWallBounce(query, {
      taskType: 'basic',
      mode: mode as 'parallel' | 'sequential',
      depth: typeof depth === 'number' ? depth : 1,
      providerOverride: Array.isArray(providers) ? providers : undefined
    });

    res.json({
      success: true,
      mode,
      depth,
      final_answer: result.final_answer,
      votes: result.votes.map(v => ({
        provider: v.provider,
        response: v.response.text,
        confidence: v.agreement_score,
        tokensUsed: v.response.tokensUsed
      })),
      consensus_score: result.consensus_score,
      processing_time_ms: result.processing_time_ms,
      total_cost: result.total_cost
    });
  } catch (error) {
    logger.error('❌ Wall-Bounce POST analysis failed', { error, query, mode });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

**テスト**:
```bash
# Test 1: Single provider
curl -X POST http://localhost:8443/api/v1/wall-bounce/single \
  -H "Content-Type: application/json" \
  -d '{"query":"2+2は何ですか?","provider":"gemini-2.5-pro"}'

# Test 2: Parallel analysis
curl -X POST http://localhost:8443/api/v1/wall-bounce/analyze \
  -H "Content-Type: application/json" \
  -d '{"query":"TypeScriptのエラーハンドリング","mode":"parallel"}'

# Test 3: Sequential analysis
curl -X POST http://localhost:8443/api/v1/wall-bounce/analyze \
  -H "Content-Type: application/json" \
  -d '{"query":"Node.jsのメモリリーク対策","mode":"sequential","depth":1}'
```

**受入基準**:
- ✅ POST /single が HTTP 200 を返す
- ✅ POST /analyze (parallel) が HTTP 200 を返す
- ✅ POST /analyze (sequential) が HTTP 200 を返す
- ✅ エラー時に適切な HTTP 4xx/5xx を返す

---

#### Task 1.2: ExecuteOptions拡張
**ファイル**: `src/services/wall-bounce-analyzer.ts`

**実装内容**:
```typescript
interface ExecuteOptions {
  taskType?: 'basic' | 'premium' | 'critical';
  domain?: 'coding' | 'analysis' | 'creative' | 'general';
  minProviders?: number;
  maxProviders?: number;
  mode?: 'parallel' | 'sequential';
  depth?: number; // 1-5: シリアルモード時のwall-bounce深度
  providerOverride?: string[]; // ユーザ指定のプロバイダリスト
  providerOrder?: string[]; // シリアルモード時のプロバイダ順序
  customGuidance?: Record<string, string>; // プロバイダ固有のカスタム指示

  // SSE streaming callbacks
  onThinking?: (provider: string, step: string, content: string) => void;
  onProviderResponse?: (provider: string, response: string) => void;
  onConsensusUpdate?: (score: number) => void;
  onComplete?: (result: WallBounceResult) => void;
}
```

**実装詳細**:
```typescript
// executeWallBounce() メソッドを拡張
async executeWallBounce(prompt: string, options: ExecuteOptions = {}): Promise<WallBounceResult> {
  const startTime = Date.now();
  const taskType = options.taskType || 'basic';
  const mode: 'parallel' | 'sequential' = options.mode === 'sequential' ? 'sequential' : 'parallel';
  const depth = options.depth && options.depth > 0 ? Math.min(options.depth, 5) : 1;

  logger.info('🚀 Wall-Bounce分析開始', {
    taskType,
    mode,
    depth,
    providerOverride: options.providerOverride,
    providerOrder: options.providerOrder
  });

  // プロバイダ選択ロジック
  let selectedPrimary: Array<{ name: string; handler: LLMProvider }>;

  if (options.providerOverride && options.providerOverride.length > 0) {
    // ユーザ指定のプロバイダを使用
    selectedPrimary = this.selectSpecificProviders(options.providerOverride);
  } else if (options.providerOrder && options.providerOrder.length > 0 && mode === 'sequential') {
    // シリアルモード時にユーザ指定の順序を使用
    selectedPrimary = this.selectSpecificProviders(options.providerOrder);
  } else {
    // デフォルト: tier-basedで自動選択
    selectedPrimary = this.selectProviders(taskType, options.domain, options.minProviders, options.maxProviders);
  }

  // Aggregator選択
  const { aggregator, aggregatorKey } = this.selectAggregator(taskType, prompt);

  // 最小プロバイダ数チェック
  const effectiveMinProviders = options.minProviders || this.getMinProviderCount(taskType);
  if (selectedPrimary.length < effectiveMinProviders) {
    throw new Error(`Insufficient providers available. Required: ${effectiveMinProviders}, Available: ${selectedPrimary.length}`);
  }

  // 深度制御（シリアルモードのみ）
  if (mode === 'sequential' && depth > 1) {
    return await this.executeDeepSequentialMode(
      prompt, selectedPrimary, aggregator, aggregatorKey,
      effectiveMinProviders, depth, startTime, options
    );
  }

  // 通常モード実行
  if (mode === 'sequential') {
    return await this.executeSequentialMode(
      prompt, selectedPrimary, aggregator, aggregatorKey,
      effectiveMinProviders, startTime, options
    );
  }

  return await this.executeParallelMode(
    prompt, selectedPrimary, aggregator, aggregatorKey,
    effectiveMinProviders, startTime, taskType, options
  );
}

// 新メソッド: 特定プロバイダ選択
private selectSpecificProviders(providerKeys: string[]): Array<{ name: string; handler: LLMProvider }> {
  const selected: Array<{ name: string; handler: LLMProvider }> = [];

  for (const key of providerKeys) {
    const handler = this.providers[key];
    if (!handler) {
      logger.warn(`⚠️ Provider not found: ${key}`);
      continue;
    }
    selected.push({ name: key, handler });
  }

  if (selected.length === 0) {
    throw new Error(`No valid providers found in: ${providerKeys.join(', ')}`);
  }

  logger.info('✅ Selected specific providers', {
    requested: providerKeys,
    selected: selected.map(p => p.name)
  });

  return selected;
}
```

**受入基準**:
- ✅ `providerOverride` で特定プロバイダを指定可能
- ✅ `providerOrder` でシリアルモードの順序を指定可能
- ✅ 無効なプロバイダは警告ログを出力してスキップ

---

### Phase 2: 深度制御実装（優先度: P1）
**期間**: 2-3日
**目標**: 複数ラウンドのシリアル壁打ち実装

#### Task 2.1: executeDeepSequentialMode() 実装
**ファイル**: `src/services/wall-bounce-analyzer.ts`

**実装内容**:
```typescript
/**
 * 深度制御シリアルモード
 * 同じプロバイダセットで複数ラウンド実行し、徐々に深掘り
 *
 * 例: depth=3, providers=[Gemini, Qwen3, Sonnet]
 * Round 1: Gemini → Qwen3 → Sonnet
 * Round 2: Gemini (Round1結果を踏まえ) → Qwen3 → Sonnet
 * Round 3: Gemini (Round2結果を踏まえ) → Qwen3 → Sonnet
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
  options: ExecuteOptions
): Promise<WallBounceResult> {
  logger.info('🔁 Deep Sequential Mode 開始', {
    providers: providers.map(p => p.name),
    depth
  });

  const allRounds: Array<Array<LLMResponse & { provider: string; round: number }>> = [];
  let cumulativeContext = '';

  for (let round = 1; round <= depth; round++) {
    logger.info(`📍 Round ${round}/${depth} 開始`);

    const roundResponses: Array<LLMResponse & { provider: string }> = [];
    const providerErrors: string[] = [];
    let roundSummary = '';

    for (const { name, handler } of providers) {
      try {
        // SSE通知
        if (options.onThinking) {
          options.onThinking(name, `Round ${round}`, `Processing round ${round} with ${name}...`);
        }

        // プロンプト生成（ラウンド情報を含む）
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
        logger.error('❌ Provider failed in deep sequential mode', { provider: name, round, error: message });
      }
    }

    // ラウンド結果を保存
    allRounds.push(roundResponses.map(r => ({ ...r, round })));

    // 累積コンテキスト更新
    cumulativeContext = this.buildCumulativeContext(cumulativeContext, round, roundResponses);

    // 最小プロバイダ数チェック
    if (roundResponses.length < minProviders) {
      logger.error(`❌ Round ${round} failed: insufficient providers`, {
        required: minProviders,
        actual: roundResponses.length,
        errors: providerErrors
      });

      if (round === 1) {
        // 1ラウンド目で失敗 → エラー
        throw new Error(`Wall-bounce failed in round 1: Need at least ${minProviders} providers, got ${roundResponses.length}.`);
      } else {
        // 2ラウンド目以降で失敗 → 前ラウンドまでの結果で継続
        logger.warn(`⚠️ Stopping at round ${round - 1} due to errors`);
        break;
      }
    }

    logger.info(`✅ Round ${round} 完了`, {
      providers: roundResponses.length,
      errors: providerErrors.length
    });
  }

  // 全ラウンドの結果を統合してAggregatorへ
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

  // 累積コンテキスト（前ラウンドまでの要約）
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

  return previous + roundSummary;
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
    '以下は複数のLLMプロバイダによる段階的分析結果です。',
    `全${depth}ラウンドの分析を統合し、最終的な推奨事項を提示してください。`,
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

**受入基準**:
- ✅ `depth=1` で通常のシリアルモードと同じ動作
- ✅ `depth=3` で3ラウンド実行される
- ✅ 各ラウンドで前ラウンドの結果が次のプロンプトに含まれる
- ✅ Aggregatorが全ラウンドの結果を統合

---

#### Task 2.2: テストケース作成
**ファイル**: `/audit/techdev/scripts/test-wall-bounce-depth.sh`

**実装内容**:
```bash
#!/bin/bash
# Wall-Bounce深度制御テスト

echo "=== Wall-Bounce Depth Control Test ==="

# Test 1: depth=1 (通常シリアルモード)
echo "Test 1: depth=1 (baseline)"
curl -X POST http://localhost:8443/api/v1/wall-bounce/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "TypeScriptでのエラーハンドリングのベストプラクティスを教えて",
    "mode": "sequential",
    "depth": 1
  }' | jq '.votes | length'

# Expected: 3 votes (Gemini, Qwen3, Sonnet)

# Test 2: depth=2
echo "Test 2: depth=2 (2 rounds)"
curl -X POST http://localhost:8443/api/v1/wall-bounce/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Node.jsのメモリリーク対策",
    "mode": "sequential",
    "depth": 2,
    "providers": ["gemini-2.5-pro", "qwen3-coder"]
  }' | jq '.votes | length'

# Expected: 4 votes (2 providers × 2 rounds)

# Test 3: depth=3
echo "Test 3: depth=3 (3 rounds)"
curl -X POST http://localhost:8443/api/v1/wall-bounce/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "マイクロサービスアーキテクチャの設計パターン",
    "mode": "sequential",
    "depth": 3,
    "providers": ["gemini-2.5-pro", "qwen3-coder", "sonnet-4.5"]
  }' | jq '{
    total_votes: .votes | length,
    rounds: [.votes | group_by(.round)[] | length],
    processing_time: .processing_time_ms
  }'

# Expected: 9 votes (3 providers × 3 rounds)
```

---

### Phase 3: 柔軟性向上（優先度: P2）
**期間**: 2-3日
**目標**: カスタムガイダンス、プロバイダ順序指定

#### Task 3.1: カスタムガイダンス実装

**API拡張**:
```typescript
// POST /api/v1/wall-bounce/analyze
{
  "query": "...",
  "mode": "sequential",
  "customGuidance": {
    "gemini-2.5-pro": "業界トレンドと市場動向に焦点を当てて分析してください",
    "qwen3-coder": "実装時のセキュリティリスクを重点的に検証してください",
    "sonnet-4.5": "長期的な保守性とスケーラビリティを評価してください"
  }
}
```

**実装** (既にExecuteOptionsに定義済み):
```typescript
// buildDeepSequentialPrompt() 内で使用
const sequentialLine = customGuidance?.[providerName] ||
                      guidance?.sequential ||
                      '既出の出力を踏まえ、新しい観点や注意点を補足してください。';
```

---

#### Task 3.2: プロバイダ順序指定

**API拡張**:
```typescript
// POST /api/v1/wall-bounce/analyze
{
  "query": "...",
  "mode": "sequential",
  "providerOrder": ["qwen3-coder", "gemini-2.5-pro", "sonnet-4.5"]
  // コーディングタスク: まずQwen3で実装案、次にGeminiで背景分析、最後にSonnetで統合
}
```

**実装** (既にTask 1.2で実装):
```typescript
if (options.providerOrder && options.providerOrder.length > 0 && mode === 'sequential') {
  selectedPrimary = this.selectSpecificProviders(options.providerOrder);
}
```

---

### Phase 4: パフォーマンス最適化（優先度: P2）
**期間**: 2-3日
**目標**: トークン削減、キャッシング

#### Task 4.1: 中間結果キャッシュ (Redis)

**実装内容**:
```typescript
// src/services/wall-bounce-analyzer.ts

import Redis from 'ioredis';

class WallBounceAnalyzer {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port
    });
  }

  /**
   * 中間結果をRedisにキャッシュ
   */
  private async cacheIntermediateResult(
    sessionId: string,
    round: number,
    provider: string,
    response: LLMResponse
  ): Promise<void> {
    const key = `wallbounce:${sessionId}:round:${round}:${provider}`;
    const ttl = 3600; // 1時間

    await this.redis.setex(
      key,
      ttl,
      JSON.stringify({
        provider,
        round,
        response: {
          content: response.content,
          confidence: response.confidence,
          tokensUsed: response.tokensUsed
        },
        timestamp: new Date().toISOString()
      })
    );

    logger.info('💾 Cached intermediate result', { sessionId, round, provider });
  }

  /**
   * キャッシュから中間結果を取得
   */
  private async getCachedIntermediateResult(
    sessionId: string,
    round: number,
    provider: string
  ): Promise<LLMResponse | null> {
    const key = `wallbounce:${sessionId}:round:${round}:${provider}`;
    const cached = await this.redis.get(key);

    if (!cached) return null;

    try {
      const data = JSON.parse(cached);
      logger.info('✅ Retrieved cached result', { sessionId, round, provider });
      return data.response;
    } catch (error) {
      logger.error('❌ Failed to parse cached result', { error });
      return null;
    }
  }
}
```

**使用例** (executeDeepSequentialMode内):
```typescript
// キャッシュチェック
const cached = await this.getCachedIntermediateResult(sessionId, round, name);
if (cached) {
  logger.info('📦 Using cached result', { provider: name, round });
  roundResponses.push({ ...cached, provider: name, round });
  continue;
}

// 実行 + キャッシュ保存
const response = await this.invokeProvider(handler, providerPrompt, name);
await this.cacheIntermediateResult(sessionId, round, name, response);
```

**受入基準**:
- ✅ 同一セッションIDで再実行時にキャッシュヒット
- ✅ TTL 1時間で自動削除
- ✅ キャッシュミス時は通常通り実行

---

#### Task 4.2: トークン削減（プロンプト最適化）

**現状の問題**:
```
Round 3のプロンプト:
- 元クエリ: 100 tokens
- Round 1結果 (3プロバイダ): 600 tokens × 3 = 1800 tokens
- Round 2結果 (3プロバイダ): 600 tokens × 3 = 1800 tokens
- 累積サマリー: 800 tokens
---
Total: 4500 tokens (巨大)
```

**最適化案**:
```typescript
// より積極的な要約
private buildCumulativeContext(
  previous: string,
  round: number,
  roundResponses: Array<LLMResponse & { provider: string }>
): string {
  // 各プロバイダの結果を200文字に圧縮（現在: 300文字）
  const roundSummary = `\n\n=== Round ${round} Key Points ===\n` +
    roundResponses
      .map(resp => {
        // 重要なキーワード・数値・結論のみ抽出
        const keyPoints = this.extractKeyPoints(resp.content);
        return `[${resp.provider}] ${keyPoints}`;
      })
      .join('\n');

  // 全体の累積サマリーも500文字に制限（現在: 無制限）
  const truncatedPrevious = this.truncate(previous, 500);
  return truncatedPrevious + roundSummary;
}

/**
 * キーポイント抽出（簡易実装）
 */
private extractKeyPoints(content: string): string {
  // 箇条書きの項目のみ抽出
  const lines = content.split('\n');
  const bulletPoints = lines.filter(line => line.trim().match(/^[-*•]/));

  if (bulletPoints.length > 0) {
    return bulletPoints.slice(0, 5).join(' '); // 最大5項目
  }

  // 箇条書きがない場合は先頭200文字
  return this.truncate(content, 200);
}
```

**期待効果**:
- Round 3のプロンプト: 4500 tokens → **1500 tokens** (67% 削減)

---

### Phase 5: 監視・診断（優先度: P3）
**期間**: 1-2日
**目標**: デバッグモード、詳細ログ

#### Task 5.1: デバッグモード

**API拡張**:
```typescript
// POST /api/v1/wall-bounce/analyze
{
  "query": "...",
  "mode": "sequential",
  "debug": true  // デバッグモード有効化
}
```

**実装**:
```typescript
router.post('/analyze', async (req: Request, res: Response) => {
  const { query, mode, debug = false } = req.body;

  const result = await wallBounceAnalyzer.executeWallBounce(query, {
    mode,
    debug
  });

  res.json({
    success: true,
    ...result,
    ...(debug && {
      debug_info: {
        provider_selection: result.debug?.providerSelection,
        prompt_sizes: result.debug?.promptSizes,
        execution_timeline: result.debug?.timeline
      }
    })
  });
});
```

**デバッグ情報**:
```json
{
  "debug_info": {
    "provider_selection": {
      "requested_providers": 3,
      "selected_providers": ["gemini-2.5-pro", "qwen3-coder", "sonnet-4.5"],
      "selection_reason": "tier-based auto-selection"
    },
    "prompt_sizes": [
      {"provider": "gemini-2.5-pro", "round": 1, "tokens": 120},
      {"provider": "qwen3-coder", "round": 1, "tokens": 720},
      {"provider": "sonnet-4.5", "round": 1, "tokens": 1320}
    ],
    "execution_timeline": [
      {"provider": "gemini-2.5-pro", "start": "2025-10-04T12:00:00Z", "end": "2025-10-04T12:00:03Z", "duration_ms": 3000},
      {"provider": "qwen3-coder", "start": "2025-10-04T12:00:03Z", "end": "2025-10-04T12:00:08Z", "duration_ms": 5000}
    ]
  }
}
```

---

#### Task 5.2: 監査ログ統合

**実装**:
```typescript
// executeDeepSequentialMode() 内
import { AuditLogger } from './audit-logger';

// ラウンド開始時
await AuditLogger.logAction('wallbounce_round_start', {
  sessionId,
  round,
  providers: providers.map(p => p.name),
  mode: 'sequential',
  depth
});

// ラウンド完了時
await AuditLogger.logAction('wallbounce_round_complete', {
  sessionId,
  round,
  successfulProviders: roundResponses.length,
  errors: providerErrors.length,
  processingTimeMs: Date.now() - roundStartTime
});

// セキュリティイベント（異常検知）
if (providerErrors.length > providers.length / 2) {
  await AuditLogger.log({
    action: 'wallbounce_high_failure_rate',
    category: 'security',
    user: 'system',
    details: {
      sessionId,
      round,
      totalProviders: providers.length,
      failures: providerErrors.length,
      severity: 'high'
    },
    result: 'error'
  });
}
```

**クエリ例**:
```bash
# 本日のwall-bounce実行履歴
curl "http://localhost:8443/api/v1/audit/logs/action?startDate=2025-10-04" | jq '[.logs[] | select(.action | startswith("wallbounce"))]'
```

---

## 3. 実装優先順位マトリクス

| Phase | タスク | 優先度 | 工数 | 影響範囲 | リスク |
|-------|--------|--------|------|----------|--------|
| 1.1 | POST Endpoint | **P1** | 1日 | API | 低 |
| 1.2 | ExecuteOptions拡張 | **P1** | 1日 | Core | 低 |
| 2.1 | executeDeepSequentialMode | **P1** | 2日 | Core | 中 |
| 2.2 | テストケース | **P1** | 1日 | Test | 低 |
| 3.1 | カスタムガイダンス | P2 | 1日 | API | 低 |
| 3.2 | プロバイダ順序指定 | P2 | 0.5日 | Core | 低 |
| 4.1 | 中間結果キャッシュ | P2 | 2日 | Core | 中 |
| 4.2 | トークン削減 | P2 | 1日 | Core | 低 |
| 5.1 | デバッグモード | P3 | 1日 | API | 低 |
| 5.2 | 監査ログ統合 | P3 | 1日 | Core | 低 |

**総工数**: 11.5日 (約2週間)

---

## 4. マイルストーン

### Milestone 1: API互換性確保 (Phase 1完了)
**期限**: 実装開始から2日後
**成果物**:
- ✅ POST /single endpoint
- ✅ POST /analyze endpoint
- ✅ providerOverride, providerOrder 対応

**検証方法**:
```bash
./scripts/test-wall-bounce.sh
```

---

### Milestone 2: 深度制御実装 (Phase 2完了)
**期限**: 実装開始から5日後
**成果物**:
- ✅ executeDeepSequentialMode()
- ✅ depth=1〜5 対応
- ✅ 累積コンテキスト管理

**検証方法**:
```bash
./scripts/test-wall-bounce-depth.sh
```

---

### Milestone 3: 本番リリース準備 (Phase 1-2完了)
**期限**: 実装開始から1週間後
**成果物**:
- ✅ 全P1タスク完了
- ✅ ドキュメント更新
- ✅ 本番デプロイ

**検証方法**:
```bash
npm run build
sudo rsync -av dist/ /prod/techsapo/dist/
sudo systemctl restart techsapo
./scripts/smoke-test.sh
```

---

### Milestone 4: 最適化・監視 (Phase 3-5完了)
**期限**: 実装開始から2週間後
**成果物**:
- ✅ 全P2/P3タスク完了
- ✅ パフォーマンスベンチマーク
- ✅ 運用ガイド作成

---

## 5. リスク管理

### リスク1: トークン制限超過
**発生確率**: 中
**影響度**: 高
**対策**:
- 各ラウンドでのトークン使用量を監視
- `truncate()` の閾値を動的調整
- プロバイダのmax_tokensを適切に設定

---

### リスク2: 実行時間の増大
**発生確率**: 高
**影響度**: 中
**対策**:
- depth=3以上は明示的な警告表示
- タイムアウト設定 (depth × providers × 10秒)
- 並列実行の検討（同一ラウンド内でプロバイダを並列化）

---

### リスク3: プロバイダ障害による中断
**発生確率**: 中
**影響度**: 中
**対策**:
- 各ラウンドで最小プロバイダ数チェック
- 2ラウンド目以降の失敗は警告のみ（継続可能）
- キャッシュ活用でリトライ時の負荷軽減

---

### リスク4: コスト増加
**発生確率**: 高
**影響度**: 低
**対策**:
- depth × providers の総コスト見積もりを事前表示
- 高コストタスクには承認フロー追加
- トークン最適化（Phase 4.2）

---

## 6. 成功指標 (KPI)

### 機能性
- ✅ POST endpoint応答率: 100%
- ✅ depth=1〜5 すべてで正常動作
- ✅ プロバイダ指定機能: 100%動作

### パフォーマンス
- ✅ depth=1: 実行時間 < 15秒
- ✅ depth=3: 実行時間 < 45秒
- ✅ トークン削減: 30%以上

### 品質
- ✅ エラー率: < 1%
- ✅ コンセンサススコア: > 0.80
- ✅ ユーザ満足度: > 8/10

---

## 7. ドキュメント更新

### 7.1 API Reference更新
**ファイル**: `docs/API_REFERENCE.md`

追加セクション:
- POST /api/v1/wall-bounce/single
- POST /api/v1/wall-bounce/analyze
- depth パラメータ仕様
- customGuidance 使用例

---

### 7.2 Wall-Bounce System Guide更新
**ファイル**: `docs/WALL_BOUNCE_SYSTEM.md`

追加セクション:
- 深度制御の仕組み
- プロバイダ順序指定
- カスタムガイダンス
- パフォーマンスチューニング

---

### 7.3 チュートリアル作成
**ファイル**: `docs/tutorials/WALL_BOUNCE_DEEP_SEQUENTIAL.md`

内容:
- ステップバイステップガイド
- 実践例（3つ以上）
- トラブルシューティング

---

## 8. テスト計画

### 8.1 ユニットテスト
**ファイル**: `tests/unit/wall-bounce-analyzer.test.ts`

```typescript
describe('WallBounceAnalyzer - Deep Sequential Mode', () => {
  it('should execute depth=1 correctly', async () => {
    const result = await analyzer.executeWallBounce('test query', {
      mode: 'sequential',
      depth: 1,
      providerOverride: ['gemini-2.5-pro', 'qwen3-coder']
    });

    expect(result.votes.length).toBe(2);
  });

  it('should execute depth=3 with cumulative context', async () => {
    const result = await analyzer.executeWallBounce('test query', {
      mode: 'sequential',
      depth: 3,
      providerOverride: ['gemini-2.5-pro']
    });

    expect(result.votes.length).toBe(3); // 1 provider × 3 rounds
    // 各ラウンドでプロンプトが累積されているか確認
  });

  it('should handle provider failure gracefully', async () => {
    // Mock provider to fail
    jest.spyOn(analyzer as any, 'invokeProvider')
      .mockRejectedValueOnce(new Error('Provider error'));

    const result = await analyzer.executeWallBounce('test query', {
      mode: 'sequential',
      depth: 2,
      providerOverride: ['gemini-2.5-pro', 'qwen3-coder']
    });

    // Should continue with remaining providers
    expect(result.votes.length).toBeGreaterThan(0);
  });
});
```

---

### 8.2 統合テスト
**ファイル**: `tests/integration/wall-bounce-api.test.ts`

```typescript
describe('Wall-Bounce API - POST Endpoints', () => {
  it('POST /single should return single provider response', async () => {
    const response = await request(app)
      .post('/api/v1/wall-bounce/single')
      .send({
        query: 'What is 2+2?',
        provider: 'gemini-2.5-pro'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.provider).toBe('gemini-2.5-pro');
  });

  it('POST /analyze should support sequential mode', async () => {
    const response = await request(app)
      .post('/api/v1/wall-bounce/analyze')
      .send({
        query: 'Explain async/await',
        mode: 'sequential',
        depth: 2
      });

    expect(response.status).toBe(200);
    expect(response.body.mode).toBe('sequential');
    expect(response.body.votes.length).toBeGreaterThan(3);
  });
});
```

---

## 9. デプロイ計画

### 9.1 開発環境デプロイ
**タイミング**: Phase 1完了後

```bash
# ビルド
npm run build

# ローカルテスト
npm run dev
./scripts/test-wall-bounce.sh
```

---

### 9.2 ステージング環境デプロイ (将来)
**タイミング**: Phase 2完了後

```bash
# ビルド
npm run build

# ステージングへコピー
rsync -av dist/ staging:/path/to/app/dist/

# サービス再起動
ssh staging 'systemctl restart techsapo'

# 動作確認
./scripts/regression-test.sh
```

---

### 9.3 本番環境デプロイ
**タイミング**: Phase 1-2完了 + 1週間の動作確認後

```bash
# バックアップ
ssh production 'cp -r /prod/techsapo /prod/techsapo.backup.$(date +%Y%m%d)'

# ビルド
npm run build

# 本番へデプロイ
sudo rsync -av dist/ /prod/techsapo/dist/

# サービス再起動
sudo systemctl restart techsapo

# ヘルスチェック
curl http://localhost:8443/health
./scripts/smoke-test.sh
```

---

## 10. ロールバック計画

### トリガー条件
- エラー率 > 5%
- 応答時間 > 60秒 (depth=1)
- クリティカルバグ発見

### ロールバック手順
```bash
# 1. サービス停止
sudo systemctl stop techsapo

# 2. バックアップから復元
sudo rm -rf /prod/techsapo/dist
sudo cp -r /prod/techsapo.backup.YYYYMMDD/dist /prod/techsapo/

# 3. サービス再起動
sudo systemctl start techsapo

# 4. 動作確認
curl http://localhost:8443/health

# 5. 監査ログ記録
curl -X POST http://localhost:8443/api/v1/audit/log \
  -H "Content-Type: application/json" \
  -d '{
    "action": "rollback",
    "category": "change",
    "details": {
      "reason": "High error rate detected",
      "from_version": "v2.0.0",
      "to_version": "v1.9.0"
    }
  }'
```

---

## 11. 次のステップ

### 即座に実施（今日〜明日）
1. ✅ Phase 1.1 実装開始: POST endpoint
2. ✅ Phase 1.2 実装: ExecuteOptions拡張

### 今週中
3. ✅ Phase 2.1 実装: executeDeepSequentialMode
4. ✅ Phase 2.2 実装: テストケース作成
5. ✅ Milestone 1 達成確認

### 来週
6. ✅ Phase 3実装: 柔軟性向上
7. ✅ Phase 4実装: パフォーマンス最適化
8. ✅ 本番デプロイ準備

---

## 12. FAQ

### Q1: depth=1とdepth=3でどれくらいコストが違いますか？

**A**:
- depth=1: ~1800 input tokens, ~2650 output tokens
- depth=3: ~5400 input tokens (3倍), ~7950 output tokens (3倍)

**コスト比**: depth=3 はdepth=1の約3倍

---

### Q2: シリアルモードとパラレルモードはどう使い分けるべきですか？

**A**:
- **パラレル**: 幅広い視点が欲しい、実行時間を短縮したい
- **シリアル depth=1**: 前の分析を踏まえた深掘りが欲しい
- **シリアル depth=3**: 徹底的な分析、複雑な問題の段階的解決

---

### Q3: プロバイダが途中で失敗したらどうなりますか？

**A**:
- 1ラウンド目: 最小プロバイダ数未満なら **エラー終了**
- 2ラウンド目以降: **警告ログを出力して継続** (前ラウンドまでの結果で統合)

---

### Q4: カスタムガイダンスとデフォルトガイダンスの違いは？

**A**:
- **デフォルト**: `PROVIDER_GUIDANCE` で定義された汎用的な指示
- **カスタム**: ユーザが特定タスク向けに上書きする指示

カスタムが指定されるとデフォルトを上書き。

---

## 13. 参考資料

- **既存実装**: `src/services/wall-bounce-analyzer.ts`
- **API定義**: `src/routes/wall-bounce-api.ts`
- **設定ファイル**: `src/config/llm-providers.json`
- **テスト**: `tests/integration/wall-bounce-*.test.ts`

---

**計画策定日**: 2025-10-04
**策定者**: Claude Code
**承認**: 未承認（レビュー待ち）
**次回レビュー**: 2025-10-11 (Phase 1-2完了後)
