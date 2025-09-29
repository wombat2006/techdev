# OpenAI Cookbook Integration Guide

## 🍳 Overview

This guide integrates advanced techniques from the [OpenAI Cookbook](https://cookbook.openai.com) into TechSapo's architecture, filling gaps in our current implementation and enhancing AI capabilities.

## 📚 Cookbook Topics Integration Status

### ✅ Already Implemented in TechSapo

#### Embeddings & Vector Search
- **Current**: Advanced Japanese embedding service (`src/services/embedding-service.ts`)
- **Enhancement**: Multi-model comparison, caching, specialized term detection
- **Cookbook Value**: Advanced vector similarity algorithms, performance optimization

#### Multi-Agent Orchestration
- **Current**: Wall-Bounce Analyzer with multiple LLM providers
- **Enhancement**: OpenAI Agents SDK integration documented
- **Cookbook Value**: Advanced agent handoff patterns, tool orchestration

#### RAG (Retrieval Augmented Generation)
- **Current**: Google Drive integration for document retrieval
- **Enhancement**: Vector store optimization, semantic chunking
- **Cookbook Value**: Advanced retrieval strategies, context ranking

### ❌ Missing Critical Components

## 🧠 Context Management Implementation

### Context Trimming Strategy
```typescript
// Context management service for long conversations
export class ContextManager {
  private maxContextTokens: number = 8000; // GPT-5 context limit consideration
  private summaryTokens: number = 1000;

  async trimContext(conversation: ConversationMessage[]): Promise<ConversationMessage[]> {
    const totalTokens = this.estimateTokens(conversation);

    if (totalTokens <= this.maxContextTokens) {
      return conversation;
    }

    // Preserve system message and recent messages
    const systemMessages = conversation.filter(msg => msg.role === 'system');
    const recentMessages = conversation.slice(-10); // Keep last 10 messages
    const olderMessages = conversation.slice(0, -10).filter(msg => msg.role !== 'system');

    // Summarize older context
    const summary = await this.summarizeContext(olderMessages);

    return [
      ...systemMessages,
      {
        role: 'assistant',
        content: `[Context Summary] ${summary}`,
        timestamp: new Date().toISOString()
      },
      ...recentMessages
    ];
  }

  private async summarizeContext(messages: ConversationMessage[]): Promise<string> {
    const contextText = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');

    // Use wall-bounce for high-quality summarization
    const wallBounceResult = await wallBounceAnalyzer.executeWallBounce(
      `以下の会話を簡潔に要約してください。重要な技術情報と解決策は保持してください:\n${contextText}`,
      'basic',
      { maxTokens: this.summaryTokens }
    );

    return wallBounceResult.consensus.content;
  }

  private estimateTokens(messages: ConversationMessage[]): number {
    return messages.reduce((total, msg) => {
      const japaneseChars = (msg.content.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length;
      const otherChars = msg.content.length - japaneseChars;
      return total + Math.ceil(japaneseChars * 1.5 + otherChars * 0.25);
    }, 0);
  }
}
```

### Conversation Memory System
```typescript
// Enhanced session management with conversation memory
export class ConversationMemoryManager {
  private redis: Redis;
  private contextManager: ContextManager;

  constructor(redis: Redis) {
    this.redis = redis;
    this.contextManager = new ContextManager();
  }

  async storeConversation(sessionId: string, message: ConversationMessage): Promise<void> {
    const conversation = await this.getConversation(sessionId);
    conversation.push(message);

    // Apply context management
    const trimmedConversation = await this.contextManager.trimContext(conversation);

    // Store with expiration
    await this.redis.setex(
      `conversation:${sessionId}`,
      86400, // 24 hours
      JSON.stringify({
        messages: trimmedConversation,
        lastActivity: new Date().toISOString(),
        totalMessages: conversation.length
      })
    );
  }

  async getConversationSummary(sessionId: string): Promise<ConversationSummary> {
    const conversation = await this.getConversation(sessionId);

    if (conversation.length === 0) {
      return {
        sessionId,
        totalMessages: 0,
        summary: '新しいセッション',
        keyTopics: [],
        lastActivity: new Date().toISOString()
      };
    }

    // Extract key topics using embeddings
    const topics = await this.extractKeyTopics(conversation);

    // Generate summary
    const summary = await this.contextManager.summarizeContext(conversation.slice(-20));

    return {
      sessionId,
      totalMessages: conversation.length,
      summary,
      keyTopics: topics,
      lastActivity: conversation[conversation.length - 1]?.timestamp || new Date().toISOString()
    };
  }

  private async extractKeyTopics(conversation: ConversationMessage[]): Promise<string[]> {
    const allText = conversation
      .map(msg => msg.content)
      .join(' ');

    // Use embedding service for topic extraction
    const embeddingService = new EmbeddingService(huggingFaceClient);
    const analysis = await embeddingService.analyzeWithMultipleModels({
      text: allText,
      options: { compareModels: true }
    });

    // Simple keyword extraction (could be enhanced with NER)
    const keywords = allText
      .match(/[ぁ-んァ-ヶー一-龠a-zA-Z0-9]+/g) || []
      .filter(word => word.length > 2)
      .reduce((counts, word) => {
        counts[word] = (counts[word] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

    return Object.entries(keywords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }
}

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ConversationSummary {
  sessionId: string;
  totalMessages: number;
  summary: string;
  keyTopics: string[];
  lastActivity: string;
}
```

## 🎨 Multimodal AI Integration

### Image Analysis for IT Support
```typescript
// Multimodal AI for screenshot analysis
export class MultimodalITAnalyzer {
  private openai: OpenAI;

  constructor(openai: OpenAI) {
    this.openai = openai;
  }

  async analyzeScreenshot(imageBuffer: Buffer, context: string): Promise<ITScreenshotAnalysis> {
    const base64Image = imageBuffer.toString('base64');

    // Use GPT-5 with vision capabilities
    const response = await this.openai.responses.create({
      model: 'gpt-5', // Assuming multimodal support
      instructions: `
        あなたはIT支援の専門家です。スクリーンショットを分析して以下を特定してください:
        1. エラーメッセージの内容
        2. システム状態の評価
        3. 推奨される解決策
        4. 緊急度レベル
      `,
      input: `
        コンテキスト: ${context}

        添付されたスクリーンショットを分析し、IT問題の診断と解決策を提案してください。
        特に日本語のエラーメッセージやUIテキストに注意してください。
      `,
      tools: [
        {
          type: 'function',
          function: {
            name: 'analyzeErrorMessage',
            description: 'エラーメッセージの詳細分析',
            parameters: {
              type: 'object',
              properties: {
                errorType: { type: 'string' },
                severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                suggestedActions: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      ],
      // Note: Image input would be handled according to actual API specification
      attachments: [{
        type: 'image',
        data: base64Image
      }]
    });

    return {
      analysis: response.output_text,
      errorMessages: this.extractErrorMessages(response.output_text),
      severity: this.determineSeverity(response.output_text),
      recommendations: this.extractRecommendations(response.output_text),
      confidence: 0.85 // Would be calculated based on response quality
    };
  }

  private extractErrorMessages(analysis: string): string[] {
    const errorPatterns = [
      /エラー[：:]\s*(.+?)(?=\n|$)/gi,
      /error[：:]?\s*(.+?)(?=\n|$)/gi,
      /失敗[：:]\s*(.+?)(?=\n|$)/gi
    ];

    const errors: string[] = [];
    errorPatterns.forEach(pattern => {
      const matches = analysis.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) errors.push(match[1].trim());
      }
    });

    return errors;
  }

  private determineSeverity(analysis: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalKeywords = ['システム停止', '全停止', 'critical', 'データ損失'];
    const highKeywords = ['サーバーダウン', 'ネットワーク障害', '重要なエラー'];
    const mediumKeywords = ['エラー', '警告', 'warning', '異常'];

    const lowerAnalysis = analysis.toLowerCase();

    if (criticalKeywords.some(keyword => lowerAnalysis.includes(keyword.toLowerCase()))) {
      return 'critical';
    }
    if (highKeywords.some(keyword => lowerAnalysis.includes(keyword.toLowerCase()))) {
      return 'high';
    }
    if (mediumKeywords.some(keyword => lowerAnalysis.includes(keyword.toLowerCase()))) {
      return 'medium';
    }

    return 'low';
  }

  private extractRecommendations(analysis: string): string[] {
    const recommendationPatterns = [
      /推奨[：:]?\s*(.+?)(?=\n|$)/gi,
      /解決策[：:]?\s*(.+?)(?=\n|$)/gi,
      /対策[：:]?\s*(.+?)(?=\n|$)/gi,
      /次の手順[：:]?\s*(.+?)(?=\n|$)/gi
    ];

    const recommendations: string[] = [];
    recommendationPatterns.forEach(pattern => {
      const matches = analysis.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) recommendations.push(match[1].trim());
      }
    });

    return recommendations;
  }
}

interface ITScreenshotAnalysis {
  analysis: string;
  errorMessages: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  confidence: number;
}
```

## 🔒 AI-Powered Security Scanning

### Code Security Analysis
```typescript
// AI-powered security vulnerability detection
export class AISecurityScanner {
  private wallBounceAnalyzer: WallBounceAnalyzer;

  constructor(wallBounceAnalyzer: WallBounceAnalyzer) {
    this.wallBounceAnalyzer = wallBounceAnalyzer;
  }

  async scanCodeForVulnerabilities(code: string, language: string): Promise<SecurityScanResult> {
    const securityPrompt = `
      以下の${language}コードをセキュリティ脆弱性の観点から分析してください:

      1. SQLインジェクション
      2. XSS (Cross-Site Scripting)
      3. CSRF (Cross-Site Request Forgery)
      4. 認証・認可の問題
      5. 機密情報の漏洩リスク
      6. 入力値検証の不備
      7. セキュアでない暗号化

      コード:
      \`\`\`${language}
      ${code}
      \`\`\`

      各脆弱性について、リスクレベル（高・中・低）と具体的な修正提案を提供してください。
    `;

    const analysis = await this.wallBounceAnalyzer.executeWallBounce(
      securityPrompt,
      'critical', // Use highest quality for security analysis
      {
        minProviders: 3,
        maxProviders: 4,
        confidenceThreshold: 0.9,
        requireConsensus: true
      }
    );

    return this.parseSecurityAnalysis(analysis.consensus.content, code, language);
  }

  async scanConfigForSecrets(configContent: string, filename: string): Promise<SecretScanResult> {
    // Pattern-based secret detection
    const secretPatterns = {
      api_key: /(?:api[_-]?key|apikey)[\s]*[:=][\s]*['""]?([a-zA-Z0-9_\-]{16,})['""]?/gi,
      jwt_token: /(?:jwt|token)[\s]*[:=][\s]*['""]?(eyJ[a-zA-Z0-9_\-\.]+)['""]?/gi,
      password: /(?:password|passwd|pwd)[\s]*[:=][\s]*['""]?([^'""\\s]{8,})['""]?/gi,
      database_url: /(?:database[_-]?url|db[_-]?url)[\s]*[:=][\s]*['""]?([^'""\\s]+)['""]?/gi,
      private_key: /(-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----)/gi
    };

    const detectedSecrets: DetectedSecret[] = [];

    Object.entries(secretPatterns).forEach(([type, pattern]) => {
      const matches = configContent.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          detectedSecrets.push({
            type,
            value: match[1],
            line: this.getLineNumber(configContent, match.index || 0),
            severity: this.getSecretSeverity(type),
            recommendation: this.getSecretRecommendation(type)
          });
        }
      }
    });

    // AI-powered validation for potential false positives
    if (detectedSecrets.length > 0) {
      const validationPrompt = `
        以下のファイル「${filename}」で検出された潜在的な機密情報を分析してください:

        ${detectedSecrets.map(secret =>
          `- ${secret.type}: ${secret.value.substring(0, 10)}... (行 ${secret.line})`
        ).join('\n')}

        それぞれについて、実際の機密情報かどうか、偽陽性の可能性、リスクレベルを評価してください。
      `;

      const aiValidation = await this.wallBounceAnalyzer.executeWallBounce(
        validationPrompt,
        'premium'
      );

      return {
        filename,
        detectedSecrets,
        aiValidation: aiValidation.consensus.content,
        recommendation: this.generateSecretScanRecommendation(detectedSecrets)
      };
    }

    return {
      filename,
      detectedSecrets: [],
      aiValidation: '機密情報は検出されませんでした。',
      recommendation: 'ファイルはセキュリティチェックに合格しました。'
    };
  }

  private parseSecurityAnalysis(analysis: string, code: string, language: string): SecurityScanResult {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Parse AI analysis for structured vulnerabilities
    const vulnerabilityTypes = [
      'SQLインジェクション', 'XSS', 'CSRF', '認証', '認可',
      '機密情報漏洩', '入力値検証', '暗号化'
    ];

    vulnerabilityTypes.forEach(type => {
      const typeRegex = new RegExp(`${type}[：:]?([\\s\\S]*?)(?=(?:${vulnerabilityTypes.join('|')})|$)`, 'i');
      const match = analysis.match(typeRegex);

      if (match && match[1] && match[1].includes('リスク')) {
        const severity = this.extractSeverity(match[1]);
        const description = this.extractDescription(match[1]);
        const recommendation = this.extractRecommendation(match[1]);

        if (severity !== 'none') {
          vulnerabilities.push({
            type,
            severity,
            description,
            recommendation,
            lineNumbers: this.findRelevantLines(code, type)
          });
        }
      }
    });

    return {
      language,
      totalVulnerabilities: vulnerabilities.length,
      highRiskCount: vulnerabilities.filter(v => v.severity === 'high').length,
      mediumRiskCount: vulnerabilities.filter(v => v.severity === 'medium').length,
      lowRiskCount: vulnerabilities.filter(v => v.severity === 'low').length,
      vulnerabilities,
      overallRisk: this.calculateOverallRisk(vulnerabilities),
      recommendation: this.generateOverallRecommendation(vulnerabilities)
    };
  }

  private getSecretSeverity(secretType: string): 'high' | 'medium' | 'low' {
    const highRisk = ['api_key', 'private_key', 'jwt_token'];
    const mediumRisk = ['database_url', 'password'];

    if (highRisk.includes(secretType)) return 'high';
    if (mediumRisk.includes(secretType)) return 'medium';
    return 'low';
  }

  private getSecretRecommendation(secretType: string): string {
    const recommendations = {
      api_key: '環境変数やシークレット管理サービス（AWS Secrets Manager等）を使用してください。',
      jwt_token: 'JWTトークンは環境変数で管理し、適切な有効期限を設定してください。',
      password: 'パスワードは暗号化して保存し、プレーンテキストでの保存を避けてください。',
      database_url: 'データベース接続情報は環境変数やVaultで管理してください。',
      private_key: '秘密鍵はセキュアなキーストアで管理し、適切な権限設定を行ってください。'
    };

    return recommendations[secretType as keyof typeof recommendations] ||
           '機密情報は適切なシークレット管理システムで保護してください。';
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private extractSeverity(text: string): 'high' | 'medium' | 'low' | 'none' {
    if (/高[リスク|危険]|critical|high/i.test(text)) return 'high';
    if (/中[リスク|危険]|medium/i.test(text)) return 'medium';
    if (/低[リスク|危険]|low/i.test(text)) return 'low';
    if (/なし|無し|問題なし|no risk/i.test(text)) return 'none';
    return 'low'; // Default
  }

  private extractDescription(text: string): string {
    const descMatch = text.match(/説明[：:]?\s*(.+?)(?=推奨|対策|$)/s);
    return descMatch ? descMatch[1].trim() : text.substring(0, 200) + '...';
  }

  private extractRecommendation(text: string): string {
    const recMatch = text.match(/(?:推奨|対策|修正)[：:]?\s*(.+?)$/s);
    return recMatch ? recMatch[1].trim() : '詳細な対策については開発チームと相談してください。';
  }

  private findRelevantLines(code: string, vulnerabilityType: string): number[] {
    const lines: number[] = [];
    const codeLines = code.split('\n');

    // Simple heuristics for finding relevant lines
    const patterns = {
      'SQLインジェクション': /(?:query|sql|SELECT|INSERT|UPDATE|DELETE)/i,
      'XSS': /(?:innerHTML|document\.write|eval)/i,
      'CSRF': /(?:form|POST|PUT|DELETE)/i,
      '認証': /(?:auth|login|password|token)/i,
      '暗号化': /(?:encrypt|decrypt|hash|md5|sha1)/i
    };

    const pattern = patterns[vulnerabilityType as keyof typeof patterns];
    if (pattern) {
      codeLines.forEach((line, index) => {
        if (pattern.test(line)) {
          lines.push(index + 1);
        }
      });
    }

    return lines;
  }

  private calculateOverallRisk(vulnerabilities: SecurityVulnerability[]): 'critical' | 'high' | 'medium' | 'low' {
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length;

    if (highCount >= 3) return 'critical';
    if (highCount >= 1) return 'high';
    if (mediumCount >= 3) return 'high';
    if (mediumCount >= 1) return 'medium';
    return 'low';
  }

  private generateOverallRecommendation(vulnerabilities: SecurityVulnerability[]): string {
    if (vulnerabilities.length === 0) {
      return 'コードにセキュリティ上の問題は検出されませんでした。';
    }

    const highRiskCount = vulnerabilities.filter(v => v.severity === 'high').length;

    if (highRiskCount > 0) {
      return `${highRiskCount}個の高リスク脆弱性が検出されました。直ちに修正することを強く推奨します。`;
    } else {
      return '中・低リスクの脆弱性が検出されました。計画的な修正を推奨します。';
    }
  }

  private generateSecretScanRecommendation(secrets: DetectedSecret[]): string {
    const highRiskCount = secrets.filter(s => s.severity === 'high').length;

    if (highRiskCount > 0) {
      return `${highRiskCount}個の高リスク機密情報が検出されました。直ちに環境変数やシークレット管理システムに移行してください。`;
    } else {
      return '機密情報が検出されました。セキュリティベストプラクティスに従って保護してください。';
    }
  }
}

