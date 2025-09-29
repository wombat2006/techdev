# Gemini API Models and Troubleshooting Guide

## Overview

This document provides comprehensive analysis of Gemini API models and troubleshooting strategies for TechSapo's Wall-Bounce Analysis System integration. It covers model selection criteria, technical specifications, and robust error handling patterns.

## Gemini Model Lineup Analysis

### 1. Gemini 2.5 Pro (Flagship Model)

**Model Code**: `gemini-2.5-pro`

**Description**: State-of-the-art thinking model, capable of reasoning over complex problems

**Technical Specifications**:
- **Input Token Limit**: 1,048,576 tokens
- **Supported Inputs**: Audio, images, video, text, PDF
- **Advanced Features**: Code execution, function calling, search grounding, structured outputs
- **Knowledge Cutoff**: January 2025

**TechSapo Integration Recommendations**:
```typescript
// Gemini 2.5 Pro configuration for critical tasks
export class GeminiProProvider implements WallBounceProvider {
  getModelConfig(request: WallBounceRequest): GeminiConfig {
    return {
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: request.context.task_type === 'critical' ? 0.1 : 0.3,
        topP: 0.9,
        maxOutputTokens: 8192,
        candidateCount: 1
      },
      safetySettings: this.getCriticalSafetySettings(),
      tools: this.getAdvancedTools(request)
    };
  }

  // Best for: Complex reasoning, large context analysis, critical business decisions
  shouldUseForTask(request: WallBounceRequest): boolean {
    return request.context.task_type === 'critical' ||
           request.context.complexity === 'high' ||
           request.prompt.length > 50000; // Large context analysis
  }
}
```

**Use Cases for TechSapo**:
- **Critical Task Type**: Complex business analysis, strategic decision support
- **Large Context Analysis**: Processing extensive documentation or code reviews
- **Advanced Reasoning**: Multi-step problem solving requiring deep analysis
- **Function Calling**: Integration with TechSapo's tool ecosystem

### 2. Gemini 2.5 Flash (Price-Performance Model)

**Model Code**: `gemini-2.5-flash`

**Description**: Best model in terms of price-performance, offering well-rounded capabilities

**Technical Specifications**:
- **Input Token Limit**: 1,048,576 tokens
- **Supported Inputs**: Text, images, video, audio
- **Advanced Features**: Batch API, caching, code execution, function calling, thinking capabilities
- **Knowledge Cutoff**: January 2025

**TechSapo Integration Recommendations**:
```typescript
// Gemini 2.5 Flash configuration for balanced performance
export class GeminiFlashProvider implements WallBounceProvider {
  getModelConfig(request: WallBounceRequest): GeminiConfig {
    return {
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: this.mapTemperatureForTaskType(request.context.task_type),
        topP: 0.8,
        maxOutputTokens: 4096,
        candidateCount: 1
      },
      systemInstruction: this.generateSystemInstruction(request),
      tools: this.getStandardTools(request)
    };
  }

  // Best for: General-purpose Wall-Bounce operations, premium tasks
  shouldUseForTask(request: WallBounceRequest): boolean {
    return request.context.task_type === 'premium' ||
           (request.context.task_type === 'basic' && request.context.cost_tier === 'medium');
  }

  // Enhanced caching for repeated Wall-Bounce patterns
  async executeWithCaching(request: WallBounceRequest): Promise<GeminiResponse> {
    const cacheKey = this.generateCacheKey(request);

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const response = await this.execute(request);

    if (this.isCacheable(request)) {
      this.cache.set(cacheKey, response, { ttl: 3600 }); // 1 hour cache
    }

    return response;
  }
}
```

**Use Cases for TechSapo**:
- **Premium Task Type**: Standard business operations with good performance requirements
- **Batch Processing**: Multiple Wall-Bounce requests with batch API optimization
- **Cost-Conscious Operations**: Balance between capability and cost efficiency
- **Caching Strategy**: Repeated queries with intelligent caching

### 3. Gemini 2.5 Flash-Lite (Ultra Fast Model)

**Model Code**: `gemini-2.5-flash-lite`

**Description**: Optimized for cost-efficiency and high throughput

**Technical Specifications**:
- **Input Token Limit**: 1,048,576 tokens
- **Supported Inputs**: Text, image, video, audio, PDF
- **Advanced Features**: Batch API support, function calling, structured outputs
- **Performance**: Ultra-fast responses, high throughput

