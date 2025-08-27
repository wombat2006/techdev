/**
 * IT Log Analysis Service - Enhanced Dynamic Analysis
 * systemd logs, application logs, and system error analysis with Context7 integration
 */
interface LogAnalysisRequest {
    user_command?: string;
    error_output: string;
    system_context?: string;
    log_type?: 'systemd' | 'application' | 'kernel' | 'nginx' | 'mysql' | 'general';
}
interface LogAnalysisResult {
    issue_identified: boolean;
    problem_category: string;
    root_cause: string;
    solution_steps: string[];
    related_services: string[];
    severity_level: 'low' | 'medium' | 'high' | 'critical';
    confidence_score: number;
    additional_checks: string[];
}
export declare class LogAnalyzer {
    /**
     * 🔄 UNIVERSAL MANDATORY WALL-BOUNCE ANALYSIS: Multi-LLM Collaborative Analysis
     * 【重要】すべてのログ分析において、難易度に関係なく複数LLMによる壁打ち分析を必須とする
     * 理由: Claude Codeは一時受付窓口であり、難易度を正確に判定できないため
     */
    static analyzeLogs(request: LogAnalysisRequest): Promise<LogAnalysisResult>;
    /**
     * Detect log type from content and command context
     */
    private static detectLogType;
    /**
     * Extract structured error context for dynamic analysis
     */
    private static extractErrorContext;
    /**
     * Classify error type for targeted analysis
     */
    private static classifyErrorType;
    /**
     * Generate dynamic solution using Context7 systemd knowledge and AI analysis
     */
    private static generateDynamicSolution;
    /**
     * 🔄 MANDATORY Multi-LLM Wall-Bounce Analysis
     * 複数のLLMモデルによる協調分析で根本原因を特定
     */
    private static performMandatoryWallBounceAnalysis;
    /**
     * 🎯 Phase 1: o3-high High-Precision Technical Analysis
     */
    private static performO3HighAnalysis;
    /**
     * 🎯 Phase 2: Gemini Environment-Dependency Analysis
     */
    private static performGeminiEnvironmentAnalysis;
    /**
     * 🎯 Phase 3: Integrated Analysis and Solution Prioritization
     */
    private static performIntegratedAnalysis;
    /**
     * 統合根本原因分析
     */
    private static integrateRootCauseAnalysis;
    /**
     * 解決策の優先順位付け
     */
    private static prioritizeSolutions;
    /**
     * 壁打ち分析の信頼度計算
     */
    private static calculateWallBounceConfidence;
    /**
     * 関連サービス抽出
     */
    private static extractRelatedServices;
    /**
     * 壁打ち分析に基づく深刻度判定
     */
    private static determineSeverityFromWallBounce;
    /**
     * Get systemd troubleshooting knowledge from Context7
     */
    private static getSystemdTroubleshootingKnowledge;
    /**
     * Perform comprehensive AI-powered analysis using Claude's native capabilities
     */
    private static performAIAnalysis;
    /**
     * Comprehensive analysis using Claude's full analytical capabilities
     */
    private static performComprehensiveAnalysis;
    /**
     * Dynamic analysis for permission errors
     */
    private static analyzePermissionError;
    /**
     * Dynamic analysis for core dump errors
     */
    private static analyzeCoreError;
    /**
     * Dynamic analysis for connection errors
     */
    private static analyzeConnectionError;
    /**
     * Dynamic analysis for startup failures
     */
    private static analyzeStartupError;
    /**
     * Dynamic analysis for general errors
     */
    private static analyzeGeneralError;
    /**
     * Analyze systemd service logs with dynamic Context7 knowledge integration
     */
    private static analyzeSystemdLogs;
    /**
     * Analyze nginx logs
     */
    private static analyzeNginxLogs;
    /**
     * Analyze MySQL/MariaDB logs
     */
    private static analyzeMysqlLogs;
    /**
     * Analyze kernel logs
     */
    private static analyzeKernelLogs;
    /**
     * Analyze application logs
     */
    private static analyzeApplicationLogs;
    /**
     * Analyze general logs
     */
    private static analyzeGeneralLogs;
}
export {};