// Type definitions
interface SecurityVulnerability {
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  lineNumbers: number[];
}

interface SecurityScanResult {
  language: string;
  totalVulnerabilities: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  vulnerabilities: SecurityVulnerability[];
  overallRisk: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

interface DetectedSecret {
  type: string;
  value: string;
  line: number;
  severity: 'high' | 'medium' | 'low';
  recommendation: string;
}

interface SecretScanResult {
  filename: string;
  detectedSecrets: DetectedSecret[];
  aiValidation: string;
  recommendation: string;
}
```

## 🚀 Fine-tuning Integration

### Custom Model Training for IT Support
```typescript
// Fine-tuning service for domain-specific models
export class ITSupportFineTuningService {
  private openai: OpenAI;
  private trainingDataStore: Redis;

  constructor(openai: OpenAI, redis: Redis) {
    this.openai = openai;
    this.trainingDataStore = redis;
  }

  async collectTrainingData(interactions: ITSupportInteraction[]): Promise<void> {
    const trainingExamples = interactions
      .filter(interaction => interaction.resolved && interaction.quality_score >= 4.0)
      .map(interaction => this.formatTrainingExample(interaction));

    // Store training data for batch processing
    for (const example of trainingExamples) {
      await this.trainingDataStore.lpush(
        'fine_tuning:training_data',
        JSON.stringify(example)
      );
    }

    logger.info(`Collected ${trainingExamples.length} training examples`);
  }