**TechSapo Integration Recommendations**:
```typescript
// Gemini 2.5 Flash-Lite configuration for high-volume operations
export class GeminiFlashLiteProvider implements WallBounceProvider {
  getModelConfig(request: WallBounceRequest): GeminiConfig {
    return {
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.1, // Lower temperature for consistent, fast responses
        topP: 0.7,
        maxOutputTokens: 2048, // Optimized for speed
        candidateCount: 1
      },
      systemInstruction: this.getOptimizedSystemInstruction(request)
    };
  }

  // Best for: Basic tasks, high-volume operations, rapid responses
  shouldUseForTask(request: WallBounceRequest): boolean {
    return request.context.task_type === 'basic' ||
           request.context.priority === 'urgent' ||
           request.context.cost_tier === 'low';
  }

  // Optimized for high-throughput Wall-Bounce coordination
  async executeBatch(requests: WallBounceRequest[]): Promise<GeminiResponse[]> {
    const batchConfig = {
      model: 'gemini-2.5-flash-lite',
      requests: requests.map(req => ({
        contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
        generationConfig: this.getModelConfig(req).generationConfig
      }))
    };

    return await this.client.batchGenerateContent(batchConfig);
  }
}
```

**Use Cases for TechSapo**:
- **Basic Task Type**: Simple queries, quick consultations, status checks
- **High-Volume Operations**: Batch processing of similar requests
- **Urgent Responses**: Time-critical operations requiring immediate feedback
- **Cost Optimization**: Budget-conscious operations with acceptable quality

### 4. Specialized Variants

#### Gemini Flash Image
**Purpose**: Image generation capabilities
**Integration**: Visual content creation for TechSapo documentation and presentations

#### Gemini Flash Live
**Purpose**: Native audio processing
**Integration**: Voice-based Wall-Bounce interactions and audio analysis

#### Gemini Flash TTS
**Purpose**: Text-to-speech synthesis
**Integration**: Audio output for TechSapo notifications and accessibility

## Model Version Strategy for TechSapo

### Version Types and Usage

```typescript
// Model version management for TechSapo Wall-Bounce
export class GeminiVersionManager {
  getModelVersion(environment: string, stability: string): string {
    switch (environment) {
      case 'production':
        return stability === 'stable' ? 'gemini-2.5-flash' : 'gemini-2.5-flash-stable';
      case 'staging':
        return 'gemini-2.5-flash-preview';
      case 'development':
        return 'gemini-2.5-flash-latest';
      case 'experimental':
        return 'gemini-2.5-flash-experimental';
    }
  }

  // Progressive deployment strategy
  async deployNewVersion(newVersion: string): Promise<void> {
    // Start with development environment
    await this.updateEnvironment('development', newVersion);
    await this.runValidationTests('development');

    // Move to staging for broader testing
    await this.updateEnvironment('staging', newVersion);
    await this.runIntegrationTests('staging');

    // Gradual production rollout
    await this.gradualProductionRollout(newVersion);
  }
}
```

### Version Selection Criteria
1. **Stable**: Production Wall-Bounce operations requiring consistency
2. **Preview**: Staging environment for testing new capabilities
3. **Latest**: Development environment for staying current
4. **Experimental**: Research and development of new features

## Task Type Mapping for Model Selection

### TechSapo Task Classification

```typescript
// Enhanced model selection based on TechSapo task types
export class IntelligentModelSelector {
  selectOptimalModel(request: WallBounceRequest): string {
    const { task_type, cost_tier, complexity, urgency } = request.context;

    // Critical tasks - always use Pro for maximum capability
    if (task_type === 'critical') {
      return 'gemini-2.5-pro';
    }

    // Premium tasks - balance capability and cost
    if (task_type === 'premium') {
      return complexity === 'high' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    }

    // Basic tasks - optimize for cost and speed
    if (task_type === 'basic') {
      if (urgency === 'urgent' || cost_tier === 'low') {
        return 'gemini-2.5-flash-lite';
      }
      return 'gemini-2.5-flash';
    }

    // Default fallback
    return 'gemini-2.5-flash';
  }

  // Dynamic configuration based on model selection
  getOptimizedConfig(model: string, request: WallBounceRequest): GeminiConfig {
    const baseConfig = {
      model,
      generationConfig: this.getGenerationConfig(model, request),
      safetySettings: this.getSafetySettings(request.context.risk_level)
    };

    // Add advanced features for Pro model
    if (model === 'gemini-2.5-pro') {
      baseConfig.tools = this.getAdvancedTools(request);
      baseConfig.systemInstruction = this.getComplexSystemInstruction(request);
    }

    // Add caching for Flash models
    if (model.includes('flash')) {
      baseConfig.cachedContent = this.getCachedContent(request);
    }

    return baseConfig;
  }
}
```

