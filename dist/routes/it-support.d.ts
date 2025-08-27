/**
 * IT Support Endpoints
 * Specialized endpoints for IT engineers and system administrators
 */
declare const router: import("express-serve-static-core").Router;
export default router;
/**
 * Handle critical support requests with Claude Opus 4.1
 */
export declare function handleCriticalSupport(prompt: string, context?: string): Promise<string>;
/**
 * Handle premium support requests with Claude Sonnet 4
 */
export declare function handlePremiumSupport(prompt: string, context?: string): Promise<string>;
/**
 * Handle basic support requests with Tier 2 models
 */
export declare function handleBasicSupport(prompt: string, context?: string): Promise<string>;