  async createFineTuningJob(purpose: FineTuningPurpose): Promise<string> {
    // Retrieve training data
    const trainingData = await this.getTrainingData(purpose);

    if (trainingData.length < 100) {
      throw new Error(`Insufficient training data: ${trainingData.length} examples (minimum 100 required)`);
    }

    // Create training file
    const trainingFile = await this.openai.files.create({
      file: Buffer.from(trainingData.map(d => JSON.stringify(d)).join('\n')),
      purpose: 'fine-tune'
    });

    // Start fine-tuning job
    const fineTuningJob = await this.openai.fineTuning.jobs.create({
      training_file: trainingFile.id,
      model: 'gpt-5', // Base model - as per project requirements
      suffix: `techsapo-${purpose}`,
      hyperparameters: {
        n_epochs: 3,
        batch_size: 1,
        learning_rate_multiplier: 0.1
      }
    });

    // Store job information
    await this.trainingDataStore.hset(
      'fine_tuning:jobs',
      fineTuningJob.id,
      JSON.stringify({
        purpose,
        status: 'queued',
        created_at: new Date().toISOString(),
        training_examples: trainingData.length
      })
    );

    return fineTuningJob.id;
  }

  async monitorFineTuningJob(jobId: string): Promise<FineTuningStatus> {
    const job = await this.openai.fineTuning.jobs.retrieve(jobId);

    // Update status in Redis
    await this.trainingDataStore.hset(
      'fine_tuning:jobs',
      jobId,
      JSON.stringify({
        ...JSON.parse(await this.trainingDataStore.hget('fine_tuning:jobs', jobId) || '{}'),
        status: job.status,
        finished_at: job.finished_at ? new Date(job.finished_at * 1000).toISOString() : null,
        fine_tuned_model: job.fine_tuned_model
      })
    );

    return {
      id: job.id,
      status: job.status as 'queued' | 'running' | 'succeeded' | 'failed',
      progress: this.calculateProgress(job),
      model_name: job.fine_tuned_model,
      estimated_completion: job.estimated_finish ? new Date(job.estimated_finish * 1000) : null
    };
  }