## Gemini API Troubleshooting Guide

### Common Error Codes and Resolutions

#### 1. 400 INVALID_ARGUMENT
**Cause**: Malformed request body or invalid parameters

**TechSapo Resolution Strategy**:
```typescript
export class GeminiErrorHandler {
  async handleInvalidArgument(error: GeminiError, request: WallBounceRequest): Promise<GeminiResponse> {
    logger.warn('Invalid Gemini request detected', { error, request });

    // Validate and sanitize request parameters
    const sanitizedRequest = this.sanitizeRequest(request);

    // Check parameter ranges
    const validationErrors = this.validateParameters(sanitizedRequest);
    if (validationErrors.length > 0) {
      throw new WallBounceValidationError('Request validation failed', validationErrors);
    }

    // Retry with sanitized request
    return await this.retryWithSanitizedRequest(sanitizedRequest);
  }

  private validateParameters(request: WallBounceRequest): string[] {
    const errors = [];

    // Validate candidate count (1-8)
    if (request.options?.candidateCount &&
        (request.options.candidateCount < 1 || request.options.candidateCount > 8)) {
      errors.push('Candidate count must be between 1 and 8');
    }

    // Validate temperature (0.0-1.0)
    if (request.options?.temperature &&
        (request.options.temperature < 0.0 || request.options.temperature > 1.0)) {
      errors.push('Temperature must be between 0.0 and 1.0');
    }

    // Validate token limits
    if (request.prompt.length > 1000000) { // Approximate token limit
      errors.push('Prompt exceeds maximum token limit');
    }

    return errors;
  }
}
```

#### 2. 403 PERMISSION_DENIED
**Cause**: Incorrect API key permissions or access issues

**TechSapo Resolution Strategy**:
```typescript
export class GeminiAuthHandler {
  async handlePermissionDenied(error: GeminiError): Promise<void> {
    logger.error('Gemini API permission denied', error);

    // Check API key configuration
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new ConfigurationError('GOOGLE_API_KEY environment variable not set');
    }

    // Validate API key format
    if (!this.isValidApiKeyFormat(apiKey)) {
      throw new ConfigurationError('Invalid GOOGLE_API_KEY format');
    }

    // Test API key with simple request
    try {
      await this.testApiKeyAccess(apiKey);
    } catch (testError) {
      throw new AuthenticationError('API key validation failed', testError);
    }

    // Check model access permissions
    await this.validateModelAccess();
  }

  private async testApiKeyAccess(apiKey: string): Promise<void> {
    const client = new GoogleGenAI({ apiKey });
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    await model.generateContent('Test access');
  }
}
```

#### 3. 429 RESOURCE_EXHAUSTED
**Cause**: Rate limit exceeded

