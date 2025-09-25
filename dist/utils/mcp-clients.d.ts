/**
 * MCP Client Helpers for Wall-Bounce Analysis
 * 🔄 Multi-LLM collaborative analysis integration
 */
/**
 * 🎯 GPT-5 MCP Client Integration
 */
export declare function mcp__gpt_5__deep_analysis(params: {
    input: string;
}): Promise<{
    rootCause: string;
    mechanism: string;
    resolution: string[];
    prevention: string[];
    confidence: number;
}>;
/**
 * 🌐 Gemini MCP Client Integration
 */
export declare function mcp__gemini_cli__ask_gemini(params: {
    prompt: string;
    changeMode?: boolean;
}): Promise<{
    environmentFactors: string[];
    configurationIssues: string[];
    adjustedResolution: string[];
    confidence: number;
}>;
/**
 * Test MCP client availability
 */
export declare function testMCPAvailability(): Promise<{
    gpt5: boolean;
    gemini: boolean;
    wallBounceReady: boolean;
    error?: undefined;
} | {
    gpt5: boolean;
    gemini: boolean;
    wallBounceReady: boolean;
    error: string;
}>;