  private formatTrainingExample(interaction: ITSupportInteraction): FineTuningExample {
    return {
      messages: [
        {
          role: 'system',
          content: `あなたは日本語IT支援の専門家です。技術的問題を分析し、明確で実行可能な解決策を提供してください。

          専門分野:
          - システム管理とインフラ
          - ネットワークトラブルシューティング
          - データベース問題
          - アプリケーションエラー分析
          - セキュリティインシデント対応`
        },
        {
          role: 'user',
          content: interaction.user_query
        },
        {
          role: 'assistant',
          content: interaction.resolved_solution
        }
      ]
    };
  }

  private async getTrainingData(purpose: FineTuningPurpose): Promise<FineTuningExample[]> {
    const allData = await this.trainingDataStore.lrange('fine_tuning:training_data', 0, -1);
    const parsedData = allData.map(data => JSON.parse(data) as FineTuningExample);

    // Filter by purpose
    switch (purpose) {
      case 'log_analysis':
        return parsedData.filter(example =>
          example.messages.some(msg =>
            /ログ|log|エラー|error|障害/.test(msg.content.toLowerCase())
          )
        );
      case 'network_troubleshooting':
        return parsedData.filter(example =>
          example.messages.some(msg =>
            /ネットワーク|network|接続|connection|通信/.test(msg.content.toLowerCase())
          )
        );
      case 'security_analysis':
        return parsedData.filter(example =>
          example.messages.some(msg =>
            /セキュリティ|security|攻撃|脆弱性|vulnerability/.test(msg.content.toLowerCase())
          )
        );
      default:
        return parsedData;
    }
  }