**TechSapo Resolution Strategy**:
```typescript
export class GeminiRateLimitHandler {
  private rateLimitBackoff = new ExponentialBackoff({
    initialDelay: 1000,
    maxDelay: 30000,
    maxRetries: 5
  });

  async handleRateLimit(error: GeminiError, request: WallBounceRequest): Promise<GeminiResponse> {
    logger.warn('Gemini rate limit exceeded', { error, request: request.id });

    // Check if we can switch to alternative model
    const alternativeModel = this.getAlternativeModel(request);
    if (alternativeModel) {
      logger.info('Switching to alternative Gemini model', { model: alternativeModel });
      return await this.executeWithAlternativeModel(alternativeModel, request);
    }

    // Implement exponential backoff retry
    return await this.rateLimitBackoff.execute(async () => {
      return await this.executeOriginalRequest(request);
    });
  }

  private getAlternativeModel(request: WallBounceRequest): string | null {
    const currentModel = request.options?.model || 'gemini-2.5-flash';

    // Downgrade to less resource-intensive model
    const alternativeMap = {
      'gemini-2.5-pro': 'gemini-2.5-flash',
      'gemini-2.5-flash': 'gemini-2.5-flash-lite',
      'gemini-2.5-flash-lite': null // No alternative
    };

    return alternativeMap[currentModel] || null;
  }

  // Implement intelligent rate limiting
  async executeWithRateLimit(request: WallBounceRequest): Promise<GeminiResponse> {
    const rateLimitKey = this.getRateLimitKey(request);

    if (await this.isRateLimited(rateLimitKey)) {
      const delay = await this.calculateBackoffDelay(rateLimitKey);
      await this.sleep(delay);
    }

    try {
      const response = await this.executeRequest(request);
      await this.recordSuccessfulRequest(rateLimitKey);
      return response;
    } catch (error) {
      if (error.status === 429) {
        await this.recordRateLimitHit(rateLimitKey);
        throw error;
      }
      throw error;
    }
  }
}
```

#### 4. 500 INTERNAL
**Cause**: Unexpected server-side error

**TechSapo Resolution Strategy**:
```typescript
export class GeminiInternalErrorHandler {
  async handleInternalError(error: GeminiError, request: WallBounceRequest): Promise<GeminiResponse> {
    logger.error('Gemini internal server error', { error, request: request.id });

    // Try reducing input context
    const reducedRequest = await this.reduceInputContext(request);
    if (reducedRequest) {
      try {
        return await this.executeReducedRequest(reducedRequest);
      } catch (retryError) {
        logger.warn('Reduced context request also failed', retryError);
      }
    }

    // Switch to alternative model temporarily
    const alternativeModel = this.getAlternativeModelForError(request);
    if (alternativeModel) {
      try {
        return await this.executeWithAlternativeModel(alternativeModel, request);
      } catch (altError) {
        logger.warn('Alternative model also failed', altError);
      }
    }

    // Fallback to other Wall-Bounce providers
    throw new ProviderUnavailableError('Gemini service temporarily unavailable', error);
  }

  private async reduceInputContext(request: WallBounceRequest): Promise<WallBounceRequest | null> {
    const maxPromptLength = 50000; // Conservative limit

    if (request.prompt.length <= maxPromptLength) {
      return null; // Already within reasonable limits
    }

    // Intelligent prompt truncation
    const truncatedPrompt = this.intelligentTruncation(request.prompt, maxPromptLength);

    return {
      ...request,
      prompt: truncatedPrompt,
      context: {
        ...request.context,
        truncated: true,
        original_length: request.prompt.length
      }
    };
  }
}
```

### Performance Optimization Strategies

#### 1. High Latency Issues
**For Gemini 2.5 models with high latency**:

```typescript
export class GeminiPerformanceOptimizer {
  async optimizeForLatency(request: WallBounceRequest): Promise<GeminiConfig> {
    const config = this.getBaseConfig(request);

    // Disable thinking for faster responses
    if (request.context.priority === 'urgent') {
      config.generationConfig.thinking = false;
    }

    // Optimize temperature for faster generation
    if (request.context.speed_over_quality) {
      config.generationConfig.temperature = 0.8; // Higher for more diverse, faster outputs
    }

    // Reduce output tokens for speed
    if (request.context.require_brief_response) {
      config.generationConfig.maxOutputTokens = 1024;
    }

    return config;
  }

  // Monitor and adjust performance based on metrics
  async executeWithPerformanceMonitoring(request: WallBounceRequest): Promise<GeminiResponse> {
    const startTime = Date.now();

    try {
      const response = await this.execute(request);
      const executionTime = Date.now() - startTime;

      // Record performance metrics
      await this.recordPerformanceMetrics({
        model: request.options?.model,
        execution_time: executionTime,
        input_tokens: this.estimateTokens(request.prompt),
        output_tokens: response.usage?.totalTokens,
        task_type: request.context.task_type
      });

      // Adaptive optimization based on performance
      if (executionTime > 10000) { // 10 seconds
        await this.suggestPerformanceOptimizations(request, executionTime);
      }

      return response;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      await this.recordFailureMetrics({
        model: request.options?.model,
        execution_time: executionTime,
        error_type: error.status || 'unknown',
        task_type: request.context.task_type
      });
      throw error;
    }
  }
}
```

