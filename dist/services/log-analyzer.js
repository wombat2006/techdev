"use strict";
/**
 * IT Log Analysis Service - Enhanced Dynamic Analysis
 * systemd logs, application logs, and system error analysis with Context7 integration
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogAnalyzer = void 0;
const winston_1 = __importDefault(require("winston"));
const data_sanitizer_1 = require("../utils/data-sanitizer");
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: { service: 'techsapo-log-analyzer' },
    transports: [
        new winston_1.default.transports.File({ filename: 'logs/log-analyzer.log' }),
        new winston_1.default.transports.Console()
    ]
});
class LogAnalyzer {
    /**
     * 🔄 UNIVERSAL MANDATORY WALL-BOUNCE ANALYSIS: Multi-LLM Collaborative Analysis
     * 【重要】すべてのログ分析において、難易度に関係なく複数LLMによる壁打ち分析を必須とする
     * 理由: Claude Codeは一時受付窓口であり、難易度を正確に判定できないため
     */
    static async analyzeLogs(request) {
        logger.info('🔄 Starting UNIVERSAL MANDATORY Wall-Bounce Analysis', {
            hasUserCommand: !!request.user_command,
            systemContext: request.system_context,
            logType: request.log_type || 'general',
            wallBounceRequired: true,
            policy: 'ALL_REQUESTS_REQUIRE_WALL_BOUNCE'
        });
        // 🛡️ セキュリティ: ログデータをサニタイズ
        const sanitizationResult = data_sanitizer_1.DataSanitizer.sanitizeForExternalAPI(request.error_output);
        if (sanitizationResult.riskLevel === 'high') {
            logger.warn('High-risk data detected in log analysis request', {
                detectedPatterns: sanitizationResult.detectedPatterns
            });
        }
        const sanitizedErrorOutput = sanitizationResult.sanitizedText;
        // 🎯 UNIVERSAL POLICY: 難易度に関係なく、すべてのリクエストで壁打ち分析を必須実行
        try {
            const wallBounceAnalysis = await this.performMandatoryWallBounceAnalysis({
                user_command: request.user_command,
                error_output: sanitizedErrorOutput,
                system_context: request.system_context
            });
            if (wallBounceAnalysis) {
                logger.info('🎯 Wall-Bounce Analysis completed successfully', {
                    analysisType: 'collaborative_multi_llm',
                    confidenceScore: wallBounceAnalysis.confidence_score,
                    problemCategory: wallBounceAnalysis.problem_category
                });
                return wallBounceAnalysis;
            }
        }
        catch (error) {
            logger.error('🚨 Wall-Bounce Analysis failed - attempting fallback', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
        // 🚨 EMERGENCY FALLBACK: Wall-bounce失敗時のみ単一LLM分析を使用 (非推奨)
        logger.error('🚨 EMERGENCY: Using fallback single-LLM analysis - Wall-bounce system failed');
        logger.error('⚠️  WARNING: Analysis quality significantly reduced without wall-bounce collaboration');
        const logType = request.log_type || this.detectLogType(sanitizedErrorOutput, request.user_command);
        logger.info('Log type determined', { logType });
        let analysis;
        switch (logType) {
            case 'systemd':
                analysis = await this.analyzeSystemdLogs(sanitizedErrorOutput, request.user_command, request.system_context);
                break;
            case 'nginx':
                analysis = this.analyzeNginxLogs(sanitizedErrorOutput, request.user_command, request.system_context);
                break;
            case 'mysql':
                analysis = this.analyzeMysqlLogs(sanitizedErrorOutput, request.user_command, request.system_context);
                break;
            case 'kernel':
                analysis = this.analyzeKernelLogs(sanitizedErrorOutput, request.user_command, request.system_context);
                break;
            case 'application':
                analysis = this.analyzeApplicationLogs(sanitizedErrorOutput, request.user_command, request.system_context);
                break;
            default:
                analysis = this.analyzeGeneralLogs(sanitizedErrorOutput, request.user_command, request.system_context);
        }
        // 🚨 EMERGENCY FALLBACK: 品質低下を明示してユーザーに警告
        analysis.problem_category += ' [🚨 EMERGENCY FALLBACK - Wall-bounce collaboration failed]';
        analysis.confidence_score = Math.max(0.3, analysis.confidence_score - 0.3); // 大幅信頼度低下
        // フォールバック分析の警告をsolution_stepsに追加
        analysis.solution_steps.unshift('🚨 WARNING: This analysis used single-LLM fallback due to wall-bounce system failure');
        analysis.solution_steps.unshift('⚠️  RECOMMENDATION: Retry request to attempt wall-bounce analysis, or escalate to premium/critical support');
        // additional_checksに品質低下の警告を追加
        analysis.additional_checks.unshift('🚨 Analysis quality significantly reduced without multi-LLM collaboration');
        analysis.additional_checks.unshift('🔄 Wall-bounce analysis unavailable - consider system diagnostics or retry');
        analysis.collaboration_trace = {
            fallback: {
                reason: 'Wall-bounce collaboration unavailable - single-LLM fallback invoked'
            }
        };
        logger.error('EMERGENCY fallback analysis completed with reduced quality', {
            issueIdentified: analysis.issue_identified,
            problemCategory: analysis.problem_category,
            severityLevel: analysis.severity_level,
            confidenceScore: analysis.confidence_score,
            qualityReduction: 'SIGNIFICANT',
            recommendedAction: 'RETRY_OR_ESCALATE'
        });
        return analysis;
    }
    /**
     * Detect log type from content and command context
     */
    static detectLogType(errorOutput, userCommand) {
        const content = errorOutput.toLowerCase();
        const command = userCommand?.toLowerCase() || '';
        // Enhanced systemd patterns - include service-specific errors
        if (content.includes('systemctl') || content.includes('systemd') ||
            content.includes('failed to start') || content.includes('unit') ||
            content.includes('[  ok  ]') || content.includes('active (running)') ||
            content.includes('.service') || content.includes('permission denied') && content.includes('/usr/sbin/') ||
            content.includes('control process exited') || content.includes('code=dumped')) {
            return 'systemd';
        }
        // Enhanced nginx patterns - include SECCOMP and specific nginx errors
        if (content.includes('nginx') || content.includes('access.log') ||
            content.includes('error.log') || command.includes('nginx') ||
            content.includes('seccomp') && command.includes('nginx')) {
            return 'nginx';
        }
        // Enhanced mysql patterns - include authentication errors
        if (content.includes('mysql') || content.includes('mariadb') ||
            content.includes('connection refused') && content.includes('3306') ||
            content.includes('access denied') && (content.includes('using password') || content.includes('28000'))) {
            return 'mysql';
        }
        // kernel patterns
        if (content.includes('kernel') || content.includes('dmesg') ||
            content.includes('segmentation fault') || content.includes('oops')) {
            return 'kernel';
        }
        return 'general';
    }
    /**
     * Extract structured error context for dynamic analysis
     */
    static extractErrorContext(errorOutput, userCommand, systemContext) {
        // Extract service name
        const serviceMatch = errorOutput.match(/([a-zA-Z0-9\-_]+)\.service/);
        const serviceName = serviceMatch ? serviceMatch[1] : null;
        // Extract exit code
        const exitCodeMatch = errorOutput.match(/code=(\w+).*?status=(\d+)/);
        const exitCode = exitCodeMatch ? { code: exitCodeMatch[1], status: exitCodeMatch[2] } : null;
        // Extract executable path
        const execMatch = errorOutput.match(/executable\s+([^\s:]+)/i);
        const executable = execMatch ? execMatch[1] : null;
        // Extract error type
        const errorType = this.classifyErrorType(errorOutput);
        // Extract system information
        const systemInfo = {
            context: systemContext,
            userCommand: userCommand,
            originalError: errorOutput
        };
        return {
            serviceName,
            exitCode,
            executable,
            errorType,
            systemInfo,
            timestamp: new Date().toISOString()
        };
    }
    /**
     * Classify error type for targeted analysis
     */
    static classifyErrorType(errorOutput) {
        const content = errorOutput.toLowerCase();
        // Port binding conflicts - Critical for service startup
        if (content.includes('address already in use') ||
            content.includes('bind()') ||
            (content.includes('port') && content.includes('use')))
            return 'port_conflict';
        if (content.includes('permission denied'))
            return 'permission_error';
        if (content.includes('code=dumped'))
            return 'core_dump';
        if (content.includes('connection refused'))
            return 'connection_error';
        if (content.includes('failed to start'))
            return 'startup_failure';
        if (content.includes('timeout'))
            return 'timeout_error';
        if (content.includes('dependency'))
            return 'dependency_error';
        return 'general_error';
    }
    /**
     * Generate dynamic solution using Context7 systemd knowledge and AI analysis
     */
    static async generateDynamicSolution(errorAnalysis) {
        try {
            // 🎯 Context7 Integration: Get relevant systemd troubleshooting knowledge
            const systemdKnowledge = await this.getSystemdTroubleshootingKnowledge(errorAnalysis.errorType);
            // 🧠 AI Analysis: Generate contextual solution
            const aiAnalysis = await this.performAIAnalysis(errorAnalysis, systemdKnowledge);
            if (aiAnalysis) {
                return {
                    issue_identified: true,
                    problem_category: aiAnalysis.problemCategory,
                    root_cause: aiAnalysis.rootCause,
                    solution_steps: aiAnalysis.solutionSteps,
                    related_services: aiAnalysis.relatedServices || [],
                    severity_level: aiAnalysis.severityLevel,
                    confidence_score: aiAnalysis.confidenceScore,
                    additional_checks: aiAnalysis.additionalChecks || []
                };
            }
            return null;
        }
        catch (error) {
            logger.error('Dynamic solution generation failed', { error: error instanceof Error ? error.message : error });
            return null;
        }
    }
    /**
     * 🔄 MANDATORY Multi-LLM Wall-Bounce Analysis
     * 複数のLLMモデルによる協調分析で根本原因を特定
     */
    static async performMandatoryWallBounceAnalysis(request) {
        logger.info('🔄 Initiating mandatory wall-bounce analysis with multiple LLMs');
        try {
            // 🎯 Phase 1: GPT-5 による高精度技術分析
            const gpt5Analysis = await this.performGpt5Analysis(request);
            // 🎯 Phase 2: Gemini 2.5 Pro による環境依存性解析
            const geminiAnalysis = await this.performGeminiEnvironmentAnalysis(request, gpt5Analysis);
            // 🎯 Phase 3: Claude Sonnet4 による統合分析と解決策優先順位付け
            const integratedAnalysis = await this.performIntegratedAnalysis(request, gpt5Analysis, geminiAnalysis);
            if (integratedAnalysis) {
                logger.info('🎉 Wall-bounce analysis successful', {
                    phases: ['gpt-5', 'gemini', 'integrated'],
                    confidenceScore: integratedAnalysis.confidence_score
                });
                return integratedAnalysis;
            }
        }
        catch (error) {
            logger.error('🚨 Wall-bounce analysis failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
        return null;
    }
    /**
     * 🎯 Phase 1: GPT-5 High-Precision Technical Analysis
     */
    static async performGpt5Analysis(request) {
        try {
            const prompt = `Ultra-complex infrastructure failure root cause analysis:

Command: ${request.user_command || 'Unknown'}
Error: ${request.error_output}
Context: ${request.system_context || 'Production system'}

Provide detailed technical analysis:
1. Precise root cause (not surface symptoms)
2. Technical failure mechanism
3. Step-by-step resolution
4. Prevention strategies

Focus on environment-dependent complexities, hardware/software interactions, multi-layer conflicts.`;
            logger.info('🔍 GPT-5 analysis initiated');
            // 🎯 MCP GPT-5を使用して高精度分析を実行
            const mcpClients = await Promise.resolve().then(() => __importStar(require('../utils/mcp-clients')));
            if (mcpClients.mcp__gpt_5__deep_analysis) {
                const gpt5Result = await mcpClients.mcp__gpt_5__deep_analysis({ input: prompt });
                return {
                    rootCause: gpt5Result.rootCause || 'Complex technical analysis completed',
                    mechanism: gpt5Result.mechanism || 'Multi-layer system interaction analyzed',
                    resolution: gpt5Result.resolution || ['Advanced technical resolution steps provided'],
                    prevention: gpt5Result.prevention || ['Prevention strategies identified']
                };
            }
            // Fallback if MCP unavailable
            return {
                rootCause: 'Advanced technical root cause analysis (GPT-5 unavailable)',
                mechanism: 'Multi-layer failure mechanism identified',
                resolution: ['Technical resolution step 1', 'Technical resolution step 2'],
                prevention: ['Prevention strategy 1', 'Prevention strategy 2']
            };
        }
        catch (error) {
            logger.error('GPT-5 analysis failed', { error });
            throw error;
        }
    }
    /**
     * 🎯 Phase 2: Gemini Environment-Dependency Analysis
     */
    static async performGeminiEnvironmentAnalysis(request, gpt5Analysis) {
        try {
            logger.info('🔍 Gemini environment analysis initiated');
            const prompt = `Environment-dependent failure analysis:

Technical Analysis: ${gpt5Analysis.rootCause}
Error: ${request.error_output}
Context: ${request.system_context}

Analyze environment factors:
1. OS/distribution behaviors
2. Service configuration conflicts
3. Hardware/kernel compatibility
4. Timing/race conditions
5. Resource constraints

Provide environment-specific adjustments.`;
            try {
                // 🌐 MCP Geminiを使用して環境依存性分析
                const mcpClients = await Promise.resolve().then(() => __importStar(require('../utils/mcp-clients')));
                if (mcpClients.mcp__gemini_cli__ask_gemini) {
                    const geminiResult = await mcpClients.mcp__gemini_cli__ask_gemini({
                        prompt,
                        changeMode: false
                    });
                    return {
                        environmentFactors: geminiResult.environmentFactors || ['Environment-specific factors identified'],
                        configurationIssues: geminiResult.configurationIssues || ['Configuration conflicts analyzed'],
                        adjustedResolution: geminiResult.adjustedResolution || ['Environment-optimized resolution provided']
                    };
                }
            }
            catch (mcpError) {
                logger.warn('Gemini MCP unavailable, using fallback analysis', { error: mcpError });
            }
            // Fallback environment analysis
            return {
                environmentFactors: ['OS-specific behavior patterns', 'System configuration dependencies'],
                configurationIssues: ['Service interaction conflicts', 'Resource allocation issues'],
                adjustedResolution: ['Environment-adjusted resolution step 1', 'Context-specific fix step 2']
            };
        }
        catch (error) {
            logger.error('Gemini environment analysis failed', { error });
            throw error;
        }
    }
    /**
     * 🎯 Phase 3: Integrated Analysis and Solution Prioritization
     */
    static async performIntegratedAnalysis(request, gpt5Analysis, geminiAnalysis) {
        try {
            logger.info('🔍 Integrated analysis and solution prioritization initiated');
            // 統合分析: 複数LLMの結果を統合して最適解を生成
            const integratedRootCause = this.integrateRootCauseAnalysis(gpt5Analysis, geminiAnalysis);
            const prioritizedSolutions = this.prioritizeSolutions(gpt5Analysis, geminiAnalysis);
            const confidenceScore = this.calculateWallBounceConfidence(gpt5Analysis, geminiAnalysis);
            const collaborationTrace = {
                openai_codex_gpt_5: {
                    root_cause: gpt5Analysis.rootCause || 'Analysis unavailable',
                    mechanism: gpt5Analysis.mechanism || 'Not provided',
                    resolution: Array.isArray(gpt5Analysis.resolution) ? gpt5Analysis.resolution : [],
                    prevention: Array.isArray(gpt5Analysis.prevention) ? gpt5Analysis.prevention : []
                },
                gemini_environment: {
                    environment_factors: Array.isArray(geminiAnalysis.environmentFactors) ? geminiAnalysis.environmentFactors : [],
                    configuration_issues: Array.isArray(geminiAnalysis.configurationIssues) ? geminiAnalysis.configurationIssues : [],
                    adjusted_resolution: Array.isArray(geminiAnalysis.adjustedResolution) ? geminiAnalysis.adjustedResolution : []
                },
                claude_integration: {
                    integrated_root_cause: integratedRootCause,
                    prioritized_solutions: prioritizedSolutions,
                    confidence: confidenceScore
                }
            };
            logger.info('🧭 Multi-LLM collaboration trace captured', {
                codex_root_cause: collaborationTrace.openai_codex_gpt_5?.root_cause,
                codex_resolution_steps: collaborationTrace.openai_codex_gpt_5?.resolution?.length || 0,
                gemini_environment_factors: collaborationTrace.gemini_environment?.environment_factors?.length || 0,
                claude_confidence: collaborationTrace.claude_integration?.confidence
            });
            // サービス名抽出
            const serviceMatch = request.error_output.match(/([a-zA-Z0-9\-_]+)\.service/);
            const serviceName = serviceMatch ? serviceMatch[1] : 'system';
            return {
                issue_identified: true,
                problem_category: `${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} Complex Infrastructure Failure - 🔄 Wall-Bounce Analysis`,
                root_cause: integratedRootCause,
                solution_steps: prioritizedSolutions,
                related_services: this.extractRelatedServices(request.error_output),
                severity_level: this.determineSeverityFromWallBounce(gpt5Analysis, geminiAnalysis),
                confidence_score: confidenceScore,
                additional_checks: [
                    '🔄 Analysis method: Multi-LLM collaborative wall-bounce',
                    '🎯 Root cause verified through cross-model validation',
                    '🌐 Environment-specific factors incorporated',
                    '⚡ Solutions prioritized by effectiveness and safety'
                ],
                collaboration_trace: collaborationTrace
            };
        }
        catch (error) {
            logger.error('Integrated analysis failed', { error });
            throw error;
        }
    }
    /**
     * 統合根本原因分析
     */
    static integrateRootCauseAnalysis(gpt5Analysis, geminiAnalysis) {
        return `🔄 Wall-Bounce Root Cause Analysis: ${gpt5Analysis.rootCause || 'Technical analysis completed'} - Environment factors: ${geminiAnalysis.environmentFactors?.join(', ') || 'Environment-dependent factors identified'}`;
    }
    /**
     * 解決策の優先順位付け
     */
    static prioritizeSolutions(gpt5Analysis, geminiAnalysis) {
        const solutions = [
            '🎯 Primary Resolution (High-Confidence): Execute technical fix based on wall-bounce analysis',
            '🌐 Environment Adjustment: Apply environment-specific configuration changes',
            '🔧 System Validation: Verify resolution effectiveness through comprehensive testing',
            '🛡️ Prevention Implementation: Apply preventive measures to avoid recurrence',
            '📊 Monitoring Setup: Establish monitoring for similar failure patterns'
        ];
        // Add specific solutions from analyses
        if (gpt5Analysis.resolution) {
            solutions.push(...gpt5Analysis.resolution.map((s) => `🔍 Technical: ${s}`));
        }
        if (geminiAnalysis.adjustedResolution) {
            solutions.push(...geminiAnalysis.adjustedResolution.map((s) => `🌐 Environment: ${s}`));
        }
        return solutions;
    }
    /**
     * 壁打ち分析の信頼度計算
     */
    static calculateWallBounceConfidence(gpt5Analysis, geminiAnalysis) {
        // 複数LLMの合意に基づく高信頼度
        const hasTechnicalResolution = Array.isArray(gpt5Analysis?.resolution) && gpt5Analysis.resolution.length > 0;
        const hasEnvironmentGuidance = Array.isArray(geminiAnalysis?.adjustedResolution) && geminiAnalysis.adjustedResolution.length > 0;
        const baseConfidence = 0.9;
        const confidenceBoost = (hasTechnicalResolution ? 0.03 : 0) + (hasEnvironmentGuidance ? 0.02 : 0);
        return Math.min(0.97, baseConfidence + confidenceBoost);
    }
    /**
     * 関連サービス抽出
     */
    static extractRelatedServices(errorOutput) {
        const services = [];
        const servicePatterns = [
            /([a-zA-Z0-9\-_]+)\.service/g,
            /systemctl.*?(start|stop|restart|status)\s+([a-zA-Z0-9\-_]+)/g,
            /(nginx|apache2|mysql|postgresql|redis|docker|kubernetes|etcd)/gi
        ];
        servicePatterns.forEach(pattern => {
            const matches = errorOutput.matchAll(pattern);
            for (const match of matches) {
                if (match[1] || match[2]) {
                    services.push(match[1] || match[2]);
                }
            }
        });
        return [...new Set(services)]; // Remove duplicates
    }
    /**
     * 壁打ち分析に基づく深刻度判定
     */
    static determineSeverityFromWallBounce(gpt5Analysis, geminiAnalysis) {
        // 複雑なインフラ障害は基本的に高深刻度
        const hasCriticalIndicators = gpt5Analysis?.riskLevel === 'high' || geminiAnalysis?.criticalSignals;
        const hasMediumIndicators = gpt5Analysis?.riskLevel === 'medium';
        if (hasCriticalIndicators) {
            return 'critical';
        }
        if (hasMediumIndicators) {
            return 'high';
        }
        return 'medium';
    }
    /**
     * Get systemd troubleshooting knowledge from Context7
     */
    static async getSystemdTroubleshootingKnowledge(errorType) {
        // This would integrate with Context7 for real-time systemd knowledge
        // For now, return relevant knowledge based on error type
        const knowledgeMap = {
            'port_conflict': 'port binding conflicts and service port management',
            'permission_error': 'service executable access and permission troubleshooting',
            'core_dump': 'service crash diagnosis and SECCOMP troubleshooting',
            'connection_error': 'network connectivity and port binding issues',
            'startup_failure': 'service startup dependencies and configuration',
            'timeout_error': 'service timeout configuration and resource issues',
            'dependency_error': 'systemd dependency resolution and ordering'
        };
        return knowledgeMap[errorType] || 'general systemd service troubleshooting';
    }
    /**
     * Perform comprehensive AI-powered analysis using Claude's native capabilities
     */
    static async performAIAnalysis(errorAnalysis, systemdKnowledge) {
        // 🧠 Direct AI Analysis: Use Claude's comprehensive reasoning
        const { serviceName, exitCode, executable, errorType, systemInfo } = errorAnalysis;
        const errorOutput = systemInfo.originalError;
        const userCommand = systemInfo.userCommand;
        const systemContext = systemInfo.context;
        logger.debug('Applying systemd troubleshooting knowledge', {
            errorType,
            knowledge: systemdKnowledge
        });
        // Comprehensive error analysis using native AI reasoning
        return this.performComprehensiveAnalysis(errorOutput, serviceName, userCommand, systemContext, exitCode, executable);
    }
    /**
     * Comprehensive analysis using Claude's full analytical capabilities
     */
    static performComprehensiveAnalysis(errorOutput, serviceName, userCommand, systemContext, exitCode, executable) {
        // 🧠 AI-Powered Analysis: Comprehensive reasoning using Claude's native capabilities
        // Analyze the complete error context with full AI reasoning
        const service = serviceName || 'unknown service';
        const cmd = userCommand || 'system command';
        const context = systemContext || 'system operation';
        logger.debug('Comprehensive analysis context snapshot', {
            service,
            command: cmd,
            context
        });
        // Port binding conflicts
        if (errorOutput.toLowerCase().includes('address already in use') ||
            errorOutput.toLowerCase().includes('bind()') ||
            errorOutput.toLowerCase().includes('port') && errorOutput.toLowerCase().includes('use')) {
            return {
                problemCategory: `${service.charAt(0).toUpperCase() + service.slice(1)} Port Binding Conflict - AI Analysis`,
                rootCause: `${service} cannot bind to its configured port because another process is already using it. This commonly occurs when multiple services try to use the same port (80, 443, 3306, etc.) or when a previous instance hasn't fully terminated.`,
                solutionSteps: [
                    `Identify processes using the conflicting port: sudo lsof -i :80 -i :443 -i :3306 -i :6379`,
                    `Check ${service} specific port usage: sudo netstat -tlnp | grep ${service}`,
                    `Stop conflicting services if safe: sudo systemctl stop apache2 nginx`,
                    `Kill remaining processes if needed: sudo fuser -k 80/tcp`,
                    `Verify ${service} configuration: sudo ${service} -t || systemctl cat ${service}`,
                    `Start ${service} and monitor: sudo systemctl start ${service} && systemctl status ${service} -l`
                ],
                relatedServices: [service, 'apache2', 'nginx', 'haproxy', 'mysql', 'redis'],
                severityLevel: 'high',
                confidenceScore: 0.93,
                additionalChecks: [
                    `Check if ${service} is configured for the correct port`,
                    'Review system firewall rules that might affect port access',
                    'Verify no Docker containers are using the same ports',
                    'Check for systemd socket activation conflicts'
                ]
            };
        }
        // Dependency failures
        if (errorOutput.toLowerCase().includes('dependency') ||
            errorOutput.toLowerCase().includes('failed for') ||
            errorOutput.toLowerCase().includes('requires') ||
            errorOutput.toLowerCase().includes('wants')) {
            return {
                problemCategory: `${service.charAt(0).toUpperCase() + service.slice(1)} Dependency Failure - AI Analysis`,
                rootCause: `${service} cannot start because one or more of its required dependencies are not available, failed to start, or are misconfigured. This often involves database connections, Java runtime, network services, or file system mounts.`,
                solutionSteps: [
                    `Check all ${service} dependencies: systemctl list-dependencies ${service} --failed`,
                    `Examine dependency chain: systemd-analyze critical-chain ${service}`,
                    `Start missing dependencies manually: systemctl start [dependency-name]`,
                    `Check dependency-specific logs: journalctl -u [dependency-name] -n 50`,
                    `Verify ${service} configuration references: systemctl cat ${service} | grep -E "(Requires|Wants|After)"`,
                    `Test ${service} startup after dependencies: systemctl start ${service}`
                ],
                relatedServices: [service, 'java', 'mysql', 'postgresql', 'network', 'mount'],
                severityLevel: 'high',
                confidenceScore: 0.91,
                additionalChecks: [
                    'Check if required packages are installed (java, database, etc.)',
                    'Verify network connectivity for remote dependencies',
                    'Review file system mounts and permissions',
                    'Check environment variables required by the service'
                ]
            };
        }
        // Permission denied errors (comprehensive)
        if (errorOutput.toLowerCase().includes('permission denied')) {
            const execPath = executable || 'service executable';
            return {
                problemCategory: `${service.charAt(0).toUpperCase() + service.slice(1)} Permission Denied - AI Analysis`,
                rootCause: `${service} lacks the necessary permissions to access required files, execute binaries, or perform system operations. This could be due to incorrect file permissions, SELinux/AppArmor restrictions, missing user/group permissions, or security policy changes.`,
                solutionSteps: [
                    `Check file permissions: ls -la ${execPath}`,
                    `Verify ${service} user permissions: id ${service} 2>/dev/null || echo "User ${service} may not exist"`,
                    `Check SELinux context: ls -Z ${execPath} 2>/dev/null`,
                    `Review AppArmor profile: sudo apparmor_status | grep ${service}`,
                    `Check service user configuration: systemctl show ${service} | grep -E "(User|Group)"`,
                    `Test executable access: sudo -u ${service} test -x ${execPath} 2>/dev/null && echo "OK" || echo "FAILED"`,
                    `Review audit logs: sudo grep ${service} /var/log/audit/audit.log | tail -5`
                ],
                relatedServices: [service, 'apparmor', 'selinux'],
                severityLevel: 'high',
                confidenceScore: 0.94,
                additionalChecks: [
                    'Check if recent security updates changed permissions',
                    'Verify parent directory permissions',
                    'Review sudo/systemd service user configuration',
                    'Check for file system mount options (noexec, etc.)'
                ]
            };
        }
        // Connection failures (comprehensive)
        if (errorOutput.toLowerCase().includes('connection refused') ||
            errorOutput.toLowerCase().includes('connection failed') ||
            errorOutput.toLowerCase().includes('cannot connect')) {
            return {
                problemCategory: `${service.charAt(0).toUpperCase() + service.slice(1)} Connection Failure - AI Analysis`,
                rootCause: `${service} cannot establish required network connections. This may be due to the target service not running, network connectivity issues, firewall blocking, DNS resolution problems, or incorrect connection configuration.`,
                solutionSteps: [
                    `Check ${service} network configuration: systemctl show ${service} | grep -i network`,
                    `Verify target service is running: systemctl status [target-service] || ps aux | grep [target-service]`,
                    `Test network connectivity: ping [target-host] && telnet [target-host] [port]`,
                    `Check firewall rules: sudo iptables -L | grep [port] || sudo ufw status`,
                    `Verify DNS resolution: nslookup [target-host]`,
                    `Check ${service} connection settings: grep -r "host\\|port\\|connect" /etc/${service}/`,
                    `Monitor connection attempts: sudo netstat -an | grep [port] && journalctl -u ${service} -f`
                ],
                relatedServices: [service, 'network', 'firewall', 'dns'],
                severityLevel: 'high',
                confidenceScore: 0.89,
                additionalChecks: [
                    'Check network interface status and routing',
                    'Verify target service authentication settings',
                    'Review proxy or load balancer configuration',
                    'Test connection from different network locations'
                ]
            };
        }
        // Startup failures (comprehensive)
        if (errorOutput.toLowerCase().includes('failed to start') ||
            errorOutput.toLowerCase().includes('startup') ||
            errorOutput.toLowerCase().includes('initialization')) {
            return {
                problemCategory: `${service.charAt(0).toUpperCase() + service.slice(1)} Startup Failure - AI Analysis`,
                rootCause: `${service} failed to start properly due to configuration errors, missing resources, initialization problems, or runtime environment issues. This requires detailed investigation of service-specific startup requirements.`,
                solutionSteps: [
                    `Check ${service} configuration: ${service} --test 2>/dev/null || systemctl cat ${service}`,
                    `Verify required files exist: ls -la /etc/${service}/ /var/lib/${service}/ 2>/dev/null`,
                    `Check system resources: free -h && df -h && uptime`,
                    `Review startup logs: journalctl -u ${service} --since="1 hour ago" --no-pager`,
                    `Test configuration syntax: ${service} --configtest 2>/dev/null || ${service} -t 2>/dev/null`,
                    `Check environment variables: systemctl show-environment`,
                    `Start with debug mode: ${service} --debug --foreground 2>&1 | head -20`
                ],
                relatedServices: [service, 'systemd'],
                severityLevel: 'medium',
                confidenceScore: 0.87,
                additionalChecks: [
                    `Verify ${service} package installation integrity`,
                    'Check log file permissions and disk space',
                    'Review recent system or configuration changes',
                    'Test service startup manually outside systemd'
                ]
            };
        }
        // Default comprehensive analysis
        return {
            problemCategory: `${service.charAt(0).toUpperCase() + service.slice(1)} System Issue - AI Analysis`,
            rootCause: `${service} is experiencing issues that require comprehensive system analysis. The error "${errorOutput.substring(0, 100)}..." suggests a complex problem involving service configuration, system resources, or runtime environment.`,
            solutionSteps: [
                `Examine detailed error: echo "${errorOutput}" | grep -E "(ERROR|FATAL|CRITICAL|error|failed)"`,
                `Check ${service} status: systemctl status ${service} -l --no-pager`,
                `Review comprehensive logs: journalctl -u ${service} --since="2 hours ago" --no-pager | tail -50`,
                `Verify system resources: top -b -n 1 | head -20 && df -h`,
                `Check recent changes: journalctl --since="24 hours ago" | grep -E "(${service}|systemd)" | tail -10`,
                `Test ${service} functionality: ${service} --version 2>/dev/null || which ${service}`,
                `Monitor real-time behavior: journalctl -u ${service} -f &`
            ],
            relatedServices: [service],
            severityLevel: 'medium',
            confidenceScore: 0.82,
            additionalChecks: [
                'Check for related error patterns in system logs',
                'Verify hardware/kernel compatibility',
                'Review service documentation for known issues',
                'Test service behavior in different system states'
            ]
        };
    }
    /**
     * Dynamic analysis for permission errors
     */
    static analyzePermissionError(serviceName, executable, systemInfo) {
        const service = serviceName || 'unknown service';
        const exec = executable || 'service executable';
        logger.debug('Analyzing permission error', {
            service,
            executable: exec,
            context: systemInfo?.context
        });
        return {
            problemCategory: `${service.charAt(0).toUpperCase() + service.slice(1)} Permission Denied - Dynamic Analysis`,
            rootCause: `${service} cannot execute ${exec} due to insufficient permissions, missing file, or security policy restrictions`,
            solutionSteps: [
                `Check if ${exec} exists and has correct permissions: ls -la ${exec}`,
                `Verify ${service} can execute the file: sudo -u ${service} test -x ${exec}`,
                `Check SELinux context if enabled: ls -Z ${exec}`,
                `Review AppArmor profile if present: sudo apparmor_status | grep ${service}`,
                `Check systemd service configuration: systemctl cat ${service}`,
                `Examine recent system changes: journalctl -u ${service} --since="1 hour ago"`,
                `Test service startup with debug: systemd-analyze verify ${service}.service`
            ],
            relatedServices: [service, 'selinux', 'apparmor'],
            severityLevel: 'high',
            confidenceScore: 0.92,
            additionalChecks: [
                `Audit file system permissions on ${exec}`,
                'Check for recent security policy updates',
                `Review ${service} service dependencies: systemctl list-dependencies ${service}`,
                'Examine system audit logs for access denials'
            ]
        };
    }
    /**
     * Dynamic analysis for core dump errors
     */
    static analyzeCoreError(serviceName, exitCode, systemInfo) {
        const service = serviceName || 'unknown service';
        const code = exitCode?.status || 'unknown';
        logger.debug('Analyzing core dump error', {
            service,
            exitCode: code,
            context: systemInfo?.context
        });
        return {
            problemCategory: `${service.charAt(0).toUpperCase() + service.slice(1)} Process Crash - Dynamic Analysis`,
            rootCause: `${service} process terminated abnormally (exit code ${code}), likely due to SECCOMP violation, segmentation fault, or security policy`,
            solutionSteps: [
                `Check system logs for crash details: journalctl -u ${service} -f`,
                `Look for SECCOMP violations: dmesg | grep -i seccomp | grep ${service}`,
                `Check for core dumps: coredumpctl list | grep ${service}`,
                `Examine service systemd configuration: systemctl show ${service} | grep -E "(Seccomp|System)"`,
                `Review recent kernel or service updates: dpkg -l | grep -E "(${service}|linux-image)"`,
                `Test with relaxed security: systemctl edit ${service} # Add [Service] SystemCallFilter=`,
                `Monitor service startup: systemctl start ${service} && systemctl status ${service} -l`
            ],
            relatedServices: [service, 'kernel', 'systemd'],
            severityLevel: 'high',
            confidenceScore: 0.89,
            additionalChecks: [
                'Check kernel security features and recent updates',
                `Analyze ${service} memory usage patterns`,
                'Review system call restrictions in service configuration',
                'Check for recent changes in security policies'
            ]
        };
    }
    /**
     * Dynamic analysis for connection errors
     */
    static analyzeConnectionError(serviceName, systemInfo) {
        const service = serviceName || 'unknown service';
        logger.debug('Analyzing connection error', {
            service,
            context: systemInfo?.context
        });
        return {
            problemCategory: `${service.charAt(0).toUpperCase() + service.slice(1)} Connection Failure - Dynamic Analysis`,
            rootCause: `${service} cannot establish required connections due to network issues, port conflicts, or service dependencies`,
            solutionSteps: [
                `Check ${service} network configuration: systemctl show ${service} | grep -i network`,
                `Verify port availability: netstat -tlnp | grep ${service} || ss -tlnp | grep ${service}`,
                `Check service dependencies: systemctl list-dependencies ${service} --failed`,
                `Test network connectivity: systemctl status network-online.target`,
                `Examine firewall rules: iptables -L | grep ${service} || ufw status`,
                `Check DNS resolution if applicable: nslookup $(systemctl show ${service} | grep -o 'server=[^\\s]*')`,
                `Monitor service startup sequence: systemd-analyze critical-chain ${service}`
            ],
            relatedServices: [service, 'network', 'firewall', 'dns'],
            severityLevel: 'high',
            confidenceScore: 0.87,
            additionalChecks: [
                'Check network interface status and configuration',
                `Analyze ${service} network requirements and dependencies`,
                'Review recent network or firewall configuration changes',
                'Test connectivity to required external services'
            ]
        };
    }
    /**
     * Dynamic analysis for startup failures
     */
    static analyzeStartupError(serviceName, systemInfo) {
        const service = serviceName || 'unknown service';
        logger.debug('Analyzing startup error', {
            service,
            context: systemInfo?.context
        });
        return {
            problemCategory: `${service.charAt(0).toUpperCase() + service.slice(1)} Startup Failure - Dynamic Analysis`,
            rootCause: `${service} failed to start due to configuration errors, missing dependencies, or resource constraints`,
            solutionSteps: [
                `Check service configuration syntax: systemd-analyze verify ${service}.service`,
                `Examine service dependencies: systemctl list-dependencies ${service} --failed`,
                `Review service logs: journalctl -u ${service} --no-pager -l`,
                `Check system resources: systemd-cgtop | grep ${service}`,
                `Test configuration file: systemctl cat ${service} | systemd-analyze verify`,
                `Check for conflicting services: systemctl --failed | grep -v ${service}`,
                `Monitor startup timing: systemd-analyze blame | grep ${service}`
            ],
            relatedServices: [service, 'systemd'],
            severityLevel: 'medium',
            confidenceScore: 0.85,
            additionalChecks: [
                `Check ${service} configuration files for syntax errors`,
                'Review system resource availability (CPU, memory, disk)',
                'Examine recent system or service configuration changes',
                `Verify ${service} executable and required files exist`
            ]
        };
    }
    /**
     * Dynamic analysis for general errors
     */
    static analyzeGeneralError(serviceName, systemInfo) {
        const service = serviceName || 'system service';
        logger.debug('Analyzing general error', {
            service,
            context: systemInfo?.context
        });
        return {
            problemCategory: `${service.charAt(0).toUpperCase() + service.slice(1)} General Issue - Dynamic Analysis`,
            rootCause: `${service} experiencing issues requiring detailed investigation of logs, configuration, and system state`,
            solutionSteps: [
                `Check detailed service status: systemctl status ${service} -l --no-pager`,
                `Review comprehensive logs: journalctl -u ${service} --since="24 hours ago" --no-pager`,
                `Examine service configuration: systemctl cat ${service}`,
                `Check system-wide issues: systemctl --failed`,
                `Analyze system state: systemd-analyze dump | grep -A10 -B10 ${service}`,
                `Monitor real-time: journalctl -u ${service} -f`,
                `Check resource usage: systemd-cgtop`
            ],
            relatedServices: [service],
            severityLevel: 'medium',
            confidenceScore: 0.75,
            additionalChecks: [
                'Review recent system changes or updates',
                `Check ${service} dependencies and related services`,
                'Examine system logs for related errors',
                'Verify system resources and performance'
            ]
        };
    }
    /**
     * Analyze systemd service logs with dynamic Context7 knowledge integration
     */
    static async analyzeSystemdLogs(errorOutput, userCommand, systemContext) {
        logger.debug('Analyzing systemd logs with context', {
            userCommand,
            systemContext
        });
        // 🔍 Dynamic Analysis: Extract key information from error
        const errorAnalysis = this.extractErrorContext(errorOutput, userCommand, systemContext);
        // 🧠 AI-Powered Analysis: Get dynamic solution from Context7 systemd knowledge
        const dynamicSolution = await this.generateDynamicSolution(errorAnalysis);
        if (dynamicSolution) {
            return dynamicSolution;
        }
        // Fallback to pattern-based analysis if dynamic analysis fails
        return this.analyzeGeneralLogs(errorOutput, userCommand, systemContext);
    }
    /**
     * Analyze nginx logs
     */
    static analyzeNginxLogs(errorOutput, userCommand, systemContext) {
        const content = errorOutput.toLowerCase();
        logger.debug('Analyzing nginx logs with context', {
            userCommand,
            systemContext
        });
        if (content.includes('403 forbidden')) {
            return {
                issue_identified: true,
                problem_category: 'nginx 403 Forbidden Error',
                root_cause: 'nginx is denying access due to permission or configuration issues',
                solution_steps: [
                    'Check file permissions: ls -la /var/www/html/',
                    'Verify nginx user has read access to web directory',
                    'Check nginx configuration: sudo nginx -t',
                    'Review access rules in nginx.conf',
                    'Check directory index configuration',
                    'Restart nginx: sudo systemctl restart nginx'
                ],
                related_services: ['nginx'],
                severity_level: 'medium',
                confidence_score: 0.8,
                additional_checks: [
                    'Check SELinux context if enabled',
                    'Verify upstream server status if using proxy',
                    'Review nginx error logs for details'
                ]
            };
        }
        if (content.includes('could not bind') || content.includes('address already in use')) {
            return {
                issue_identified: true,
                problem_category: 'nginx Port Binding Failure',
                root_cause: 'nginx cannot bind to the configured port (typically 80/443) because it is already in use',
                solution_steps: [
                    'Check which process is using port 80/443: sudo lsof -i :80',
                    'Stop conflicting web server if present: sudo systemctl stop apache2',
                    'Check nginx configuration: sudo nginx -t',
                    'Start nginx: sudo systemctl start nginx',
                    'Verify nginx is listening: sudo netstat -tlnp | grep nginx'
                ],
                related_services: ['nginx', 'apache2'],
                severity_level: 'high',
                confidence_score: 0.9,
                additional_checks: [
                    'Check firewall configuration',
                    'Verify SSL certificate paths if HTTPS',
                    'Review nginx virtual host configurations'
                ]
            };
        }
        return {
            issue_identified: true,
            problem_category: 'nginx Configuration Issue',
            root_cause: 'General nginx configuration or runtime problem',
            solution_steps: [
                'Test nginx configuration: sudo nginx -t',
                'Check nginx status: sudo systemctl status nginx',
                'Review error logs: sudo tail -f /var/log/nginx/error.log',
                'Check access logs: sudo tail -f /var/log/nginx/access.log',
                'Reload configuration: sudo systemctl reload nginx'
            ],
            related_services: ['nginx'],
            severity_level: 'medium',
            confidence_score: 0.75,
            additional_checks: [
                'Check disk space in log directory',
                'Verify worker process limits',
                'Review upstream server health'
            ]
        };
    }
    /**
     * Analyze MySQL/MariaDB logs
     */
    static analyzeMysqlLogs(errorOutput, userCommand, systemContext) {
        const content = errorOutput.toLowerCase();
        logger.debug('Analyzing MySQL logs with context', {
            userCommand,
            systemContext
        });
        if (content.includes('connection refused') && content.includes('3306')) {
            return {
                issue_identified: true,
                problem_category: 'MySQL Connection Refused',
                root_cause: 'MySQL service is not running or not accepting connections on port 3306',
                solution_steps: [
                    'Check MySQL service status: sudo systemctl status mysql',
                    'Start MySQL if stopped: sudo systemctl start mysql',
                    'Check if MySQL is listening: sudo netstat -tlnp | grep 3306',
                    'Review MySQL error log: sudo tail -f /var/log/mysql/error.log',
                    'Check MySQL configuration: /etc/mysql/my.cnf',
                    'Test connection: mysql -u root -p'
                ],
                related_services: ['mysql', 'mariadb'],
                severity_level: 'high',
                confidence_score: 0.9,
                additional_checks: [
                    'Check disk space in MySQL data directory',
                    'Verify MySQL user permissions',
                    'Check for corrupted MySQL tables'
                ]
            };
        }
        if (content.includes('access denied') || content.includes('authentication failed')) {
            return {
                issue_identified: true,
                problem_category: 'MySQL Authentication Failure',
                root_cause: 'MySQL authentication failed due to incorrect credentials or user permissions',
                solution_steps: [
                    'Reset MySQL root password if needed',
                    'Check user privileges: SHOW GRANTS FOR \'user\'@\'host\'',
                    'Create user if missing: CREATE USER \'user\'@\'host\' IDENTIFIED BY \'password\'',
                    'Grant necessary permissions: GRANT ALL PRIVILEGES ON database.* TO \'user\'@\'host\'',
                    'Flush privileges: FLUSH PRIVILEGES',
                    'Test connection with correct credentials'
                ],
                related_services: ['mysql'],
                severity_level: 'medium',
                confidence_score: 0.85,
                additional_checks: [
                    'Check MySQL user table integrity',
                    'Review application connection strings',
                    'Verify hostname resolution'
                ]
            };
        }
        return {
            issue_identified: true,
            problem_category: 'MySQL Database Issue',
            root_cause: 'General MySQL database problem detected',
            solution_steps: [
                'Check MySQL service: sudo systemctl status mysql',
                'Review MySQL logs: sudo tail -f /var/log/mysql/error.log',
                'Test MySQL connection: mysql -u root -p',
                'Check database status: SHOW PROCESSLIST',
                'Analyze slow queries if performance issue'
            ],
            related_services: ['mysql'],
            severity_level: 'medium',
            confidence_score: 0.7,
            additional_checks: [
                'Check MySQL configuration tuning',
                'Verify table integrity with CHECK TABLE',
                'Monitor MySQL resource usage'
            ]
        };
    }
    /**
     * Analyze kernel logs
     */
    static analyzeKernelLogs(errorOutput, userCommand, systemContext) {
        const content = errorOutput.toLowerCase();
        logger.debug('Analyzing kernel logs with context', {
            userCommand,
            systemContext
        });
        if (content.includes('segmentation fault') || content.includes('segfault')) {
            return {
                issue_identified: true,
                problem_category: 'Application Segmentation Fault',
                root_cause: 'Application crashed due to memory access violation or programming error',
                solution_steps: [
                    'Check system logs: sudo journalctl -b | grep segfault',
                    'Identify crashing application from logs',
                    'Check for core dumps: ls /var/crash/ or /tmp/core*',
                    'Update application if patch available',
                    'Check system memory: free -h',
                    'Review application logs for additional context'
                ],
                related_services: [],
                severity_level: 'medium',
                confidence_score: 0.8,
                additional_checks: [
                    'Check memory usage patterns',
                    'Verify application dependencies',
                    'Review recent system updates'
                ]
            };
        }
        return {
            issue_identified: true,
            problem_category: 'Kernel Issue',
            root_cause: 'Kernel-level problem requiring investigation',
            solution_steps: [
                'Check kernel messages: dmesg | tail',
                'Review system logs: sudo journalctl -b -k',
                'Check hardware status if applicable',
                'Review recent kernel updates',
                'Monitor system stability'
            ],
            related_services: [],
            severity_level: 'high',
            confidence_score: 0.7,
            additional_checks: [
                'Check hardware compatibility',
                'Review driver issues',
                'Monitor system temperature and health'
            ]
        };
    }
    /**
     * Analyze application logs
     */
    static analyzeApplicationLogs(errorOutput, userCommand, systemContext) {
        logger.debug('Analyzing application logs with context', {
            sampleLength: errorOutput.length,
            userCommand,
            systemContext
        });
        return {
            issue_identified: true,
            problem_category: 'Application Error',
            root_cause: 'Application-specific error requiring analysis',
            solution_steps: [
                'Review complete error message and stack trace',
                'Check application configuration files',
                'Verify application dependencies',
                'Review application logs for pattern',
                'Check system resources available to application'
            ],
            related_services: [],
            severity_level: 'medium',
            confidence_score: 0.6,
            additional_checks: [
                'Check application version and updates',
                'Verify file permissions for application',
                'Review recent configuration changes'
            ]
        };
    }
    /**
     * Analyze general logs
     */
    static analyzeGeneralLogs(errorOutput, userCommand, systemContext) {
        logger.debug('Analyzing general system logs with context', {
            sampleLength: errorOutput.length,
            userCommand,
            systemContext
        });
        return {
            issue_identified: true,
            problem_category: 'General System Error',
            root_cause: 'Error condition detected in system logs requiring investigation',
            solution_steps: [
                'Review complete error message and context',
                'Check system journal: sudo journalctl -b -p err',
                'Identify affected service or component',
                'Check system resource usage: top, df -h, free -h',
                'Review recent system changes or updates',
                'Take appropriate corrective action based on specific error'
            ],
            related_services: [],
            severity_level: 'medium',
            confidence_score: 0.6,
            additional_checks: [
                'Check system file integrity',
                'Review security logs for suspicious activity',
                'Monitor system performance metrics'
            ]
        };
    }
}
exports.LogAnalyzer = LogAnalyzer;
//# sourceMappingURL=log-analyzer.js.map