  private calculateProgress(job: any): number {
    if (job.status === 'succeeded') return 100;
    if (job.status === 'failed') return 0;
    if (job.status === 'queued') return 0;

    // Rough estimation based on events
    const events = job.events || [];
    return Math.min(95, events.length * 10);
  }
}

// Type definitions
interface ITSupportInteraction {
  id: string;
  user_query: string;
  resolved_solution: string;
  resolved: boolean;
  quality_score: number; // 1-5 rating
  category: string;
  timestamp: string;
}

interface FineTuningExample {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}

interface FineTuningStatus {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  progress: number;
  model_name: string | null;
  estimated_completion: Date | null;
}

type FineTuningPurpose = 'log_analysis' | 'network_troubleshooting' | 'security_analysis' | 'general_support';
```

## 🎯 Integration with Existing TechSapo Systems

### Enhanced Wall-Bounce with Cookbook Techniques
```typescript
// Enhanced wall-bounce analyzer with cookbook integration
export class CookbookEnhancedWallBounceAnalyzer extends WallBounceAnalyzer {
  private contextManager: ContextManager;
  private conversationMemory: ConversationMemoryManager;
  private securityScanner: AISecurityScanner;
  private multimodalAnalyzer: MultimodalITAnalyzer;

  constructor() {
    super();
    this.contextManager = new ContextManager();
    this.conversationMemory = new ConversationMemoryManager(getRedisService());
    this.securityScanner = new AISecurityScanner(this);
    this.multimodalAnalyzer = new MultimodalITAnalyzer(openai);
  }