#### 2. Safety and Content Issues

```typescript
export class GeminiSafetyHandler {
  async handleSafetyBlocking(response: GeminiResponse, request: WallBounceRequest): Promise<GeminiResponse> {
    if (response.candidates?.[0]?.finishReason === 'SAFETY') {
      logger.warn('Gemini safety blocking detected', { request: request.id });

      // Analyze safety ratings
      const safetyRatings = response.candidates[0].safetyRatings;
      const blockedCategories = safetyRatings?.filter(rating =>
        rating.probability === 'HIGH' || rating.probability === 'MEDIUM'
      );

      // Adjust prompt to avoid safety issues
      const adjustedRequest = await this.adjustPromptForSafety(request, blockedCategories);

      if (adjustedRequest) {
        return await this.executeAdjustedRequest(adjustedRequest);
      }

      // If adjustment not possible, escalate to human review
      throw new SafetyBlockingError('Content blocked by safety filters', {
        blockedCategories,
        originalRequest: request
      });
    }

    return response;
  }

  private async adjustPromptForSafety(
    request: WallBounceRequest,
    blockedCategories: any[]
  ): Promise<WallBounceRequest | null> {
    // Implement prompt sanitization based on blocked categories
    let adjustedPrompt = request.prompt;

    for (const category of blockedCategories) {
      switch (category.category) {
        case 'HARM_CATEGORY_HATE_SPEECH':
          adjustedPrompt = this.sanitizeHateSpeech(adjustedPrompt);
          break;
        case 'HARM_CATEGORY_DANGEROUS_CONTENT':
          adjustedPrompt = this.sanitizeDangerousContent(adjustedPrompt);
          break;
        // Add more category handlers as needed
      }
    }

    if (adjustedPrompt === request.prompt) {
      return null; // No adjustment possible
    }

    return {
      ...request,
      prompt: adjustedPrompt,
      context: {
        ...request.context,
        safety_adjusted: true,
        original_prompt_hash: this.hashPrompt(request.prompt)
      }
    };
  }
}
```

## TechSapo Wall-Bounce Integration Strategy

### Model-Aware Wall-Bounce Coordinator

```typescript
export class ModelAwareWallBounceCoordinator {
  private modelSelectors = {
    gemini: new IntelligentModelSelector(),
    openai: new OpenAIModelSelector(),
    anthropic: new AnthropicModelSelector()
  };

  async executeWallBounce(request: WallBounceRequest): Promise<WallBounceResponse> {
    const providers = this.selectProviders(request);
    const responses = new Map<string, ProviderResponse>();

    // Execute with optimal models for each provider
    for (const provider of providers) {
      try {
        const optimalModel = this.modelSelectors[provider.type].selectOptimalModel(request);
        const providerResponse = await provider.executeWithModel(optimalModel, request);
        responses.set(provider.name, providerResponse);
      } catch (error) {
        await this.handleProviderError(provider, error, request);
      }
    }

    // Analyze consensus with model-specific weighting
    const consensus = await this.analyzeModelAwareConsensus(responses, request);

    return {
      consensus,
      provider_responses: Array.from(responses.values()),
      model_selection_rationale: this.getModelSelectionRationale(request),
      execution_metadata: this.getExecutionMetadata(responses)
    };
  }

  private analyzeModelAwareConsensus(
    responses: Map<string, ProviderResponse>,
    request: WallBounceRequest
  ): ConsensusAnalysis {
    // Weight responses based on model capabilities and task type
    const weightedResponses = Array.from(responses.entries()).map(([provider, response]) => {
      const weight = this.calculateModelWeight(response.model, request.context.task_type);
      return { provider, response, weight };
    });

    // Calculate consensus with model-aware weighting
    return this.calculateWeightedConsensus(weightedResponses);
  }

  private calculateModelWeight(model: string, taskType: string): number {
    const modelWeights = {
      'gemini-2.5-pro': { critical: 1.0, premium: 0.9, basic: 0.7 },
      'gemini-2.5-flash': { critical: 0.8, premium: 1.0, basic: 0.9 },
      'gemini-2.5-flash-lite': { critical: 0.6, premium: 0.7, basic: 1.0 },
      'gpt-5': { critical: 1.0, premium: 0.9, basic: 0.8 },
      'claude-3.5-sonnet': { critical: 0.9, premium: 0.8, basic: 0.8 }
    };

    return modelWeights[model]?.[taskType] || 0.5;
  }
}
```

