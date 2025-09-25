/**
 * Test Data Generator - TypeScript Migration
 * Single Responsibility: Mock data generation for testing only
 *
 * Migration Benefits:
 * - Type-safe data structures prevent malformed test data
 * - Compile-time validation of generated object schemas
 * - Better IDE support for test data creation
 */
interface CompletionPrompt {
    context: string;
    expected: string;
    complexity: string;
}
interface AnalysisPrompt {
    code: string;
    focus: string;
    expectedInsights: string[];
    analysisType?: string;
}
interface RefactoringPrompt {
    original: string;
    target: string;
    constraints: string[];
    code?: string;
}
interface MockFile {
    id?: number;
    name: string;
    content: string;
    type: string;
    size?: number;
}
interface TypeScriptStructure {
    classes: string[];
    functions: string[];
    interfaces: string[];
    type?: string;
}
export declare class TestDataGenerator {
    /**
     * Generate code completion prompts with type safety
     */
    generateCompletionPrompts(): CompletionPrompt[];
    /**
     * Generate code analysis prompts with strict typing
     */
    generateAnalysisPrompts(): AnalysisPrompt[];
    /**
     * Generate refactoring prompts with type validation
     */
    generateRefactoringPrompts(): RefactoringPrompt[];
    /**
     * Generate mock file data with proper typing
     */
    generateMockFileData(count: number): MockFile[];
    /**
     * Generate mock code snippets with type safety
     */
    generateMockCode(): string;
    /**
     * Generate TypeScript parsing data with structured types
     */
    generateTypeScriptParsingData(): {
        structures: TypeScriptStructure[];
        totalSize: number;
        complexity: 'low' | 'medium' | 'high';
    };
    /**
     * Generate complexity analysis data with type constraints
     */
    generateComplexityAnalysisData(): {
        functions: Array<{
            name: string;
            cyclomaticComplexity: number;
            linesOfCode: number;
            parameters: number;
            dependencies: number[];
        }>;
        analysisDepth: 'surface' | 'comprehensive' | 'deep';
    };
    /**
     * Generate pattern detection data with structured types
     */
    generatePatternDetectionData(): {
        codeBlocks: Array<{
            id: number;
            content: string;
            potentialPatterns: string[];
        }>;
        patternsToDetect: readonly string[];
    };
    /**
     * Generate streaming prompts with type safety
     */
    generateStreamingPrompts(): string[];
    /**
     * Generate data for batch processing tests
     */
    generateBatchTestData(batchSize: number): {
        batches: Array<{
            id: number;
            files: MockFile[];
            expectedProcessingTime: number;
        }>;
        totalFiles: number;
    };
    /**
     * Generate performance test scenarios with type constraints
     */
    generatePerformanceScenarios(): Array<{
        name: string;
        concurrency: number;
        duration: number;
        expectedMemory: number;
        workloadType: 'cpu-bound' | 'io-bound' | 'memory-bound';
    }>;
    /**
     * Private helper methods with proper typing
     */
    private generateComplexAlgorithmCode;
    private generateEventManagerCode;
    private generateLegacyCode;
    private generateCodeBlock;
    /**
     * Validate generated data integrity
     */
    validateGeneratedData<T>(data: T[], expectedCount?: number): boolean;
    /**
     * Get generation statistics
     */
    getGenerationStats(): {
        availablePromptTypes: number;
        maxBatchSize: number;
        supportedComplexities: string[];
        codeTemplateCount: number;
    };
}
export {};