  async executeEnhancedWallBounce(
    query: string,
    taskType: TaskType,
    options: EnhancedWallBounceOptions = {}
  ): Promise<EnhancedWallBounceResult> {
    // Context management for long conversations
    let processedQuery = query;
    if (options.sessionId) {
      const conversationContext = await this.conversationMemory.getConversation(options.sessionId);
      if (conversationContext.length > 5) {
        const trimmedContext = await this.contextManager.trimContext(conversationContext);
        const contextSummary = trimmedContext
          .filter(msg => msg.role === 'assistant' && msg.content.includes('[Context Summary]'))
          .map(msg => msg.content)
          .join('\n');

        processedQuery = `${contextSummary}\n\n現在の質問: ${query}`;
      }
    }

    // Enhanced analysis with multimodal support
    let multimodalAnalysis: ITScreenshotAnalysis | undefined;
    if (options.imageBuffer) {
      multimodalAnalysis = await this.multimodalAnalyzer.analyzeScreenshot(
        options.imageBuffer,
        processedQuery
      );
      processedQuery += `\n\n画像解析結果:\n${multimodalAnalysis.analysis}`;
    }

    // Security scanning if code is provided
    let securityAnalysis: SecurityScanResult | undefined;
    if (options.codeContent && options.language) {
      securityAnalysis = await this.securityScanner.scanCodeForVulnerabilities(
        options.codeContent,
        options.language
      );

      if (securityAnalysis.totalVulnerabilities > 0) {
        processedQuery += `\n\nセキュリティ分析結果:\n${securityAnalysis.recommendation}`;
      }
    }

    // Execute enhanced wall-bounce analysis
    const wallBounceResult = await super.executeWallBounce(
      processedQuery,
      taskType,
      {
        ...options,
        confidenceThreshold: options.confidenceThreshold || 0.8,
        requireConsensus: true
      }
    );

    // Store conversation if session provided
    if (options.sessionId) {
      await this.conversationMemory.storeConversation(options.sessionId, {
        role: 'user',
        content: query,
        timestamp: new Date().toISOString()
      });

      await this.conversationMemory.storeConversation(options.sessionId, {
        role: 'assistant',
        content: wallBounceResult.consensus.content,
        timestamp: new Date().toISOString(),
        metadata: {
          confidence: wallBounceResult.consensus.confidence,
          providers_used: wallBounceResult.debug.providers_used,
          has_multimodal: !!multimodalAnalysis,
          has_security_scan: !!securityAnalysis
        }
      });
    }

    return {
      ...wallBounceResult,
      enhancements: {
        multimodal_analysis: multimodalAnalysis,
        security_analysis: securityAnalysis,
        context_managed: !!options.sessionId,
        conversation_summary: options.sessionId ?
          await this.conversationMemory.getConversationSummary(options.sessionId) : undefined
      }
    };
  }
}

interface EnhancedWallBounceOptions extends WallBounceOptions {
  sessionId?: string;
  imageBuffer?: Buffer;
  codeContent?: string;
  language?: string;
}

interface EnhancedWallBounceResult extends WallBounceResult {
  enhancements: {
    multimodal_analysis?: ITScreenshotAnalysis;
    security_analysis?: SecurityScanResult;
    context_managed: boolean;
    conversation_summary?: ConversationSummary;
  };
}
```

## 📊 Integration Roadmap

### Phase 1: Core Context Management (Week 1-2)
- [ ] Implement ContextManager service
- [ ] Enhance ConversationMemoryManager
- [ ] Integrate with existing session management
- [ ] Add context trimming to wall-bounce analyzer

### Phase 2: Security Enhancement (Week 3-4)
- [ ] Implement AISecurityScanner
- [ ] Add secret detection capabilities
- [ ] Integrate security scanning into CI/CD pipeline
- [ ] Create security dashboard

### Phase 3: Multimodal Capabilities (Week 5-6)
- [ ] Implement MultimodalITAnalyzer
- [ ] Add screenshot analysis API endpoints
- [ ] Enhance error detection with vision
- [ ] Create multimodal UI components

### Phase 4: Fine-tuning Integration (Week 7-8)
- [ ] Implement ITSupportFineTuningService
- [ ] Create training data collection pipeline
- [ ] Set up model versioning and deployment
- [ ] Monitor fine-tuned model performance

### Phase 5: Full Integration (Week 9-10)
- [ ] Integrate all cookbook techniques with wall-bounce
- [ ] Comprehensive testing and quality assurance
- [ ] Performance optimization
- [ ] Documentation and training

## 🔧 Configuration Updates

### Environment Variables
```bash
# Context Management
CONTEXT_MAX_TOKENS=8000
CONTEXT_SUMMARY_TOKENS=1000
CONVERSATION_MEMORY_TTL=86400

# Multimodal Analysis
MULTIMODAL_ANALYSIS_ENABLED=true
MAX_IMAGE_SIZE_MB=10
SUPPORTED_IMAGE_FORMATS=png,jpg,jpeg,gif

# Security Scanning
SECURITY_SCANNING_ENABLED=true
SECRET_DETECTION_ENABLED=true
VULNERABILITY_THRESHOLD=medium

# Fine-tuning
FINE_TUNING_ENABLED=false
MIN_TRAINING_EXAMPLES=100
FINE_TUNING_BUDGET_LIMIT=100.00
```

### Monitoring Integration
```typescript
// Additional Prometheus metrics for cookbook features
const cookbookMetrics = {
  context_trimming_operations: new prometheus.Counter({
    name: 'techsapo_context_trimming_total',
    help: 'Number of context trimming operations performed'
  }),

  security_scans_performed: new prometheus.Counter({
    name: 'techsapo_security_scans_total',
    help: 'Number of security scans performed',
    labelNames: ['scan_type', 'result']
  }),

  multimodal_analyses: new prometheus.Counter({
    name: 'techsapo_multimodal_analyses_total',
    help: 'Number of multimodal analyses performed',
    labelNames: ['content_type']
  }),

  fine_tuning_jobs: new prometheus.Gauge({
    name: 'techsapo_fine_tuning_jobs_active',
    help: 'Number of active fine-tuning jobs'
  })
};
```

## 🎯 Success Metrics

### Quality Improvements
- **Context Retention**: 90%+ context relevance in long conversations
- **Security Detection**: 95%+ vulnerability detection accuracy
- **Multimodal Analysis**: 85%+ screenshot problem identification
- **Fine-tuned Performance**: 20%+ improvement in domain-specific responses

### Performance Targets
- **Context Trimming**: < 500ms processing time
- **Security Scanning**: < 2s for code analysis
- **Multimodal Analysis**: < 5s for screenshot analysis
- **Memory Overhead**: < 15% increase in base memory usage

This comprehensive integration brings OpenAI Cookbook's advanced techniques into TechSapo's architecture while maintaining compatibility with existing systems and requirements.