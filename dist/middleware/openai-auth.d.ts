import { Request, Response, NextFunction } from 'express';
export interface OpenAIAuthRequest extends Request {
    openaiAuth?: {
        apiKey: string;
        model: string;
    };
}
export declare function openaiAuth(req: OpenAIAuthRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function enhancedSecurityValidation(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
