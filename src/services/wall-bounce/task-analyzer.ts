/**
 * Wall-Bounce Task Analyzer
 * タスクタイプ検出とコーディングタスク判定
 *
 * Note: 実際のタスク別分析メソッドは将来の拡張として
 * 現時点では基本的な検出機能のみ実装
 */

import type {
  IWallBounceTaskAnalyzer,
  TaskType,
  ExecuteOptions,
  WallBounceResult
} from './types';
import { logger } from '../../utils/logger';

export class WallBounceTaskAnalyzer implements IWallBounceTaskAnalyzer {
  /**
   * タスクタイプを検出
   */
  detectTaskType(prompt: string): TaskType {
    const lower = prompt.toLowerCase();

    // Architecture keywords
    if (lower.match(/architect|design pattern|system design|structure|component/)) {
      logger.debug('🏗️ Detected task type: architecture');
      return 'architecture';
    }

    // Code review keywords
    if (lower.match(/review|refactor|improve|quality|best practice/)) {
      logger.debug('🔍 Detected task type: code-review');
      return 'code-review';
    }

    // Implementation keywords
    if (lower.match(/implement|create|build|develop|write code/)) {
      logger.debug('⚙️ Detected task type: implementation');
      return 'implementation';
    }

    // Security keywords
    if (lower.match(/security|vulnerability|exploit|auth|permission/)) {
      logger.debug('🔒 Detected task type: security');
      return 'security';
    }

    // Optimization keywords
    if (lower.match(/optim|performance|speed|efficiency|latency/)) {
      logger.debug('⚡ Detected task type: optimization');
      return 'optimization';
    }

    // Integration keywords
    if (lower.match(/integrat|connect|api|webhook|sync/)) {
      logger.debug('🔗 Detected task type: integration');
      return 'integration';
    }

    logger.debug('📝 Detected task type: general');
    return 'general';
  }

  /**
   * コーディングタスクか判定
   */
  isCodingTask(prompt: string): boolean {
    const codingIndicators: RegExp[] = [
      // Code blocks
      /```/m,
      
      // Programming keywords (expanded)
      /\b(import|export|class|interface|function|const|let|var|async|await|return|=>)\b/,
      /\b(def|lambda|yield|with|try|except|catch|finally)\b/,
      /\b(public|private|protected|static|abstract|extends|implements)\b/,
      
      // Languages and frameworks
      /TypeScript|JavaScript|Python|Go|Rust|Java|C\+\+|Node\.js|Deno|Bun/i,
      /React|Next\.js|Vue|Angular|Svelte|Express|FastAPI|Django/i,
      
      // Configuration files
      /package\.json|tsconfig\.json|pyproject\.toml|Cargo\.toml|go\.mod/i,
      /\.env|Dockerfile|docker-compose|webpack|vite|rollup/i,
      
      // Development actions (expanded)
      /\b(refactor|implement|debug|fix|code|write|create|build|develop)\b/i,
      /\b(optimize|test|deploy|setup|configure|install|compile)\b/i,
      
      // Code-related terms
      /\b(API|endpoint|route|handler|middleware|component|hook)\b/i,
      /\b(bug|error|exception|crash|issue|problem)\b/i,
      /\b(algorithm|logic|performance|memory|async|concurrent)\b/i,
      
      // File extensions
      /\.(ts|tsx|js|jsx|py|go|rs|java|cpp|c|h|vue|svelte)(\s|$)/,
      
      // Common commands
      /npm (install|run|test|build)|yarn|pnpm|pip install|cargo/i,
      /git (commit|push|pull|merge|clone)|github|gitlab/i
    ];

    const isCoding = codingIndicators.some(pattern => pattern.test(prompt));

    if (isCoding) {
      logger.debug('💻 Detected coding task');
    }

    return isCoding;
  }

  /**
   * タスク別分析を実行
   *
   * Note: 現時点では簡易分析のみ。
   * 将来的には各タスクタイプ専用の詳細分析を実装予定
   */
  async analyzeByTaskType(
    prompt: string,
    taskType: TaskType,
    options: ExecuteOptions
  ): Promise<WallBounceResult> {
    logger.info(`🎯 Analyzing by task type: ${taskType}`, {
      taskType,
      promptLength: prompt.length,
      taskLevel: options.taskType || 'basic'
    });

    // 簡易分析結果を返す
    // 実際の詳細分析は外部のwall-bounce実行で行う
    const analysisDepth = options.taskType === 'critical' ? 'deep' : 'balanced';

    const analysis = this.generateSimpleAnalysis(prompt, taskType, analysisDepth);

    // 簡易的なWallBounceResult形式で返す
    return {
      final_answer: analysis,
      consensus_score: 0.8,
      quality_score: 0.85,
      providers_used: ['task-analyzer-internal'],
      responses: [{
        provider: 'task-analyzer-internal',
        content: analysis,
        confidence: 0.85
      }],
      consensus: {
        content: analysis,
        confidence: 0.85,
        reasoning: `Task-specific analysis for ${taskType} (${analysisDepth} mode)`
      },
      llm_votes: [{
        provider: 'task-analyzer-internal',
        model: 'task-analyzer',
        response: {
          content: analysis,
          text: analysis,
          confidence: 0.85,
          reasoning: `${taskType} analysis`,
          cost: 0,
          tokens: { input: 100, output: 200 }
        },
        agreement_score: 0.85
      }],
      total_cost: 0,
      processing_time_ms: 50,
      debug: {
        wall_bounce_verified: false,
        providers_used: ['task-analyzer-internal'],
        tier_escalated: false
      }
    };
  }

  /**
   * 簡易分析を生成
   */
  private generateSimpleAnalysis(
    prompt: string,
    taskType: TaskType,
    depth: 'balanced' | 'deep'
  ): string {
    const prefix = depth === 'deep'
      ? `# Detailed ${taskType} Analysis\n\n`
      : `# ${taskType} Analysis\n\n`;

    const taskGuidance: Record<TaskType, string> = {
      'architecture': 'Focus on system design, component structure, and design patterns.',
      'code-review': 'Review code quality, best practices, and potential improvements.',
      'implementation': 'Provide implementation approach, code examples, and step-by-step guidance.',
      'security': 'Analyze security implications, vulnerabilities, and mitigation strategies.',
      'optimization': 'Identify performance bottlenecks and optimization opportunities.',
      'integration': 'Plan integration approach, API design, and data synchronization.',
      'general': 'Provide comprehensive analysis across multiple dimensions.'
    };

    return `${prefix}Query: ${prompt}\n\nGuidance: ${taskGuidance[taskType]}\n\n` +
      `(This is a simplified analysis. For detailed analysis, use full wall-bounce execution.)`;
  }
}