## Cost Optimization and Monitoring

### Intelligent Cost Management

```typescript
export class GeminiCostOptimizer {
  private costMetrics = new Map<string, ModelCostMetrics>();

  async executeWithCostOptimization(request: WallBounceRequest): Promise<GeminiResponse> {
    // Estimate cost before execution
    const estimatedCost = await this.estimateRequestCost(request);

    if (estimatedCost > request.context.cost_threshold) {
      // Try to optimize request to reduce cost
      const optimizedRequest = await this.optimizeForCost(request);
      if (optimizedRequest) {
        return await this.execute(optimizedRequest);
      }

      throw new CostThresholdExceededError(estimatedCost, request.context.cost_threshold);
    }

    // Execute with cost tracking
    const startTime = Date.now();
    const response = await this.execute(request);
    const executionTime = Date.now() - startTime;

    // Record actual cost metrics
    await this.recordCostMetrics({
      model: request.options?.model,
      input_tokens: this.estimateTokens(request.prompt),
      output_tokens: response.usage?.totalTokens,
      execution_time: executionTime,
      estimated_cost: estimatedCost,
      task_type: request.context.task_type
    });

    return response;
  }

  private async optimizeForCost(request: WallBounceRequest): Promise<WallBounceRequest | null> {
    // Try switching to more cost-effective model
    const currentModel = request.options?.model || 'gemini-2.5-flash';
    const cheaperModel = this.getCheaperAlternative(currentModel);

    if (cheaperModel && this.isAcceptableQualityTrade(request, cheaperModel)) {
      return {
        ...request,
        options: { ...request.options, model: cheaperModel },
        context: { ...request.context, cost_optimized: true }
      };
    }

    // Try reducing output tokens
    const currentMaxTokens = request.options?.maxOutputTokens || 4096;
    if (currentMaxTokens > 1024) {
      return {
        ...request,
        options: {
          ...request.options,
          maxOutputTokens: Math.max(1024, currentMaxTokens * 0.5)
        },
        context: { ...request.context, tokens_optimized: true }
      };
    }

    return null; // No optimization possible
  }
}
```

## Conclusion

This comprehensive analysis of Gemini API models and troubleshooting strategies provides TechSapo with the foundation for optimal Gemini integration within the Wall-Bounce Analysis System. Key recommendations:

### Model Selection Strategy
1. **Gemini 2.5 Pro**: Critical tasks requiring maximum reasoning capability
2. **Gemini 2.5 Flash**: Premium tasks balancing performance and cost
3. **Gemini 2.5 Flash-Lite**: Basic tasks prioritizing speed and cost efficiency

### Error Handling Enhancement
1. **Robust Error Recovery**: Comprehensive handling of all Gemini error codes
2. **Intelligent Fallbacks**: Model switching and request optimization
3. **Performance Monitoring**: Real-time metrics and adaptive optimization

### Cost and Performance Optimization
1. **Dynamic Model Selection**: Task-aware model routing
2. **Intelligent Caching**: Response caching for repeated patterns
3. **Cost-Aware Execution**: Threshold-based cost management

### Integration Benefits for TechSapo
- **Enhanced Reliability**: Multi-model fallback strategies
- **Optimized Performance**: Task-specific model selection
- **Cost Efficiency**: Intelligent cost management and optimization
- **Scalable Architecture**: Supports varying workload requirements

This analysis provides the technical foundation for enhancing TechSapo's Gemini integration, ensuring robust, cost-effective, and high-performance operation within the Wall-Bounce ecosystem.

## References

- [Gemini API Models Documentation](https://ai.google.dev/gemini-api/docs/models?hl=en)
- [Gemini API Troubleshooting Guide](https://ai.google.dev/gemini-api/docs/troubleshooting?hl=en)
- [TechSapo Gemini Migration Guide](./gemini-api-migration-guide.md)
- [TechSapo Wall-Bounce Analysis System](../src/services/wall-bounce-analyzer.ts)
- [TechSapo Codex MCP Implementation](./codex-mcp-implementation.md)