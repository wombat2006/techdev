/**
 * MCP Client Helpers for Wall-Bounce Analysis
 * 🔄 Multi-LLM collaborative analysis integration
 */
/**
 * 🎯 o3-high MCP Client Integration
 */
export declare function mcp__o3_high__o3_search(params: {
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
    o3High: boolean;
    gemini: boolean;
    wallBounceReady: boolean;
    error?: undefined;
} | {
    o3High: boolean;
    gemini: boolean;
    wallBounceReady: boolean;
    error: string;
}>;
