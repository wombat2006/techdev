"use strict";
/**
 * Test Data Generator - TypeScript Migration
 * Single Responsibility: Mock data generation for testing only
 *
 * Migration Benefits:
 * - Type-safe data structures prevent malformed test data
 * - Compile-time validation of generated object schemas
 * - Better IDE support for test data creation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestDataGenerator = void 0;
class TestDataGenerator {
    /**
     * Generate code completion prompts with type safety
     */
    generateCompletionPrompts() {
        return [
            {
                context: 'function calculateFibonacci(n) {\\n  if (n <= 1) return n;\\n  ',
                expected: 'recursive or iterative fibonacci implementation',
                complexity: 'medium'
            },
            {
                context: 'class DatabaseManager {\\n  constructor(config) {\\n    this.pool = ',
                expected: 'database connection pool setup',
                complexity: 'high'
            },
            {
                context: 'async function processUserData(userData) {\\n  try {\\n    ',
                expected: 'data validation and processing logic',
                complexity: 'medium'
            },
            {
                context: 'const optimizeQuery = (query, schema) => {\\n  const indices = ',
                expected: 'query optimization logic',
                complexity: 'high'
            },
            {
                context: 'import React, { useState, useEffect } from "react";\\n\\nfunction DataChart({ data }) {\\n  ',
                expected: 'React component implementation',
                complexity: 'medium'
            }
        ];
    }
    /**
     * Generate code analysis prompts with strict typing
     */
    generateAnalysisPrompts() {
        return [
            {
                code: this.generateComplexAlgorithmCode(),
                analysisType: 'performance',
                expectedInsights: ['complexity analysis', 'optimization suggestions', 'potential issues']
            },
            {
                code: this.generateEventManagerCode(),
                analysisType: 'architecture',
                expectedInsights: ['design patterns', 'best practices', 'potential improvements']
            }
        ];
    }
    /**
     * Generate refactoring prompts with type validation
     */
    generateRefactoringPrompts() {
        return [
            {
                code: this.generateLegacyCode(),
                refactoringType: 'modernization',
                expectedChanges: ['ES6+ syntax', 'reduce nesting', 'improve readability']
            }
        ];
    }
    /**
     * Generate mock file data with proper typing
     */
    generateMockFileData(count) {
        if (count < 0) {
            throw new Error('File count must be non-negative');
        }
        return Array.from({ length: count }, (_, i) => ({
            id: i,
            name: `file${i}.js`,
            size: Math.floor(Math.random() * 10000) + 1000,
            content: this.generateMockCode()
        }));
    }
    /**
     * Generate mock code snippets with type safety
     */
    generateMockCode() {
        const codeTemplates = [
            'function process() { return true; }',
            'class Manager { constructor() { this.data = []; } }',
            'const handler = async (req, res) => { await process(req); };',
            'export default { config: { api: true } };'
        ];
        const randomIndex = Math.floor(Math.random() * codeTemplates.length);
        return codeTemplates[randomIndex];
    }
    /**
     * Generate TypeScript parsing data with structured types
     */
    generateTypeScriptParsingData() {
        const codeStructures = [];
        // Generate interfaces with proper typing
        for (let i = 0; i < 75; i++) {
            codeStructures.push({
                type: 'interface',
                name: `Interface${i}`,
                properties: Array.from({ length: 10 }, (_, j) => ({
                    name: `prop${j}`,
                    type: Math.random() > 0.5 ? 'string' : 'number',
                    optional: Math.random() > 0.7
                })),
                methods: Array.from({ length: 5 }, (_, j) => ({
                    name: `method${j}`,
                    params: Array.from({ length: Math.floor(Math.random() * 4) }, (_, k) => `param${k}`)
                }))
            });
        }
        // Generate classes with inheritance
        for (let i = 0; i < 25; i++) {
            codeStructures.push({
                type: 'class',
                name: `Class${i}`,
                extends: i > 0 ? `Class${Math.floor(Math.random() * i)}` : undefined,
                implements: [`Interface${Math.floor(Math.random() * 75)}`],
                methods: Array.from({ length: 15 }, (_, j) => ({
                    name: `method${j}`,
                    complexity: Math.floor(Math.random() * 20) + 1,
                    lines: Math.floor(Math.random() * 50) + 10
                }))
            });
        }
        return {
            structures: codeStructures,
            totalSize: codeStructures.length * 256,
            complexity: 'high'
        };
    }
    /**
     * Generate complexity analysis data with type constraints
     */
    generateComplexityAnalysisData() {
        return {
            functions: Array.from({ length: 100 }, (_, i) => ({
                name: `function${i}`,
                cyclomaticComplexity: Math.floor(Math.random() * 15) + 1,
                linesOfCode: Math.floor(Math.random() * 100) + 20,
                parameters: Math.floor(Math.random() * 8),
                dependencies: Array.from({ length: Math.floor(Math.random() * 10) }, () => Math.floor(Math.random() * 100))
            })),
            analysisDepth: 'comprehensive'
        };
    }
    /**
     * Generate pattern detection data with structured types
     */
    generatePatternDetectionData() {
        const patterns = [
            'Singleton', 'Factory', 'Observer', 'Strategy', 'Command',
            'Decorator', 'Facade', 'Proxy', 'Builder', 'Adapter'
        ];
        return {
            codeBlocks: Array.from({ length: 200 }, (_, i) => ({
                id: i,
                content: this.generateCodeBlock(Math.floor(Math.random() * 1000) + 500),
                potentialPatterns: patterns.slice(0, Math.floor(Math.random() * 3) + 1)
            })),
            patternsToDetect: patterns
        };
    }
    /**
     * Generate streaming prompts with type safety
     */
    generateStreamingPrompts() {
        return [
            'Explain the architecture of a microservices system with detailed examples',
            'Generate a comprehensive API documentation for a REST service',
            'Write a detailed code review for a complex React component'
        ];
    }
    /**
     * Generate data for batch processing tests
     */
    generateBatchTestData(batchSize) {
        if (batchSize <= 0) {
            throw new Error('Batch size must be positive');
        }
        const batches = [10, 50, 100].map((size, index) => ({
            id: index,
            files: this.generateMockFileData(Math.min(size, batchSize)),
            expectedProcessingTime: size * 10 // Estimated 10ms per file
        }));
        return {
            batches,
            totalFiles: batches.reduce((sum, batch) => sum + batch.files.length, 0)
        };
    }
    /**
     * Generate performance test scenarios with type constraints
     */
    generatePerformanceScenarios() {
        return [
            {
                name: 'Light Load',
                concurrency: 5,
                duration: 30000,
                expectedMemory: 100,
                workloadType: 'io-bound'
            },
            {
                name: 'Medium Load',
                concurrency: 20,
                duration: 60000,
                expectedMemory: 200,
                workloadType: 'cpu-bound'
            },
            {
                name: 'Heavy Load',
                concurrency: 50,
                duration: 120000,
                expectedMemory: 400,
                workloadType: 'memory-bound'
            }
        ];
    }
    /**
     * Private helper methods with proper typing
     */
    generateComplexAlgorithmCode() {
        return `function complexAlgorithm(data, options = {}) {
  const { threshold = 0.5, iterations = 100, verbose = false } = options;
  let result = [];

  for (let i = 0; i < iterations; i++) {
    const processed = data.map(item => {
      if (item.score > threshold) {
        return processHighScore(item, i);
      } else {
        return processLowScore(item, i);
      }
    });

    result = result.concat(processed);

    if (verbose && i % 10 === 0) {
      console.log(\`Iteration \${i}: processed \${processed.length} items\`);
    }
  }

  return result.filter(item => item !== null);
}`;
    }
    generateEventManagerCode() {
        return `class EventManager {
  constructor() {
    this.events = new Map();
    this.listeners = new WeakMap();
  }

  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(callback);
  }

  emit(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Event callback error:', error);
        }
      });
    }
  }

  off(event, callback) {
    if (this.events.has(event)) {
      this.events.get(event).delete(callback);
    }
  }
}`;
    }
    generateLegacyCode() {
        return `function processData(data) {
  var result = [];
  for (var i = 0; i < data.length; i++) {
    if (data[i] != null) {
      if (data[i].active == true) {
        if (data[i].score >= 50) {
          result.push({
            id: data[i].id,
            name: data[i].name,
            score: data[i].score,
            status: 'high'
          });
        } else {
          result.push({
            id: data[i].id,
            name: data[i].name,
            score: data[i].score,
            status: 'low'
          });
        }
      }
    }
  }
  return result;
}`;
    }
    generateCodeBlock(size) {
        if (size <= 0) {
            return '';
        }
        return Array.from({ length: size }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
    }
    /**
     * Validate generated data integrity
     */
    validateGeneratedData(data, expectedCount) {
        if (!Array.isArray(data)) {
            return false;
        }
        if (expectedCount !== undefined && data.length !== expectedCount) {
            return false;
        }
        return data.every(item => item !== null && item !== undefined);
    }
    /**
     * Get generation statistics
     */
    getGenerationStats() {
        return {
            availablePromptTypes: 3, // completion, analysis, refactoring
            maxBatchSize: 1000,
            supportedComplexities: ['low', 'medium', 'high'],
            codeTemplateCount: 4
        };
    }
}
exports.TestDataGenerator = TestDataGenerator;
//# sourceMappingURL=test-data-generator.js.map