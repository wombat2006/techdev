export interface SanitizeOptions {
    maxLength?: number;
    allowedFields?: string[];
    stripHtml?: boolean;
}
export declare function sanitizeInput(input: any, options?: SanitizeOptions): any;
export declare function sanitizeLogData(logData: any): any;
export declare function sanitizeUserInput(userInput: any): any;
export interface SanitizationResult {
    sanitized: string;
    flagged: boolean;
    issues: string[];
}
export declare class DataSanitizer {
    static sanitizeInput(input: string): SanitizationResult;
    static sanitizeLogData(data: any): any;
    static sanitizeForExternalAPI(data: any): any;
}
